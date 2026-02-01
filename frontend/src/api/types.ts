export interface InjuryResponse {
    id: string
    location: string
    note: string | null
}

export interface InjuryRequest {
    location: string
    note: string | null
}

export interface Session {
    id: string
    date: string
    types: string[]
    intensity: string
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
    intensity: string
    performance: string
    productivity: string
    durationMinutes: number | null
    notes: string | null
    maxGrade: string | null
    venue: string | null
    injuries: InjuryRequest[]
}

export const SESSION_TYPES = ["boulder", "routes", "board", "hangboard", "strength", "prehab", "other"] as const
export const INTENSITY_VALUES = ["easy", "moderate", "hard"] as const
export const PERFORMANCE_VALUES = ["weak", "normal", "strong"] as const
export const PRODUCTIVITY_VALUES = ["low", "normal", "high"] as const

export interface PainFlagCount {
    location: string
    count: number
}

export interface WeeklySessionCount {
    weekStart: string
    count: number
}

export interface WeeklyTrend {
    weekStart: string
    average: number | null
}

export interface Analytics {
    sessionsThisWeek: number
    hardSessionsLast7Days: number
    daysSinceLastRestDay: number
    painFlagsLast30Days: PainFlagCount[]
    weeklySessionCounts: WeeklySessionCount[]
    performanceTrend: WeeklyTrend[]
    productivityTrend: WeeklyTrend[]
}
