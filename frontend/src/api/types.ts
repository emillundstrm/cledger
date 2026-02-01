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
