import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
    SessionResponse,
    SessionRequest,
    AnalyticsResponse,
    InsightResponse,
    InsightRequest,
    SessionRow,
    SessionInjuryRow,
    InsightRow,
    PainFlagCount,
    WeeklySessionCount,
    WeeklyTrend,
    mapSessionRow,
    mapInjuryRow,
    mapInsightRow,
} from "./types.js";

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
                productivity: session.productivity,
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
                productivity: session.productivity,
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
            painFlagsResult,
            weeklyCountsResult,
            performanceTrendResult,
            productivityTrendResult,
        ] = await Promise.all([
            this.supabase.rpc("sessions_this_week"),
            this.supabase.rpc("hard_sessions_last_7_days"),
            this.supabase.rpc("pain_flags_last_30_days"),
            this.supabase.rpc("weekly_session_counts"),
            this.supabase.rpc("performance_trend"),
            this.supabase.rpc("productivity_trend"),
        ]);

        if (sessionsThisWeekResult.error) {
            throw new Error(`Failed to fetch sessionsThisWeek: ${sessionsThisWeekResult.error.message}`);
        }
        if (hardSessionsResult.error) {
            throw new Error(`Failed to fetch hardSessionsLast7Days: ${hardSessionsResult.error.message}`);
        }
        if (painFlagsResult.error) {
            throw new Error(`Failed to fetch painFlagsLast30Days: ${painFlagsResult.error.message}`);
        }
        if (weeklyCountsResult.error) {
            throw new Error(`Failed to fetch weeklySessionCounts: ${weeklyCountsResult.error.message}`);
        }
        if (performanceTrendResult.error) {
            throw new Error(`Failed to fetch performanceTrend: ${performanceTrendResult.error.message}`);
        }
        if (productivityTrendResult.error) {
            throw new Error(`Failed to fetch productivityTrend: ${productivityTrendResult.error.message}`);
        }

        const painFlags = (painFlagsResult.data as { location: string; count: number }[]).map(
            (r): PainFlagCount => ({ location: r.location, count: r.count })
        );

        const weeklyCounts = (weeklyCountsResult.data as { week_start: string; count: number }[]).map(
            (r): WeeklySessionCount => ({ weekStart: r.week_start, count: r.count })
        );

        const performanceTrend = (performanceTrendResult.data as { week_start: string; average: number | null }[]).map(
            (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
        );

        const productivityTrend = (productivityTrendResult.data as { week_start: string; average: number | null }[]).map(
            (r): WeeklyTrend => ({ weekStart: r.week_start, average: r.average })
        );

        return {
            sessionsThisWeek: sessionsThisWeekResult.data as number,
            hardSessionsLast7Days: hardSessionsResult.data as number,
            daysSinceLastRestDay: 0, // Not needed per PRD US-005
            painFlagsLast30Days: painFlags,
            weeklySessionCounts: weeklyCounts,
            performanceTrend,
            productivityTrend,
        };
    }

    async listInsights(): Promise<InsightResponse[]> {
        await this.ensureAuthenticated();

        const { data, error } = await this.supabase
            .from("coach_insights")
            .select("*")
            .order("pinned", { ascending: false })
            .order("updated_at", { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch insights: ${error.message}`);
        }

        return (data as InsightRow[]).map(mapInsightRow);
    }

    async createInsight(insight: InsightRequest): Promise<InsightResponse> {
        const userId = await this.getUserId();

        const { data: row, error } = await this.supabase
            .from("coach_insights")
            .insert({
                user_id: userId,
                content: insight.content,
                pinned: insight.pinned,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create insight: ${error.message}`);
        }

        return mapInsightRow(row as InsightRow);
    }

    async updateInsight(id: string, insight: InsightRequest): Promise<InsightResponse> {
        await this.ensureAuthenticated();

        const { data: row, error } = await this.supabase
            .from("coach_insights")
            .update({
                content: insight.content,
                pinned: insight.pinned,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update insight: ${error.message}`);
        }

        return mapInsightRow(row as InsightRow);
    }
}
