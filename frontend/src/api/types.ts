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
    distanceKm: number | null
    /** The Garmin Connect activity this session was copied from. Set by the assistant, never shown. */
    garminActivityId: string | null
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
    distanceKm: number | null
    venue: string | null
    injuries: InjuryRequest[]
    /** Planned items to cross off. Left out, the session's plan links are not touched. */
    plan?: SessionPlanLinks
}

/**
 * The planned items the form offered (entry ids of one plan week) and the
 * ones picked. Saving links the picked ones and unlinks the offered ones that
 * were not picked; links outside `offered` are left alone.
 */
export interface SessionPlanLinks {
    offered: string[]
    selected: string[]
}

/**
 * Where a fingerboard workout gets logged: a session of its own, or one
 * already recorded for the day — two workouts in the same visit to the gym
 * belong to one session, not two.
 */
export type SessionTarget =
    | { kind: "new"; session: SessionRequest }
    | { kind: "existing"; sessionId: string }

export const SESSION_TYPES = ["boulder", "routes", "board", "hangboard", "strength", "running", "rehab", "other"] as const
export const PERFORMANCE_VALUES = ["weak", "normal", "strong"] as const

/** Swedish display labels for the stored session type values. */
export const SESSION_TYPE_LABELS: Record<string, string> = {
    boulder: "Boulder",
    routes: "Leder",
    board: "Board",
    hangboard: "Fingerträning",
    strength: "Styrka",
    running: "Löpning",
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

// Climbing sessions only. rollingScore is the mean of weak = -1, normal = 0, strong = +1
// over the climbing sessions in the 14 days ending on this date.
export interface SessionPerformanceLog {
    date: string
    performance: string
    rollingScore: number
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
    distance_km: number | null
    garmin_activity_id: string | null
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
        distanceKm: row.distance_km,
        garminActivityId: row.garmin_activity_id,
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

// --- Training plans (tasks/prd-training-plans.md) ---
// The plan RPCs return camelCase JSON already, so these need no row mappers.

export const PLAN_PHASES = ["volume", "strength", "endurance", "performance", "recovery"] as const
export type PlanPhase = (typeof PLAN_PHASES)[number]

export const PLAN_CATEGORIES = ["strength", "power", "endurance", "climbing", "mobility", "other"] as const
export type PlanCategory = (typeof PLAN_CATEGORIES)[number]

/** Swedish display labels for the stored plan phase values. */
export const PLAN_PHASE_LABELS: Record<PlanPhase, string> = {
    volume: "Volym",
    strength: "Styrka",
    endurance: "Uthållighet",
    performance: "Prestation",
    recovery: "Återhämtning",
}

/** Swedish display labels for the stored plan category values. */
export const PLAN_CATEGORY_LABELS: Record<PlanCategory, string> = {
    strength: "Styrka",
    power: "Explosivitet",
    endurance: "Uthållighet",
    climbing: "Klättring",
    mobility: "Rörlighet",
    other: "Övrigt",
}

export interface PlanWeek {
    week: number
    startDate: string
    phase: PlanPhase
    focus: string | null
    /** Null: the whole bucket. */
    targetCount: number | null
    plannedCount: number
    doneCount: number
}

export interface PlanEntry {
    id: string
    week: number
    count: number
    note: string | null
    doneCount: number
}

export interface PlanSession {
    id: string
    title: string
    category: PlanCategory
    description: string | null
    sessionTypes: string[]
    fingerboardPreset: Record<string, unknown> | null
    sortOrder: number
    archived: boolean
    entries: PlanEntry[]
}

export interface TrainingPlan {
    id: string
    title: string
    goal: string | null
    notes: string | null
    startDate: string
    archived: boolean
    weeks: PlanWeek[]
    sessions: PlanSession[]
}

/** One slot in a week's bucket: an entry with count 2 is two items. */
export interface PlanWeekItem {
    entryId: string
    planSessionId: string
    title: string
    category: PlanCategory
    description: string | null
    sessionTypes: string[]
    fingerboardPreset: Record<string, unknown> | null
    note: string | null
    slot: number
    /** The session that crossed this slot off, or null while open. */
    sessionId: string | null
    sessionDate: string | null
}

export interface CurrentPlanWeek {
    planId: string
    planTitle: string
    week: number
    weekCount: number
    startDate: string
    endDate: string
    phase: PlanPhase
    focus: string | null
    targetCount: number | null
    plannedCount: number
    doneCount: number
    items: PlanWeekItem[]
}

export interface PlanReviewSession {
    id: string
    date: string
    types: string[]
    durationMinutes: number | null
    intensity: number
    performance: string
    notes: string | null
}

export interface PlanWeekReview {
    planId: string
    planTitle: string
    week: number
    startDate: string
    endDate: string
    phase: PlanPhase
    focus: string | null
    targetCount: number | null
    plannedCount: number
    doneCount: number
    targetMet: boolean
    completed: { title: string; category: PlanCategory; note: string | null; session: PlanReviewSession }[]
    missed: { title: string; category: PlanCategory; note: string | null }[]
    unplanned: PlanReviewSession[]
    byType: { type: string; sessions: number; minutes: number }[]
    byCategory: { category: PlanCategory; plannedCount: number; doneCount: number }[]
    fingerboard: { date: string; protocol: string; completed: boolean; grips: string[] }[]
    injuries: { date: string; location: string; severity: number | null; note: string | null }[]
}

export interface PlanWeekInput {
    week: number
    phase?: PlanPhase
    targetCount?: number | null
    focus?: string | null
}

export interface PlanEntryInput {
    week: number
    /** Default 1; 0 removes the entry. */
    count?: number
    note?: string | null
}

export interface PlanSessionInput {
    /** Set to change an existing template; leave out to add one. */
    id?: string
    title?: string
    category?: PlanCategory
    description?: string | null
    sessionTypes?: string[]
    fingerboardPreset?: Record<string, unknown> | null
    sortOrder?: number
    archived?: boolean
    entries?: PlanEntryInput[]
}

/** A patch changes only the keys it names. */
export interface TrainingPlanPatch {
    title?: string
    goal?: string | null
    notes?: string | null
    startDate?: string
    weeks?: PlanWeekInput[]
    sessions?: PlanSessionInput[]
}

export interface TrainingPlanInput extends TrainingPlanPatch {
    title: string
    startDate: string
    weeks: PlanWeekInput[]
}
