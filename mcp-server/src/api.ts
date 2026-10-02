import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
    SessionResponse,
    SessionRequest,
    AnalyticsResponse,
    NoteResponse,
    NoteCreateRequest,
    NoteUpdateRequest,
    NoteListFilter,
    TagCount,
    SearchKind,
    SearchResult,
    SessionRow,
    SessionInjuryRow,
    NoteRow,
    PainFlagCount,
    WeeklySessionCount,
    SessionTypeVolume,
    SessionPerformanceLog,
    WeeklyTrainingLoad,
    WeeklyTrend,
    mapSessionRow,
    mapInjuryRow,
    mapNoteRow,
    FingerboardMaxResponse,
    FingerboardMaxRow,
    FingerboardSetRow,
    FingerboardWorkoutResponse,
    FingerboardWorkoutRow,
    mapFingerboardMaxRow,
    mapFingerboardSetRow,
    mapFingerboardWorkoutRow,
} from "./types.js";
import { AppLink } from "./links.js";

export class CledgerApi {
    private supabase: SupabaseClient;
    private authenticated = false;
    private email: string;
    private password: string;

    constructor(supabaseUrl: string, supabaseAnonKey: string, email: string, password: string) {
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);
        this.email = email;
        this.password = password;
    }

    private async ensureAuthenticated(): Promise<void> {
        if (this.authenticated) {
            return;
        }
        const { error } = await this.supabase.auth.signInWithPassword({
            email: this.email,
            password: this.password,
        });
        if (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
        this.authenticated = true;
    }

    private async getUserId(): Promise<string> {
        await this.ensureAuthenticated();
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) {
            throw new Error("Not authenticated");
        }
        return user.id;
    }

    async listSessions(): Promise<SessionResponse[]> {
        await this.ensureAuthenticated();

        const { data: rows, error } = await this.supabase
            .from("sessions")
            .select("*")
            .order("date", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch sessions: ${error.message}`);
        }

        const sessionRows = rows as SessionRow[];
        if (sessionRows.length === 0) {
            return [];
        }

        const sessionIds = sessionRows.map((s) => s.id);
        const { data: injuryRows, error: injError } = await this.supabase
            .from("session_injuries")
            .select("*")
            .in("session_id", sessionIds);

        if (injError) {
            throw new Error(`Failed to fetch session injuries: ${injError.message}`);
        }

        const injuriesBySession = new Map<string, SessionInjuryRow[]>();
        for (const row of injuryRows as SessionInjuryRow[]) {
            const list = injuriesBySession.get(row.session_id) ?? [];
            list.push(row);
            injuriesBySession.set(row.session_id, list);
        }

        return sessionRows.map((row) =>
            mapSessionRow(row, (injuriesBySession.get(row.id) ?? []).map(mapInjuryRow))
        );
    }

    async getSession(id: string): Promise<SessionResponse> {
        await this.ensureAuthenticated();

        const { data: row, error } = await this.supabase
            .from("sessions")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            throw new Error(`Failed to fetch session: ${error.message}`);
        }

        const { data: injuryRows, error: injError } = await this.supabase
            .from("session_injuries")
            .select("*")
            .eq("session_id", id);

        if (injError) {
            throw new Error(`Failed to fetch session injuries: ${injError.message}`);
        }

        return mapSessionRow(
            row as SessionRow,
            (injuryRows as SessionInjuryRow[]).map(mapInjuryRow)
        );
    }

    async createSession(session: SessionRequest): Promise<SessionResponse> {
        const userId = await this.getUserId();

        const { data: row, error } = await this.supabase
            .from("sessions")
            .insert({
                user_id: userId,
                date: session.date,
                types: session.types,
                intensity: session.intensity,
                performance: session.performance,
                duration_minutes: session.durationMinutes,
                notes: session.notes,
                max_grade: session.maxGrade,
                venue: session.venue,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create session: ${error.message}`);
        }

        const sessionRow = row as SessionRow;
        const injuries = session.injuries ?? [];
        if (injuries.length > 0) {
            const { data: injRows, error: injError } = await this.supabase
                .from("session_injuries")
                .insert(
                    injuries.map((inj) => ({
                        user_id: userId,
                        session_id: sessionRow.id,
                        location: inj.location,
                        note: inj.note,
                        severity: inj.severity,
                    }))
                )
                .select();

            if (injError) {
                throw new Error(`Failed to create session injuries: ${injError.message}`);
            }

            return mapSessionRow(
                sessionRow,
                (injRows as SessionInjuryRow[]).map(mapInjuryRow)
            );
        }

        return mapSessionRow(sessionRow);
    }

    async updateSession(id: string, session: SessionRequest): Promise<SessionResponse> {
        const userId = await this.getUserId();

        const { data: row, error } = await this.supabase
            .from("sessions")
            .update({
                date: session.date,
                types: session.types,
                intensity: session.intensity,
                performance: session.performance,
                duration_minutes: session.durationMinutes,
                notes: session.notes,
                max_grade: session.maxGrade,
                venue: session.venue,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update session: ${error.message}`);
        }

        // Replace injuries: delete existing, insert new
        const { error: deleteError } = await this.supabase
            .from("session_injuries")
            .delete()
            .eq("session_id", id);

        if (deleteError) {
            throw new Error(`Failed to update session injuries: ${deleteError.message}`);
        }

        const injuries = session.injuries ?? [];
        if (injuries.length > 0) {
            const { data: injRows, error: injError } = await this.supabase
                .from("session_injuries")
                .insert(
                    injuries.map((inj) => ({
                        user_id: userId,
                        session_id: id,
                        location: inj.location,
                        note: inj.note,
                        severity: inj.severity,
                    }))
                )
                .select();

            if (injError) {
                throw new Error(`Failed to create session injuries: ${injError.message}`);
            }

            return mapSessionRow(
                row as SessionRow,
                (injRows as SessionInjuryRow[]).map(mapInjuryRow)
            );
        }

        return mapSessionRow(row as SessionRow);
    }

    async deleteSession(id: string): Promise<void> {
        await this.ensureAuthenticated();

        const { error } = await this.supabase
            .from("sessions")
            .delete()
            .eq("id", id);

        if (error) {
            throw new Error(`Failed to delete session: ${error.message}`);
        }
    }

    async getAnalytics(): Promise<AnalyticsResponse> {
        await this.ensureAuthenticated();

        const [
            sessionsThisWeekResult,
            hardSessionsResult,
            currentWeekLoadResult,
            painFlagsResult,
            weeklyCountsResult,
            sessionTypeVolumeResult,
            performanceLogResult,
            weeklyLoadResult,
            performanceTrendResult,
            rpeTrendResult,
        ] = await Promise.all([
            this.supabase.rpc("sessions_this_week"),
            this.supabase.rpc("hard_sessions_last_7_days"),
            this.supabase.rpc("current_week_training_load"),
            this.supabase.rpc("pain_flags_last_30_days"),
            this.supabase.rpc("weekly_session_counts"),
            this.supabase.rpc("session_type_volume"),
            this.supabase.rpc("session_performance_log"),
            this.supabase.rpc("weekly_training_load"),
            this.supabase.rpc("performance_trend"),
            this.supabase.rpc("rpe_trend"),
        ]);

        if (sessionsThisWeekResult.error) {
            throw new Error(`Failed to fetch sessionsThisWeek: ${sessionsThisWeekResult.error.message}`);
        }
        if (hardSessionsResult.error) {
            throw new Error(`Failed to fetch hardSessionsLast7Days: ${hardSessionsResult.error.message}`);
        }
        if (currentWeekLoadResult.error) {
            throw new Error(`Failed to fetch currentWeekTrainingLoad: ${currentWeekLoadResult.error.message}`);
        }
        if (painFlagsResult.error) {
            throw new Error(`Failed to fetch painFlagsLast30Days: ${painFlagsResult.error.message}`);
        }
        if (weeklyCountsResult.error) {
            throw new Error(`Failed to fetch weeklySessionCounts: ${weeklyCountsResult.error.message}`);
        }
        if (sessionTypeVolumeResult.error) {
            throw new Error(`Failed to fetch sessionTypeVolume: ${sessionTypeVolumeResult.error.message}`);
        }
        if (performanceLogResult.error) {
            throw new Error(`Failed to fetch sessionPerformanceLog: ${performanceLogResult.error.message}`);
        }
        if (weeklyLoadResult.error) {
            throw new Error(`Failed to fetch weeklyTrainingLoad: ${weeklyLoadResult.error.message}`);
        }
        if (performanceTrendResult.error) {
            throw new Error(`Failed to fetch performanceTrend: ${performanceTrendResult.error.message}`);
        }
        if (rpeTrendResult.error) {
            throw new Error(`Failed to fetch rpeTrend: ${rpeTrendResult.error.message}`);
        }

        const painFlags = (painFlagsResult.data as { location: string; count: number; weighted_count: number }[]).map(
            (r): PainFlagCount => ({ location: r.location, count: r.count, weightedCount: r.weighted_count })
        );

        const weeklyCounts = (weeklyCountsResult.data as { week_start: string; count: number }[]).map(
            (r): WeeklySessionCount => ({ weekStart: r.week_start, count: r.count })
        );

        const sessionTypeVolume = (
            sessionTypeVolumeResult.data as { week_start: string; type: string; session_count: number; total_minutes: number }[]
        ).map(
            (r): SessionTypeVolume => ({
                weekStart: r.week_start,
                type: r.type,
                sessionCount: r.session_count,
                totalMinutes: r.total_minutes,
            })
        );

        const sessionPerformanceLog = (
            performanceLogResult.data as { session_date: string; performance: string }[]
        ).map(
            (r): SessionPerformanceLog => ({ date: r.session_date, performance: r.performance })
        );

        const weeklyLoad = (weeklyLoadResult.data as { week_start: string; load: number }[]).map(
            (r): WeeklyTrainingLoad => ({ weekStart: r.week_start, load: r.load })
        );

        const performanceTrend = (performanceTrendResult.data as { week_start: string; average: number | null }[]).map(
            (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
        );

        const rpeTrend = (rpeTrendResult.data as { week_start: string; average: number | null }[]).map(
            (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
        );

        return {
            sessionsThisWeek: sessionsThisWeekResult.data as number,
            hardSessionsLast7Days: hardSessionsResult.data as number,
            currentWeekTrainingLoad: currentWeekLoadResult.data as number,
            painFlagsLast30Days: painFlags,
            weeklySessionCounts: weeklyCounts,
            sessionTypeVolume,
            sessionPerformanceLog,
            weeklyTrainingLoad: weeklyLoad,
            performanceTrend,
            rpeTrend,
        };
    }

    async listNotes(filter: NoteListFilter = {}): Promise<NoteResponse[]> {
        await this.ensureAuthenticated();

        let query = this.supabase
            .from("notes")
            .select("*")
            .order("pinned", { ascending: false })
            .order("updated_at", { ascending: false });

        if (!filter.includeArchived) {
            query = query.is("archived_at", null);
        }
        if (filter.tags && filter.tags.length > 0) {
            query = query.overlaps("tags", filter.tags);
        }
        if (filter.pinned !== undefined) {
            query = query.eq("pinned", filter.pinned);
        }
        if (filter.from) {
            query = query.gte("updated_at", filter.from);
        }
        if (filter.to) {
            // Inclusive of the whole "to" day.
            query = query.lt("updated_at", nextDay(filter.to));
        }
        if (filter.limit !== undefined && filter.limit > 0) {
            query = query.limit(filter.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch notes: ${error.message}`);
        }

        return (data as NoteRow[]).map(mapNoteRow);
    }

    async getNote(id: string): Promise<NoteResponse> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase
            .from("notes")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            throw new Error(`Failed to fetch note: ${error.message}`);
        }

        return mapNoteRow(data as NoteRow);
    }

    async createNote(note: NoteCreateRequest): Promise<NoteResponse> {
        const userId = await this.getUserId();

        const { data: row, error } = await this.supabase
            .from("notes")
            .insert({
                user_id: userId,
                title: note.title,
                content: note.content,
                tags: note.tags,
                pinned: note.pinned,
                source: "assistant",
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create note: ${error.message}`);
        }

        return mapNoteRow(row as NoteRow);
    }

    /** Partial update. Archiving is the only removal available here; deletion is UI-only. */
    async updateNote(id: string, update: NoteUpdateRequest): Promise<NoteResponse> {
        await this.ensureAuthenticated();

        const patch: Record<string, unknown> = {};
        if (update.title !== undefined) {
            patch.title = update.title;
        }
        if (update.content !== undefined) {
            patch.content = update.content;
        }
        if (update.tags !== undefined) {
            patch.tags = update.tags;
        }
        if (update.pinned !== undefined) {
            patch.pinned = update.pinned;
        }
        if (update.archived !== undefined) {
            patch.archived_at = update.archived ? new Date().toISOString() : null;
        }

        const { data: row, error } = await this.supabase
            .from("notes")
            .update(patch)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update note: ${error.message}`);
        }

        return mapNoteRow(row as NoteRow);
    }

    async listNoteTags(): Promise<TagCount[]> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase.rpc("note_tags");

        if (error) {
            throw new Error(`Failed to fetch tags: ${error.message}`);
        }

        return (data as { tag: string; count: number }[]).map((row) => ({
            tag: row.tag,
            count: Number(row.count),
        }));
    }

    async search(
        query: string,
        kinds: SearchKind[] | null,
        limit: number,
        includeArchived: boolean,
    ): Promise<SearchResult[]> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase.rpc("search", {
            p_query: query,
            p_kinds: kinds,
            p_limit: limit,
            p_include_archived: includeArchived,
        });

        if (error) {
            throw new Error(`Search failed: ${error.message}`);
        }

        return data as SearchResult[];
    }

    /** Ids of notes whose content links to the given note. */
    async listBacklinks(id: string): Promise<{ id: string; title: string | null }[]> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase
            .from("notes")
            .select("id, title")
            .ilike("content", `%/notes/${id}%`)
            .neq("id", id)
            .is("archived_at", null);

        if (error) {
            throw new Error(`Failed to fetch backlinks: ${error.message}`);
        }

        return data as { id: string; title: string | null }[];
    }

    /** Titles for linked items, keyed `kind:id`. Items that no longer exist are absent. */
    async resolveLinks(links: AppLink[]): Promise<Map<string, string>> {
        await this.ensureAuthenticated();

        const noteIds = links.filter((l) => l.kind === "note").map((l) => l.id);
        const sessionIds = links.filter((l) => l.kind === "session").map((l) => l.id);
        const titles = new Map<string, string>();

        if (noteIds.length > 0) {
            const { data, error } = await this.supabase.from("notes").select("id, title").in("id", noteIds);
            if (error) {
                throw new Error(`Failed to resolve links: ${error.message}`);
            }
            for (const row of data as { id: string; title: string | null }[]) {
                titles.set(`note:${row.id}`, row.title ?? "Untitled note");
            }
        }
        if (sessionIds.length > 0) {
            const { data, error } = await this.supabase.from("sessions").select("id, date").in("id", sessionIds);
            if (error) {
                throw new Error(`Failed to resolve links: ${error.message}`);
            }
            for (const row of data as { id: string; date: string }[]) {
                titles.set(`session:${row.id}`, `Session ${row.date}`);
            }
        }

        return titles;
    }

    /**
     * Measured maxima per grip x edge x hand, from pickup (max lift) tests.
     * These are the reference loads every other protocol is prescribed from.
     */
    async getFingerboardMaxes(): Promise<FingerboardMaxResponse[]> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase.rpc("fingerboard_maxes");

        if (error) {
            throw new Error(`Failed to fetch fingerboard maxes: ${error.message}`);
        }

        return (data as FingerboardMaxRow[]).map(mapFingerboardMaxRow);
    }

    async listFingerboardWorkouts(limit: number = 20): Promise<FingerboardWorkoutResponse[]> {
        await this.ensureAuthenticated();

        const { data: rows, error } = await this.supabase
            .from("fingerboard_workouts")
            .select("*")
            .order("performed_at", { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(`Failed to fetch fingerboard workouts: ${error.message}`);
        }

        const workoutRows = rows as FingerboardWorkoutRow[];
        if (workoutRows.length === 0) {
            return [];
        }

        const { data: setRows, error: setError } = await this.supabase
            .from("fingerboard_sets")
            .select("*")
            .in("workout_id", workoutRows.map((w) => w.id))
            .order("set_index");

        if (setError) {
            throw new Error(`Failed to fetch fingerboard sets: ${setError.message}`);
        }

        const setsByWorkout = new Map<string, FingerboardSetRow[]>();
        for (const row of setRows as FingerboardSetRow[]) {
            const list = setsByWorkout.get(row.workout_id) ?? [];
            list.push(row);
            setsByWorkout.set(row.workout_id, list);
        }

        return workoutRows.map((row) =>
            mapFingerboardWorkoutRow(row, (setsByWorkout.get(row.id) ?? []).map(mapFingerboardSetRow))
        );
    }
}

function nextDay(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}
