import type { Grip, Hand, Mode, Protocol, ProtocolParams } from "@/lib/fingerboard/protocols"

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
    { value: 1, name: "Känning", description: "Lätt obehag, träningen behöver inte ändras" },
    { value: 2, name: "Lindrig", description: "Märks under träning, men du kan fortsätta som vanligt" },
    { value: 3, name: "Måttlig", description: "Kräver anpassning – undvik vissa rörelser eller sänk intensiteten" },
    { value: 4, name: "Begränsande", description: "Kraftigt begränsad – viss träning går, men inte full klättring" },
    { value: 5, name: "Allvarlig", description: "Kräver full vila. Ingen träning förrän det har läkt" },
] as const

export interface Session {
    id: string
    date: string
    types: string[]
    intensity: number
    performance: string
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
    durationMinutes: number | null
    notes: string | null
    maxGrade: string | null
    venue: string | null
    injuries: InjuryRequest[]
}

/**
 * Where a fingerboard workout gets logged: a session of its own, or one
 * already recorded for the day — two workouts in the same visit to the gym
 * belong to one session, not two.
 */
export type SessionTarget =
    | { kind: "new"; session: SessionRequest }
    | { kind: "existing"; sessionId: string }

export const SESSION_TYPES = ["boulder", "routes", "board", "hangboard", "strength", "rehab", "other"] as const
export const PERFORMANCE_VALUES = ["weak", "normal", "strong"] as const

/** Swedish display labels for the stored session type values. */
export const SESSION_TYPE_LABELS: Record<string, string> = {
    boulder: "Boulder",
    routes: "Leder",
    board: "Board",
    hangboard: "Fingerträning",
    strength: "Styrka",
    rehab: "Rehab",
    other: "Övrigt",
}

/** Swedish display labels for the stored performance values. */
export const PERFORMANCE_LABELS: Record<string, string> = {
    weak: "Svag",
    normal: "Normal",
    strong: "Stark",
}

/** Display label for a session type, falling back to the capitalised value. */
export function sessionTypeLabel(type: string): string {
    return SESSION_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

/** Display label for a performance value, falling back to the capitalised value. */
export function performanceLabel(value: string): string {
    return PERFORMANCE_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}

export interface PainFlagCount {
    location: string
    count: number
    weightedCount: number
}

// Selectable dashboard window. <= 8 weeks buckets by week; longer buckets by month.
export type Period = "4w" | "8w" | "6m" | "1y" | "all"

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "4w", label: "4 veckor" },
    { value: "8w", label: "8 veckor" },
    { value: "6m", label: "6 månader" },
    { value: "1y", label: "Ett år" },
    { value: "all", label: "All tid" },
]

// True when a period buckets by month rather than by week — drives label formatting.
export function isMonthlyPeriod(period: Period): boolean {
    return period !== "4w" && period !== "8w"
}

export interface SessionTypeVolume {
    weekStart: string
    type: string
    sessionCount: number
    totalMinutes: number
}

export interface SessionPerformanceLog {
    date: string
    performance: string
}

export interface WeeklyTrend {
    weekStart: string
    average: number | null
}

export type NoteSource = "user" | "assistant"

/** Reserved tag for rules about how the assistant should behave. */
export const ASSISTANT_TAG = "assistant"

export interface Note {
    id: string
    title: string | null
    content: string
    tags: string[]
    pinned: boolean
    source: NoteSource
    archivedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface NoteRequest {
    title: string
    content: string
    tags: string[]
    pinned: boolean
}

export interface TagCount {
    tag: string
    count: number
}

export type SearchKind = "note" | "journal"

export interface JournalEntry {
    id: string
    entryDate: string
    content: string
    tags: string[]
    mood: number | null
    energy: number | null
    source: NoteSource
    archivedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface JournalEntryRequest {
    entryDate: string
    content: string
    tags: string[]
    mood: number | null
    energy: number | null
}

/** Journal entries have no title. */
export interface SearchResult {
    kind: SearchKind
    id: string
    title: string | null
    snippet: string
    date: string
    tags: string[]
    score: number
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
    sessionTypeVolume: SessionTypeVolume[]
    sessionPerformanceLog: SessionPerformanceLog[]
    weeklyTrainingLoad: WeeklyTrainingLoad[]
}

// Database row types (snake_case as returned by Supabase)
export interface SessionRow {
    id: string
    user_id: string
    date: string
    types: string[]
    intensity: number
    performance: string
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

export interface NoteRow {
    id: string
    user_id: string
    title: string | null
    content: string
    tags: string[]
    pinned: boolean
    source: NoteSource
    archived_at: string | null
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

export interface JournalEntryRow {
    id: string
    user_id: string
    entry_date: string
    content: string
    tags: string[]
    mood: number | null
    energy: number | null
    source: NoteSource
    archived_at: string | null
    created_at: string
    updated_at: string
}

export function mapJournalEntryRow(row: JournalEntryRow): JournalEntry {
    return {
        id: row.id,
        entryDate: row.entry_date,
        content: row.content,
        tags: row.tags,
        mood: row.mood,
        energy: row.energy,
        source: row.source,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export function mapNoteRow(row: NoteRow): Note {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        tags: row.tags,
        pinned: row.pinned,
        source: row.source,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// ---------------------------------------------------------------------------
// Fingerboard
// ---------------------------------------------------------------------------

export interface FingerboardSetRequest {
    setIndex: number
    grip: Grip
    edgeMm: number
    hand: Hand
    mode: Mode
    /** Hang only: added weight, or negative for assistance. */
    addedKg: number | null
    /** Pickup only: the absolute weight lifted. */
    liftedKg: number | null
    /** Absolute force through the fingers — the unified load model. */
    totalLoadKg: number
    workSeconds: number | null
    completed: boolean
    rpe: number | null
}

export interface FingerboardSet extends FingerboardSetRequest {
    id: string
    peakForceKg: number | null
}

export interface FingerboardWorkoutRequest {
    protocol: Protocol
    bodyweightKg: number | null
    params: ProtocolParams
    durationSeconds: number | null
    completed: boolean
    notes: string | null
    sets: FingerboardSetRequest[]
}

export interface FingerboardWorkout {
    id: string
    sessionId: string | null
    protocol: Protocol
    performedAt: string
    bodyweightKg: number | null
    params: ProtocolParams
    durationSeconds: number | null
    completed: boolean
    notes: string | null
    sets: FingerboardSet[]
}

export interface FingerboardMax {
    grip: Grip
    edgeMm: number
    hand: Hand
    maxLoadKg: number
    testedAt: string
}

export type RecommendationSource = "measured_max" | "none"

export interface LoadRecommendation {
    recommendedKg: number | null
    source: RecommendationSource
    basisKg: number | null
}

export interface FingerboardWorkoutRow {
    id: string
    user_id: string
    session_id: string | null
    protocol: Protocol
    performed_at: string
    bodyweight_kg: number | null
    params: ProtocolParams
    duration_seconds: number | null
    completed: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export interface FingerboardSetRow {
    id: string
    user_id: string
    workout_id: string
    set_index: number
    grip: Grip
    edge_mm: number
    hand: Hand
    mode: Mode
    added_kg: number | null
    lifted_kg: number | null
    total_load_kg: number
    work_seconds: number | null
    completed: boolean
    rpe: number | null
    peak_force_kg: number | null
    created_at: string
    updated_at: string
}

/** Postgres NUMERIC can arrive as a string; normalise it. */
function num(value: number | string | null): number | null {
    if (value === null) {
        return null
    }
    return typeof value === "number" ? value : Number(value)
}

export function mapFingerboardSetRow(row: FingerboardSetRow): FingerboardSet {
    return {
        id: row.id,
        setIndex: row.set_index,
        grip: row.grip,
        edgeMm: row.edge_mm,
        hand: row.hand,
        mode: row.mode,
        addedKg: num(row.added_kg),
        liftedKg: num(row.lifted_kg),
        totalLoadKg: num(row.total_load_kg) ?? 0,
        workSeconds: num(row.work_seconds),
        completed: row.completed,
        rpe: row.rpe,
        peakForceKg: num(row.peak_force_kg),
    }
}

export function mapFingerboardWorkoutRow(
    row: FingerboardWorkoutRow,
    sets: FingerboardSet[] = []
): FingerboardWorkout {
    return {
        id: row.id,
        sessionId: row.session_id,
        protocol: row.protocol,
        performedAt: row.performed_at,
        bodyweightKg: num(row.bodyweight_kg),
        params: row.params,
        durationSeconds: row.duration_seconds,
        completed: row.completed,
        notes: row.notes,
        sets,
    }
}
