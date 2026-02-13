export interface InjuryResponse {
    id: string
    location: string
    note: string | null
    severity: number | null
}

export interface InjuryRequest {
    location: string
    note: string | null
    severity: number | null
}

export const SEVERITY_LEVELS = [
    { value: 1, name: "Tweak", description: "Slight discomfort, no training modifications needed" },
    { value: 2, name: "Minor", description: "Noticeable during training, but can continue normally" },
    { value: 3, name: "Moderate", description: "Requires modifications — avoid certain movements or reduce intensity" },
    { value: 4, name: "Limiting", description: "Significantly restricted — can do some training but not full climbing" },
    { value: 5, name: "Severe", description: "Complete rest required. No training until healed" },
] as const

export interface Session {
    id: string
    date: string
    types: string[]
    intensity: number
    performance: string
    productivity: string
    durationMinutes: number | null
    notes: string | null
    maxGrade: string | null
    venue: string | null
    injuries: InjuryResponse[]
    createdAt: string
    updatedAt: string
}

export interface SessionRequest {
    date: string
    types: string[]
    intensity: number
    performance: string
    productivity: string
    durationMinutes: number | null
    notes: string | null
    maxGrade: string | null
    venue: string | null
    injuries: InjuryRequest[]
}

export const SESSION_TYPES = ["boulder", "routes", "board", "hangboard", "strength", "prehab", "other"] as const
export const PERFORMANCE_VALUES = ["weak", "normal", "strong"] as const
export const PRODUCTIVITY_VALUES = ["low", "normal", "high"] as const

export interface PainFlagCount {
    location: string
    count: number
    weightedCount: number
}

export interface WeeklySessionCount {
    weekStart: string
    count: number
}

export interface WeeklyTrend {
    weekStart: string
    average: number | null
}

export interface Insight {
    id: string
    content: string
    pinned: boolean
    createdAt: string
    updatedAt: string
}

export interface InsightRequest {
    content: string
    pinned: boolean
}

export interface WeeklyTrainingLoad {
    weekStart: string
    load: number
}

export interface Analytics {
    sessionsThisWeek: number
    hardSessionsLast7Days: number
    currentWeekTrainingLoad: number
    painFlagsLast30Days: PainFlagCount[]
    weeklySessionCounts: WeeklySessionCount[]
    weeklyTrainingLoad: WeeklyTrainingLoad[]
    performanceTrend: WeeklyTrend[]
    productivityTrend: WeeklyTrend[]
}

// Database row types (snake_case as returned by Supabase)
export interface SessionRow {
    id: string
    user_id: string
    date: string
    types: string[]
    intensity: number
    performance: string
    productivity: string
    duration_minutes: number | null
    notes: string | null
    max_grade: string | null
    venue: string | null
    created_at: string
    updated_at: string
}

export interface SessionInjuryRow {
    id: string
    user_id: string
    session_id: string
    location: string
    note: string | null
    severity: number | null
    created_at: string
    updated_at: string
}

export interface InsightRow {
    id: string
    user_id: string
    content: string
    pinned: boolean
    created_at: string
    updated_at: string
}

export function mapSessionRow(row: SessionRow, injuries: InjuryResponse[] = []): Session {
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
    }
}

export function mapInjuryRow(row: SessionInjuryRow): InjuryResponse {
    return {
        id: row.id,
        location: row.location,
        note: row.note,
        severity: row.severity,
    }
}

export function mapInsightRow(row: InsightRow): Insight {
    return {
        id: row.id,
        content: row.content,
        pinned: row.pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
