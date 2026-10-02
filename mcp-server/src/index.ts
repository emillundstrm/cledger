#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CledgerApi } from "./api.js";
import { ASSISTANT_TAG, SessionResponse } from "./types.js";
import { extractAppLinks } from "./links.js";

const SUPABASE_URL = process.env.CLEDGER_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.CLEDGER_SUPABASE_ANON_KEY;
const CLEDGER_EMAIL = process.env.CLEDGER_EMAIL;
const CLEDGER_PASSWORD = process.env.CLEDGER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !CLEDGER_EMAIL || !CLEDGER_PASSWORD) {
    console.error(
        "Missing required environment variables: CLEDGER_SUPABASE_URL, CLEDGER_SUPABASE_ANON_KEY, CLEDGER_EMAIL, CLEDGER_PASSWORD"
    );
    process.exit(1);
}

const api = new CledgerApi(SUPABASE_URL, SUPABASE_ANON_KEY, CLEDGER_EMAIL, CLEDGER_PASSWORD);

const INSTRUCTIONS = `CLedger is the user's personal store for working with an AI assistant: a climbing training log, \
plus notes (memories, conclusions, rules for you). It is the only place you keep memory about the user; \
do not save memories anywhere else.

Start every conversation by calling get_context, and follow every note under "rules": they are the user's \
instructions for how you behave.

Where things go:
- A training session: log_session.
- A conclusion, a fact about the user, a plan, a reference: a note (remember).
- A rule for how you should behave ("keep check-ins short"): a note tagged "assistant". Keep rules short; \
they are loaded in full in every conversation.
- Pin a note only if it should be listed in every conversation.

Writing notes:
- Write content in Swedish, the user's language. Tool names and the "assistant" tag stay English.
- Give every note a short, specific title; pinned notes are listed by title alone.
- Search before creating. If a note on the subject exists, update it instead of creating a near-duplicate.
- When understanding changes, rewrite the note to state the current understanding. Do not append \
"Update:" sections; previous versions are kept automatically.
- Prefer tags already in use (get_context lists them).
- Link related items with Markdown links: [text](/notes/<id>) or [text](/sessions/<id>).
- Be concise. Cut filler.
- You cannot delete. Archive notes that are obsolete or wrong.`;

const server = new McpServer(
    {
        name: "cledger",
        version: "1.1.0",
    },
    {
        instructions: INSTRUCTIONS,
    }
);

// --- list_sessions ---
server.tool(
    "list_sessions",
    "List climbing training sessions. Returns sessions ordered by date descending. " +
    "Each session includes: date, types (boulder/routes/board/hangboard/strength/prehab/other), " +
    "intensity RPE (1-10), performance (weak/normal/strong), " +
    "venue, injuries, duration, max grade, and notes.",
    {
        from: z.string().optional().describe("Start date (inclusive, YYYY-MM-DD). Only return sessions on or after this date."),
        to: z.string().optional().describe("End date (inclusive, YYYY-MM-DD). Only return sessions on or before this date."),
        limit: z.number().optional().describe("Maximum number of sessions to return. Returns all if not specified."),
    },
    async ({ from, to, limit }) => {
        const sessions = await api.listSessions();
        let filtered = sessions;

        if (from) {
            filtered = filtered.filter((s) => s.date >= from);
        }
        if (to) {
            filtered = filtered.filter((s) => s.date <= to);
        }
        if (limit !== undefined && limit > 0) {
            filtered = filtered.slice(0, limit);
        }

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(filtered, null, 2),
                },
            ],
        };
    }
);

// --- get_session ---
server.tool(
    "get_session",
    "Get a single climbing training session by its ID. Returns full session detail including " +
    "date, types, intensity, performance, venue, injuries (with notes), duration, max grade, and notes.",
    {
        id: z.string().describe("The UUID of the session to retrieve."),
    },
    async ({ id }) => {
        const session = await api.getSession(id);
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(session, null, 2),
                },
            ],
        };
    }
);

// --- list_injuries ---
server.tool(
    "list_injuries",
    "List injuries logged across all sessions. Each injury has a location (free-form text like 'finger', 'elbow', 'shoulder', 'knee', etc.), " +
    "an optional note, and an optional severity (1-5: 1=Tweak, 2=Minor, 3=Moderate, 4=Limiting, 5=Severe). " +
    "Supports optional date range filter based on the parent session's date.",
    {
        from: z.string().optional().describe("Start date (inclusive, YYYY-MM-DD). Only return injuries from sessions on or after this date."),
        to: z.string().optional().describe("End date (inclusive, YYYY-MM-DD). Only return injuries from sessions on or before this date."),
    },
    async ({ from, to }) => {
        const sessions = await api.listSessions();
        let filtered = sessions;

        if (from) {
            filtered = filtered.filter((s) => s.date >= from);
        }
        if (to) {
            filtered = filtered.filter((s) => s.date <= to);
        }

        const injuries = filtered.flatMap((s) =>
            s.injuries.map((inj) => ({
                sessionId: s.id,
                sessionDate: s.date,
                location: inj.location,
                note: inj.note,
                severity: inj.severity,
            }))
        );

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(injuries, null, 2),
                },
            ],
        };
    }
);

// --- get_analytics ---
server.tool(
    "get_analytics",
    "Get training analytics including: sessions this week, hard sessions in last 7 days, " +
    "days since last rest day, injury locations in last 30 days (with counts), " +
    "weekly session counts for last 8 weeks, performance trends (weekly averages on 1-3 scale: " +
    "weak=1, normal=2, strong=3), and RPE trends (weekly average RPE on 1-10 scale).",
    async () => {
        const analytics = await api.getAnalytics();
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(analytics, null, 2),
                },
            ],
        };
    }
);

// --- log_session ---
server.tool(
    "log_session",
    "Create a new climbing training session. Requires date, at least one type, and subjective ratings. " +
    "Types: boulder, routes, board, hangboard, strength, prehab, other. " +
    "Intensity: RPE 1-10. Performance: weak, normal, strong.",
    {
        date: z.string().describe("Session date in YYYY-MM-DD format."),
        types: z.array(z.string()).describe("Session types (e.g., ['boulder', 'hangboard']). Valid: boulder, routes, board, hangboard, strength, prehab, other."),
        intensity: z.number().int().min(1).max(10).describe("Subjective intensity RPE rating from 1 (very easy) to 10 (maximal effort)."),
        performance: z.string().describe("Subjective performance rating: weak, normal, or strong."),
        durationMinutes: z.number().optional().describe("Session duration in minutes."),
        notes: z.string().optional().describe("Free-form session notes."),
        maxGrade: z.string().optional().describe("Maximum climbing grade achieved in the session."),
        venue: z.string().optional().describe("Gym or crag name where the session took place."),
        injuries: z.array(z.object({
            location: z.string().describe("Body part affected (e.g., 'finger', 'elbow', 'shoulder')."),
            note: z.string().optional().describe("Additional details about the injury."),
            severity: z.number().optional().describe("Injury severity 1-5: 1=Tweak, 2=Minor, 3=Moderate, 4=Limiting, 5=Severe."),
        })).optional().describe("Injuries experienced during the session."),
    },
    async (params) => {
        const session = await api.createSession({
            date: params.date,
            types: params.types,
            intensity: params.intensity,
            performance: params.performance,
            durationMinutes: params.durationMinutes,
            notes: params.notes,
            maxGrade: params.maxGrade,
            venue: params.venue,
            injuries: params.injuries,
        });
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(session, null, 2),
                },
            ],
        };
    }
);

// --- update_session ---
server.tool(
    "update_session",
    "Update an existing climbing training session. Use list_sessions or get_session to find the session ID. " +
    "Only provide the fields you want to change — unspecified fields keep their current values. " +
    "Types: boulder, routes, board, hangboard, strength, prehab, other. " +
    "Intensity: RPE 1-10. Performance: weak, normal, strong.",
    {
        id: z.string().describe("The UUID of the session to update."),
        date: z.string().optional().describe("Session date in YYYY-MM-DD format."),
        types: z.array(z.string()).optional().describe("Session types (e.g., ['boulder', 'hangboard']). Valid: boulder, routes, board, hangboard, strength, prehab, other."),
        intensity: z.number().int().min(1).max(10).optional().describe("Subjective intensity RPE rating from 1 (very easy) to 10 (maximal effort)."),
        performance: z.string().optional().describe("Subjective performance rating: weak, normal, or strong."),
        durationMinutes: z.number().optional().describe("Session duration in minutes."),
        notes: z.string().optional().describe("Free-form session notes."),
        maxGrade: z.string().optional().describe("Maximum climbing grade achieved in the session."),
        venue: z.string().optional().describe("Gym or crag name where the session took place."),
        injuries: z.array(z.object({
            location: z.string().describe("Body part affected (e.g., 'finger', 'elbow', 'shoulder')."),
            note: z.string().optional().describe("Additional details about the injury."),
            severity: z.number().optional().describe("Injury severity 1-5: 1=Tweak, 2=Minor, 3=Moderate, 4=Limiting, 5=Severe."),
        })).optional().describe("Replaces all injuries on this session. Omit to keep existing injuries unchanged."),
    },
    async ({ id, ...params }) => {
        const existing = await api.getSession(id);

        const updated = await api.updateSession(id, {
            date: params.date ?? existing.date,
            types: params.types ?? existing.types,
            intensity: params.intensity ?? existing.intensity,
            performance: params.performance ?? existing.performance,
            durationMinutes: params.durationMinutes ?? existing.durationMinutes ?? undefined,
            notes: params.notes ?? existing.notes ?? undefined,
            maxGrade: params.maxGrade ?? existing.maxGrade ?? undefined,
            venue: params.venue ?? existing.venue ?? undefined,
            injuries: params.injuries ?? existing.injuries.map((inj) => ({
                location: inj.location,
                note: inj.note ?? undefined,
                severity: inj.severity ?? undefined,
            })),
        });

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(updated, null, 2),
                },
            ],
        };
    }
);

// --- log_injury ---
server.tool(
    "log_injury",
    "Log an injury on an existing session. This updates the session by adding an injury entry. " +
    "Use list_sessions first to find the session ID to attach the injury to.",
    {
        sessionId: z.string().describe("The UUID of the session to add the injury to."),
        location: z.string().describe("Body part affected (e.g., 'finger', 'elbow', 'shoulder', 'knee')."),
        note: z.string().optional().describe("Additional details about the injury."),
        severity: z.number().optional().describe("Injury severity 1-5: 1=Tweak, 2=Minor, 3=Moderate, 4=Limiting, 5=Severe."),
    },
    async ({ sessionId, location, note, severity }) => {
        // Fetch the existing session, add the injury, and update
        const existing = await api.getSession(sessionId);
        const updatedInjuries = [
            ...existing.injuries.map((inj) => ({
                location: inj.location,
                note: inj.note ?? undefined,
                severity: inj.severity ?? undefined,
            })),
            { location, note, severity },
        ];

        const updated = await api.updateSession(sessionId, {
            date: existing.date,
            types: existing.types,
            intensity: existing.intensity,
            performance: existing.performance,
            durationMinutes: existing.durationMinutes ?? undefined,
            notes: existing.notes ?? undefined,
            maxGrade: existing.maxGrade ?? undefined,
            venue: existing.venue ?? undefined,
            injuries: updatedInjuries,
        });

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(updated, null, 2),
                },
            ],
        };
    }
);

// --- get_fingerboard_maxes ---
server.tool(
    "get_fingerboard_maxes",
    "Get the athlete's measured finger strength maxima, one per grip x edge depth x hand combination. " +
    "Each value is the heaviest weight successfully picked up from that edge in a max lift test, in kg, " +
    "expressed as absolute force through the fingers. These are the reference loads that other protocols " +
    "are prescribed as a percentage of. Check testedAt — a max older than about 90 days is likely stale. " +
    "A large left/right gap on the same grip and edge is worth flagging as an injury risk.",
    async () => {
        const maxes = await api.getFingerboardMaxes();
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(maxes, null, 2),
                },
            ],
        };
    }
);

// --- list_fingerboard_workouts ---
server.tool(
    "list_fingerboard_workouts",
    "List recent fingerboard workouts with their individual sets. Each set records grip, edge depth, hand, " +
    "and totalLoadKg (absolute force through the fingers: bodyweight plus added weight for hangs, or the " +
    "weight lifted for pickups), plus whether the set was completed and its RPE. Use this to judge whether " +
    "load is progressing, whether sets are being failed, and how fingerboard work fits the wider training week.",
    {
        limit: z.number().optional().describe("Maximum number of workouts to return, most recent first. Default 20."),
    },
    async ({ limit }) => {
        const workouts = await api.listFingerboardWorkouts(limit ?? 20);
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(workouts, null, 2),
                },
            ],
        };
    }
);

// --- get_context ---
server.tool(
    "get_context",
    "Call this at the start of every conversation. Returns: `rules` — notes tagged 'assistant', in full; " +
    "these are the user's instructions for how you should behave, follow them. `pinned` — titles and ids " +
    "of pinned notes (use get_note for full text). `tags` — all tags in use with counts. " +
    "Pass `tags` to narrow pinned notes to the topic of the conversation; rules are never filtered.",
    {
        tags: z.array(z.string()).optional().describe("Only list pinned notes with at least one of these tags."),
    },
    async ({ tags }) => {
        const filterTags = tags ? normaliseTags(tags) : [];
        const [rules, pinned, tagCounts] = await Promise.all([
            api.listNotes({ tags: [ASSISTANT_TAG] }),
            api.listNotes({ pinned: true, tags: filterTags.length > 0 ? filterTags : undefined }),
            api.listNoteTags(),
        ]);

        const context = {
            rules: rules.map((n) => ({ id: n.id, title: n.title, content: n.content })),
            pinned: pinned
                .filter((n) => !n.tags.includes(ASSISTANT_TAG))
                .map((n) => ({ id: n.id, title: n.title ?? preview(n.content, 80), tags: n.tags })),
            tags: tagCounts,
        };

        return jsonResult(context);
    }
);

// --- search ---
server.tool(
    "search",
    "Search everything the user and you have recorded. Matches inflections and minor typos in Swedish " +
    "and English (e.g. 'klättring' finds 'klättrade'). Multi-word queries rank items matching more words " +
    "higher. Returns kind, id, title, a snippet, date, tags and score; use get_note for full text. " +
    "Search before creating a note, so you update an existing one instead of duplicating it.",
    {
        query: z.string().describe("Words to search for."),
        kinds: z.array(z.enum(["note"])).optional().describe("Restrict to these kinds. Default: all."),
        limit: z.number().optional().describe("Maximum results. Default 10."),
        include_archived: z.boolean().optional().describe("Include archived items. Default false."),
    },
    async ({ query, kinds, limit, include_archived }) => {
        const results = await api.search(query, kinds ?? null, limit ?? 10, include_archived ?? false);
        return jsonResult(results);
    }
);

// --- get_note ---
server.tool(
    "get_note",
    "Get one note in full. Also returns `links` — items this note links to, with their titles " +
    "(exists: false if the target was deleted) — and `linkedFrom` — notes that link to this one.",
    {
        id: z.string().describe("The UUID of the note."),
    },
    async ({ id }) => {
        const note = await api.getNote(id);
        const links = extractAppLinks(note.content);
        const [titles, linkedFrom] = await Promise.all([
            api.resolveLinks(links),
            api.listBacklinks(id),
        ]);

        return jsonResult({
            ...note,
            links: links.map((l) => {
                const title = titles.get(`${l.kind}:${l.id}`);
                return { kind: l.kind, id: l.id, title: title ?? null, exists: title !== undefined };
            }),
            linkedFrom,
        });
    }
);

// --- remember ---
server.tool(
    "remember",
    "Create a note: a conclusion, a fact about the user, a plan, or a reference worth keeping beyond " +
    "this conversation. Write in Swedish. Rules for how you should behave get the tag 'assistant'. " +
    "Search first; if a note on the subject exists, use update_note instead.",
    {
        title: z.string().min(1).describe("Short, specific title. Pinned notes are listed by title alone."),
        content: z.string().min(1).describe(
            "Markdown. Concise. Link related items with [text](/notes/<id>) or [text](/sessions/<id>)."
        ),
        tags: z.array(z.string()).optional().describe("Lowercase tags. Prefer tags already in use (see get_context)."),
        pinned: z.boolean().optional().describe("Pin only if this should be listed in every conversation. Default false."),
    },
    async ({ title, content, tags, pinned }) => {
        const note = await api.createNote({
            title,
            content,
            tags: normaliseTags(tags ?? []),
            pinned: pinned ?? false,
        });
        return jsonResult(note);
    }
);

// --- update_note ---
server.tool(
    "update_note",
    "Update a note. Only the fields you pass change. When a conclusion changes, rewrite the content to state " +
    "the current understanding rather than appending corrections; previous versions are kept automatically. " +
    "Set archived: true to retire an obsolete or wrong note (notes cannot be deleted from here), " +
    "or archived: false to restore one.",
    {
        id: z.string().describe("The UUID of the note."),
        title: z.string().min(1).optional().describe("New title."),
        content: z.string().min(1).optional().describe("New content, replacing the old."),
        tags: z.array(z.string()).optional().describe("New tags, replacing the old."),
        pinned: z.boolean().optional().describe("Pin or unpin."),
        archived: z.boolean().optional().describe("Archive (true) or restore (false)."),
    },
    async ({ id, title, content, tags, pinned, archived }) => {
        const note = await api.updateNote(id, {
            title,
            content,
            tags: tags ? normaliseTags(tags) : undefined,
            pinned,
            archived,
        });
        return jsonResult(note);
    }
);

// --- list_notes ---
server.tool(
    "list_notes",
    "List notes, pinned first, then most recently updated. Returns id, title, tags, pinned, updatedAt and a " +
    "short preview — use get_note for full text. Filters combine.",
    {
        tags: z.array(z.string()).optional().describe("Only notes with at least one of these tags."),
        pinned: z.boolean().optional().describe("Only pinned (true) or unpinned (false) notes."),
        from: z.string().optional().describe("Updated on or after this date (YYYY-MM-DD)."),
        to: z.string().optional().describe("Updated on or before this date (YYYY-MM-DD)."),
        include_archived: z.boolean().optional().describe("Include archived notes. Default false."),
        limit: z.number().optional().describe("Maximum number of notes. Default 50."),
    },
    async ({ tags, pinned, from, to, include_archived, limit }) => {
        const notes = await api.listNotes({
            tags: tags ? normaliseTags(tags) : undefined,
            pinned,
            from,
            to,
            includeArchived: include_archived ?? false,
            limit: limit ?? 50,
        });
        return jsonResult(notes.map((n) => ({
            id: n.id,
            title: n.title,
            tags: n.tags,
            pinned: n.pinned,
            archived: n.archivedAt !== null,
            updatedAt: n.updatedAt,
            preview: preview(n.content, 160),
        })));
    }
);

// --- get_training_summary ---
server.tool(
    "get_training_summary",
    "Get a comprehensive training overview for coaching purposes. Returns in a single call: " +
    "sessions from the last 14 days, current analytics (weekly counts, trends, rest days, injuries), " +
    "recent injury details, and training streak info. " +
    "This is the best starting tool for understanding the athlete's current training state. " +
    "Also includes pinned notes tagged 'training' in full, such as the current training plan.",
    async () => {
        const [sessions, analytics, trainingNotes] = await Promise.all([
            api.listSessions(),
            api.getAnalytics(),
            api.listNotes({ tags: ["training", "träning"], pinned: true }),
        ]);

        const today = new Date();
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const cutoff = fourteenDaysAgo.toISOString().split("T")[0];

        const recentSessions = sessions.filter((s) => s.date >= cutoff);
        const recentInjuries = recentSessions.flatMap((s) =>
            s.injuries.map((inj) => ({
                sessionDate: s.date,
                location: inj.location,
                note: inj.note,
                severity: inj.severity,
            }))
        );


        const summary = {
            overview: {
                totalSessionsLast14Days: recentSessions.length,
                sessionsThisWeek: analytics.sessionsThisWeek,
                hardSessionsLast7Days: analytics.hardSessionsLast7Days,
                currentWeekTrainingLoad: analytics.currentWeekTrainingLoad,
            },
            recentSessions: recentSessions.map(formatSessionSummary),
            recentInjuries,
            injurySummaryLast30Days: analytics.painFlagsLast30Days,
            weeklySessionCounts: analytics.weeklySessionCounts,
            weeklyTrainingLoad: analytics.weeklyTrainingLoad,
            performanceTrend: analytics.performanceTrend,
            rpeTrend: analytics.rpeTrend,
            pinnedTrainingNotes: trainingNotes.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                updatedAt: n.updatedAt,
            })),
        };

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(summary, null, 2),
                },
            ],
        };
    }
);

function formatSessionSummary(session: SessionResponse) {
    return {
        id: session.id,
        date: session.date,
        types: session.types,
        intensity: session.intensity,
        performance: session.performance,
        durationMinutes: session.durationMinutes,
        venue: session.venue,
        maxGrade: session.maxGrade,
        injuries: session.injuries.map((inj) => ({
            location: inj.location,
            note: inj.note,
            severity: inj.severity,
        })),
        notes: session.notes,
    };
}

function jsonResult(value: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(value, null, 2),
            },
        ],
    };
}

/** Lowercase with dashes for spaces, matching how the app stores tags. */
function normaliseTags(tags: string[]): string[] {
    const normalised = tags
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter((t) => t !== "");
    return [...new Set(normalised)];
}

function preview(markdown: string, length: number): string {
    const plain = markdown.replace(/\s+/g, " ").trim();
    return plain.length > length ? plain.slice(0, length) + "…" : plain;
}

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
});
