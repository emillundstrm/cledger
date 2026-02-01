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
    hardAttempts: number | null
    painFlags: string[]
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
    hardAttempts: number | null
    painFlags: string[]
}

export const SESSION_TYPES = ["boulder", "routes", "board", "hangboard", "strength", "prehab"] as const
export const INTENSITY_VALUES = ["easy", "moderate", "hard"] as const
export const PERFORMANCE_VALUES = ["weak", "normal", "strong"] as const
export const PRODUCTIVITY_VALUES = ["low", "normal", "high"] as const
export const PAIN_FLAG_LOCATIONS = ["finger", "elbow", "shoulder"] as const
