export interface InjuryResponse {
    id: string;
    location: string;
    note: string | null;
}

export interface SessionResponse {
    id: string;
    date: string;
    types: string[];
    intensity: string;
    performance: string;
    productivity: string;
    durationMinutes: number | null;
    notes: string | null;
    maxGrade: string | null;
    venue: string | null;
    injuries: InjuryResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface InjuryRequest {
    location: string;
    note?: string;
}

export interface SessionRequest {
    date: string;
    types: string[];
    intensity: string;
    performance: string;
    productivity: string;
    durationMinutes?: number;
    notes?: string;
    maxGrade?: string;
    venue?: string;
    injuries?: InjuryRequest[];
}

export interface PainFlagCount {
    location: string;
    count: number;
}

export interface WeeklySessionCount {
    weekStart: string;
    count: number;
}

export interface WeeklyTrend {
    weekStart: string;
    average: number | null;
}

export interface InsightResponse {
    id: string;
    content: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface InsightRequest {
    content: string;
    pinned: boolean;
}

export interface AnalyticsResponse {
    sessionsThisWeek: number;
    hardSessionsLast7Days: number;
    painFlagsLast30Days: PainFlagCount[];
    weeklySessionCounts: WeeklySessionCount[];
    performanceTrend: WeeklyTrend[];
    productivityTrend: WeeklyTrend[];
}

// Database row types (snake_case as returned by Supabase)
export interface SessionRow {
    id: string;
    user_id: string;
    date: string;
    types: string[];
    intensity: string;
    performance: string;
    productivity: string;
    duration_minutes: number | null;
    notes: string | null;
    max_grade: string | null;
    venue: string | null;
    created_at: string;
    updated_at: string;
}

export interface SessionInjuryRow {
    id: string;
    user_id: string;
    session_id: string;
    location: string;
    note: string | null;
    created_at: string;
    updated_at: string;
}

export interface InsightRow {
    id: string;
    user_id: string;
    content: string;
    pinned: boolean;
    created_at: string;
    updated_at: string;
}

export function mapSessionRow(row: SessionRow, injuries: InjuryResponse[] = []): SessionResponse {
    return {
        id: row.id,
        date: row.date,
        types: row.types,
        intensity: row.intensity,
        performance: row.performance,
        productivity: row.productivity,
        durationMinutes: row.duration_minutes,
        notes: row.notes,
        maxGrade: row.max_grade,
        venue: row.venue,
        injuries,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapInjuryRow(row: SessionInjuryRow): InjuryResponse {
    return {
        id: row.id,
        location: row.location,
        note: row.note,
    };
}

export function mapInsightRow(row: InsightRow): InsightResponse {
    return {
        id: row.id,
        content: row.content,
        pinned: row.pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
