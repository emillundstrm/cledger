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

export function mapInsightRow(row: InsightRow): InsightResponse {
    return {
        id: row.id,
        content: row.content,
        pinned: row.pinned,
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
