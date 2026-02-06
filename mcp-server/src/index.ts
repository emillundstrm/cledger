#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CledgerApi } from "./api.js";
import { SessionResponse } from "./types.js";

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

const server = new McpServer({
    name: "cledger",
    version: "1.0.0",
});

// --- list_sessions ---
server.tool(
    "list_sessions",
    "List climbing training sessions. Returns sessions ordered by date descending. " +
    "Each session includes: date, types (boulder/routes/board/hangboard/strength/prehab/other), " +
    "intensity (easy/moderate/hard), performance (weak/normal/strong), " +
    "productivity (low/normal/high), venue, injuries, duration, max grade, and notes.",
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
    "date, types, intensity, performance, productivity, venue, injuries (with notes), duration, max grade, and notes.",
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
    "List injuries logged across all sessions. Each injury has a location (free-form text like 'finger', 'elbow', 'shoulder', 'knee', etc.) " +
    "and an optional note. Supports optional date range filter based on the parent session's date.",
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
    "weekly session counts for last 8 weeks, and performance/productivity trends (weekly averages on 1-3 scale: " +
    "weak/low=1, normal=2, strong/high=3).",
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
    "Intensity: easy, moderate, hard. Performance: weak, normal, strong. Productivity: low, normal, high.",
    {
        date: z.string().describe("Session date in YYYY-MM-DD format."),
        types: z.array(z.string()).describe("Session types (e.g., ['boulder', 'hangboard']). Valid: boulder, routes, board, hangboard, strength, prehab, other."),
        intensity: z.string().describe("Subjective intensity rating: easy, moderate, or hard."),
        performance: z.string().describe("Subjective performance rating: weak, normal, or strong."),
        productivity: z.string().describe("Subjective productivity rating: low, normal, or high."),
        durationMinutes: z.number().optional().describe("Session duration in minutes."),
        notes: z.string().optional().describe("Free-form session notes."),
        maxGrade: z.string().optional().describe("Maximum climbing grade achieved in the session."),
        venue: z.string().optional().describe("Gym or crag name where the session took place."),
        injuries: z.array(z.object({
            location: z.string().describe("Body part affected (e.g., 'finger', 'elbow', 'shoulder')."),
            note: z.string().optional().describe("Additional details about the injury."),
        })).optional().describe("Injuries experienced during the session."),
    },
    async (params) => {
        const session = await api.createSession({
            date: params.date,
            types: params.types,
            intensity: params.intensity,
            performance: params.performance,
            productivity: params.productivity,
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

// --- log_injury ---
server.tool(
    "log_injury",
    "Log an injury on an existing session. This updates the session by adding an injury entry. " +
    "Use list_sessions first to find the session ID to attach the injury to.",
    {
        sessionId: z.string().describe("The UUID of the session to add the injury to."),
        location: z.string().describe("Body part affected (e.g., 'finger', 'elbow', 'shoulder', 'knee')."),
        note: z.string().optional().describe("Additional details about the injury."),
    },
    async ({ sessionId, location, note }) => {
        // Fetch the existing session, add the injury, and update
        const existing = await api.getSession(sessionId);
        const updatedInjuries = [
            ...existing.injuries.map((inj) => ({
                location: inj.location,
                note: inj.note ?? undefined,
            })),
            { location, note },
        ];

        const updated = await api.updateSession(sessionId, {
            date: existing.date,
            types: existing.types,
            intensity: existing.intensity,
            performance: existing.performance,
            productivity: existing.productivity,
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

// --- list_insights ---
server.tool(
    "list_insights",
    "List all coach insights. Returns insights ordered by pinned first, then most recently updated. " +
    "Insights are free-form text entries where the training coach records observations, plans, and recommendations.",
    async () => {
        const insights = await api.listInsights();
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(insights, null, 2),
                },
            ],
        };
    }
);

// --- add_insight ---
server.tool(
    "add_insight",
    "Create a new coach insight. Use this to record training observations, recommendations, plans, " +
    "or warnings. Pin important insights so they appear at the top of the list and are included in training summaries.",
    {
        content: z.string().describe("The insight text. Can be structured however you want — observations, plans, warnings, etc."),
        pinned: z.boolean().optional().describe("Whether to pin this insight to the top of the list. Default false."),
    },
    async ({ content, pinned }) => {
        const insight = await api.createInsight({
            content,
            pinned: pinned ?? false,
        });
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(insight, null, 2),
                },
            ],
        };
    }
);

// --- update_insight ---
server.tool(
    "update_insight",
    "Update an existing coach insight by ID. Use this to revise previous observations, update plans, " +
    "or change the pinned status of an insight.",
    {
        id: z.string().describe("The UUID of the insight to update."),
        content: z.string().describe("The updated insight text."),
        pinned: z.boolean().optional().describe("Whether this insight should be pinned. Default false."),
    },
    async ({ id, content, pinned }) => {
        const insight = await api.updateInsight(id, {
            content,
            pinned: pinned ?? false,
        });
        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(insight, null, 2),
                },
            ],
        };
    }
);

// --- get_training_summary ---
server.tool(
    "get_training_summary",
    "Get a comprehensive training overview for coaching purposes. Returns in a single call: " +
    "sessions from the last 14 days, current analytics (weekly counts, trends, rest days, injuries), " +
    "recent injury details, and training streak info. " +
    "This is the best starting tool for understanding the athlete's current training state. " +
    "Also includes the most recent coach insights (prioritizing pinned) for continuity.",
    async () => {
        const [sessions, analytics, insights] = await Promise.all([
            api.listSessions(),
            api.getAnalytics(),
            api.listInsights(),
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
            }))
        );

        // Include up to 5 recent insights, prioritizing pinned (already sorted by backend)
        const recentInsights = insights.slice(0, 5).map((i) => ({
            id: i.id,
            content: i.content,
            pinned: i.pinned,
            updatedAt: i.updatedAt,
        }));

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
            productivityTrend: analytics.productivityTrend,
            coachInsights: recentInsights,
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
        productivity: session.productivity,
        durationMinutes: session.durationMinutes,
        venue: session.venue,
        maxGrade: session.maxGrade,
        injuries: session.injuries.map((inj) => ({
            location: inj.location,
            note: inj.note,
        })),
        notes: session.notes,
    };
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
