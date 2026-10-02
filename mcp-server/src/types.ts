export interface InjuryResponse {
    id: string;
    location: string;
    note: string | null;
    severity: number | null;
}

export interface SessionResponse {
    id: string;
    date: string;
    types: string[];
    intensity: number;
    performance: string;
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
    severity?: number;
}

export interface SessionRequest {
    date: string;
    types: string[];
    intensity: number;
    performance: string;
    durationMinutes?: number;
    notes?: string;
    maxGrade?: string;
    venue?: string;
    injuries?: InjuryRequest[];
}

export interface PainFlagCount {
    location: string;
    count: number;
    weightedCount: number;
}

export interface WeeklySessionCount {
    weekStart: string;
    count: number;
}

export interface SessionTypeVolume {
    weekStart: string;
    type: string;
    sessionCount: number;
    totalMinutes: number;
}

export interface SessionPerformanceLog {
    date: string;
    performance: string;
}

export interface WeeklyTrend {
    weekStart: string;
    average: number | null;
}

export type NoteSource = "user" | "assistant";

/** Reserved tag for rules about how the assistant should behave. */
export const ASSISTANT_TAG = "assistant";

export interface NoteResponse {
    id: string;
    title: string | null;
    content: string;
    tags: string[];
    pinned: boolean;
    source: NoteSource;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NoteCreateRequest {
    title: string;
    content: string;
    tags: string[];
    pinned: boolean;
}

export interface NoteUpdateRequest {
    title?: string;
    content?: string;
    tags?: string[];
    pinned?: boolean;
    archived?: boolean;
}

export interface NoteListFilter {
    tags?: string[];
    pinned?: boolean;
    from?: string;
    to?: string;
    includeArchived?: boolean;
    limit?: number;
}

export interface TagCount {
    tag: string;
    count: number;
}

export type SearchKind = "note" | "task" | "journal";

export type TaskStatus = "open" | "done";

export const DEFAULT_TASK_LIST = "inbox";

export interface TaskResponse {
    id: string;
    list: string;
    title: string;
    notes: string | null;
    status: TaskStatus;
    dueDate: string | null;
    completedAt: string | null;
    source: NoteSource;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TaskCreateRequest {
    title: string;
    list: string;
    notes: string | null;
    dueDate: string | null;
}

export interface TaskUpdateRequest {
    title?: string;
    list?: string;
    notes?: string | null;
    dueDate?: string | null;
    status?: TaskStatus;
    archived?: boolean;
}

export interface TaskListFilter {
    list?: string;
    status?: TaskStatus;
    dueBefore?: string;
    includeArchived?: boolean;
    limit?: number;
}

export interface TaskListSummary {
    list: string;
    openCount: number;
    totalCount: number;
}

export interface JournalEntryResponse {
    id: string;
    entryDate: string;
    content: string;
    tags: string[];
    mood: number | null;
    energy: number | null;
    source: NoteSource;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface JournalEntryCreateRequest {
    entryDate: string;
    content: string;
    tags: string[];
    mood: number | null;
    energy: number | null;
}

export interface JournalEntryUpdateRequest {
    entryDate?: string;
    content?: string;
    tags?: string[];
    mood?: number | null;
    energy?: number | null;
    archived?: boolean;
}

export interface JournalListFilter {
    from?: string;
    to?: string;
    tags?: string[];
    includeArchived?: boolean;
    limit?: number;
}

/** For tasks, `tags` holds the task's list name. Journal entries have no title. */
export interface SearchResult {
    kind: SearchKind;
    id: string;
    title: string | null;
    snippet: string;
    date: string;
    tags: string[];
    score: number;
}

export interface WeeklyTrainingLoad {
    weekStart: string;
    load: number;
}

export interface AnalyticsResponse {
    sessionsThisWeek: number;
    hardSessionsLast7Days: number;
    currentWeekTrainingLoad: number;
    painFlagsLast30Days: PainFlagCount[];
    weeklySessionCounts: WeeklySessionCount[];
    sessionTypeVolume: SessionTypeVolume[];
    sessionPerformanceLog: SessionPerformanceLog[];
    weeklyTrainingLoad: WeeklyTrainingLoad[];
    performanceTrend: WeeklyTrend[];
    rpeTrend: WeeklyTrend[];
}

// Database row types (snake_case as returned by Supabase)
export interface SessionRow {
    id: string;
    user_id: string;
    date: string;
    types: string[];
    intensity: number;
    performance: string;
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
    severity: number | null;
    created_at: string;
    updated_at: string;
}

export interface NoteRow {
    id: string;
    user_id: string;
    title: string | null;
    content: string;
    tags: string[];
    pinned: boolean;
    source: NoteSource;
    archived_at: string | null;
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
        severity: row.severity,
    };
}

export interface TaskRow {
    id: string;
    user_id: string;
    list: string;
    title: string;
    notes: string | null;
    status: TaskStatus;
    due_date: string | null;
    completed_at: string | null;
    source: NoteSource;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface JournalEntryRow {
    id: string;
    user_id: string;
    entry_date: string;
    content: string;
    tags: string[];
    mood: number | null;
    energy: number | null;
    source: NoteSource;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
}

export function mapTaskRow(row: TaskRow): TaskResponse {
    return {
        id: row.id,
        list: row.list,
        title: row.title,
        notes: row.notes,
        status: row.status,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        source: row.source,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapJournalEntryRow(row: JournalEntryRow): JournalEntryResponse {
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
    };
}

export function mapNoteRow(row: NoteRow): NoteResponse {
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
    };
}

// --- Fingerboard ---

export type Grip = "half_crimp" | "open" | "full_crimp" | "three_finger_drag";
export type Hand = "both" | "left" | "right";
export type FingerboardMode = "hang" | "pickup";
export type FingerboardProtocol = "max_lift" | "repeaters";

export interface FingerboardMaxResponse {
    grip: Grip;
    edgeMm: number;
    hand: Hand;
    maxLoadKg: number;
    testedAt: string;
}

export interface FingerboardSetResponse {
    id: string;
    setIndex: number;
    grip: Grip;
    edgeMm: number;
    hand: Hand;
    mode: FingerboardMode;
    addedKg: number | null;
    liftedKg: number | null;
    totalLoadKg: number;
    workSeconds: number | null;
    completed: boolean;
    rpe: number | null;
}

export interface FingerboardWorkoutResponse {
    id: string;
    sessionId: string | null;
    protocol: FingerboardProtocol;
    performedAt: string;
    bodyweightKg: number | null;
    durationSeconds: number | null;
    completed: boolean;
    notes: string | null;
    sets: FingerboardSetResponse[];
}

export interface FingerboardMaxRow {
    grip: Grip;
    edge_mm: number;
    hand: Hand;
    max_load_kg: number | string;
    tested_at: string;
}

export interface FingerboardWorkoutRow {
    id: string;
    user_id: string;
    session_id: string | null;
    protocol: FingerboardProtocol;
    performed_at: string;
    bodyweight_kg: number | string | null;
    duration_seconds: number | null;
    completed: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface FingerboardSetRow {
    id: string;
    user_id: string;
    workout_id: string;
    set_index: number;
    grip: Grip;
    edge_mm: number;
    hand: Hand;
    mode: FingerboardMode;
    added_kg: number | string | null;
    lifted_kg: number | string | null;
    total_load_kg: number | string;
    work_seconds: number | string | null;
    completed: boolean;
    rpe: number | null;
    peak_force_kg: number | string | null;
    created_at: string;
    updated_at: string;
}

/** Postgres NUMERIC can arrive as a string; normalise it. */
function numeric(value: number | string | null): number | null {
    if (value === null) {
        return null;
    }
    return typeof value === "number" ? value : Number(value);
}

export function mapFingerboardMaxRow(row: FingerboardMaxRow): FingerboardMaxResponse {
    return {
        grip: row.grip,
        edgeMm: row.edge_mm,
        hand: row.hand,
        maxLoadKg: Number(row.max_load_kg),
        testedAt: row.tested_at,
    };
}

export function mapFingerboardSetRow(row: FingerboardSetRow): FingerboardSetResponse {
    return {
        id: row.id,
        setIndex: row.set_index,
        grip: row.grip,
        edgeMm: row.edge_mm,
        hand: row.hand,
        mode: row.mode,
        addedKg: numeric(row.added_kg),
        liftedKg: numeric(row.lifted_kg),
        totalLoadKg: numeric(row.total_load_kg) ?? 0,
        workSeconds: numeric(row.work_seconds),
        completed: row.completed,
        rpe: row.rpe,
    };
}

export function mapFingerboardWorkoutRow(
    row: FingerboardWorkoutRow,
    sets: FingerboardSetResponse[] = []
): FingerboardWorkoutResponse {
    return {
        id: row.id,
        sessionId: row.session_id,
        protocol: row.protocol,
        performedAt: row.performed_at,
        bodyweightKg: numeric(row.bodyweight_kg),
        durationSeconds: row.duration_seconds,
        completed: row.completed,
        notes: row.notes,
        sets,
    };
}
