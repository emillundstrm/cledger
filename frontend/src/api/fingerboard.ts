import { supabase } from "@/lib/supabase"
import type { Grip, Hand, HandMode, Mode, Protocol } from "@/lib/fingerboard/protocols"
import { handsForMode } from "@/lib/fingerboard/protocols"
import type {
    FingerboardMax,
    FingerboardSetRow,
    FingerboardWorkout,
    FingerboardWorkoutRequest,
    FingerboardWorkoutRow,
    LoadRecommendation,
    RecommendationSource,
    SessionRequest,
} from "./types"
import { mapFingerboardSetRow, mapFingerboardWorkoutRow } from "./types"

interface FingerboardMaxRow {
    grip: Grip
    edge_mm: number
    hand: Hand
    max_load_kg: number | string
    tested_at: string
}

export async function fetchFingerboardMaxes(): Promise<FingerboardMax[]> {
    const { data, error } = await supabase.rpc("fingerboard_maxes")

    if (error) {
        throw new Error("Failed to fetch fingerboard maxes")
    }

    return (data as FingerboardMaxRow[]).map((row) => ({
        grip: row.grip,
        edgeMm: row.edge_mm,
        hand: row.hand,
        maxLoadKg: Number(row.max_load_kg),
        testedAt: row.tested_at,
    }))
}

export async function fetchLoadRecommendation(
    protocol: Protocol,
    grip: Grip,
    edgeMm: number,
    hand: Hand
): Promise<LoadRecommendation> {
    const { data, error } = await supabase.rpc("recommend_fingerboard_load", {
        p_protocol: protocol,
        p_grip: grip,
        p_edge_mm: edgeMm,
        p_hand: hand,
    })

    if (error) {
        throw new Error("Failed to fetch load recommendation")
    }

    const rows = data as { recommended_kg: number | string | null; source: RecommendationSource; basis_kg: number | string | null }[]
    if (rows.length === 0) {
        return { recommendedKg: null, source: "none", basisKg: null }
    }

    const row = rows[0]
    return {
        recommendedKg: row.recommended_kg === null ? null : Number(row.recommended_kg),
        source: row.source,
        basisKg: row.basis_kg === null ? null : Number(row.basis_kg),
    }
}

/**
 * Recommendation for a hand mode. Alternating sets work both hands off one
 * starting load, so the weaker side governs — otherwise the first attempt is
 * unliftable on one hand.
 */
export async function fetchLoadRecommendationForMode(
    protocol: Protocol,
    grip: Grip,
    edgeMm: number,
    handMode: HandMode
): Promise<LoadRecommendation> {
    const hands = handsForMode(handMode)
    if (hands.length === 1) {
        return fetchLoadRecommendation(protocol, grip, edgeMm, hands[0])
    }

    const results = await Promise.all(
        hands.map((hand) => fetchLoadRecommendation(protocol, grip, edgeMm, hand))
    )
    const usable = results.filter((r) => r.recommendedKg !== null)
    if (usable.length === 0) {
        return { recommendedKg: null, source: "none", basisKg: null }
    }

    return usable.reduce((lowest, current) =>
        (current.recommendedKg ?? 0) < (lowest.recommendedKg ?? 0) ? current : lowest
    )
}

export interface BlockKey {
    grip: Grip
    edgeMm: number
}

/** One recommendation per grip position, keyed "grip:edge". */
export async function fetchLoadRecommendations(
    protocol: Protocol,
    blocks: BlockKey[],
    handMode: HandMode
): Promise<Record<string, LoadRecommendation>> {
    const unique = new Map<string, BlockKey>()
    for (const block of blocks) {
        unique.set(`${block.grip}:${block.edgeMm}`, block)
    }

    const entries = await Promise.all(
        [...unique.entries()].map(async ([key, block]) => {
            const recommendation = await fetchLoadRecommendationForMode(
                protocol,
                block.grip,
                block.edgeMm,
                handMode
            )
            return [key, recommendation] as const
        })
    )

    return Object.fromEntries(entries)
}

export interface LastWorkoutPosition {
    grip: Grip
    edgeMm: number
    sets: number
    loadKg: number
    mode: Mode
}

/** Shape and loads of the last completed workout of a protocol, if any. */
export async function fetchLastFingerboardWorkout(
    protocol: Protocol
): Promise<LastWorkoutPosition[]> {
    const { data, error } = await supabase.rpc("last_fingerboard_workout", {
        p_protocol: protocol,
    })

    if (error) {
        throw new Error(error.message)
    }

    return (
        data as {
            grip: Grip
            edge_mm: number
            sets: number
            load_kg: number | string | null
            mode: Mode
        }[]
    ).map((row) => ({
        grip: row.grip,
        edgeMm: row.edge_mm,
        sets: row.sets,
        loadKg: row.load_kg === null ? 0 : Number(row.load_kg),
        mode: row.mode,
    }))
}

export async function fetchFingerboardWorkouts(): Promise<FingerboardWorkout[]> {
    const { data: rows, error } = await supabase
        .from("fingerboard_workouts")
        .select("*")
        .order("performed_at", { ascending: false })

    if (error) {
        throw new Error("Failed to fetch fingerboard workouts")
    }

    const workoutRows = rows as FingerboardWorkoutRow[]
    if (workoutRows.length === 0) {
        return []
    }

    const { data: setRows, error: setError } = await supabase
        .from("fingerboard_sets")
        .select("*")
        .in("workout_id", workoutRows.map((w) => w.id))
        .order("set_index")

    if (setError) {
        throw new Error("Failed to fetch fingerboard sets")
    }

    const setsByWorkout = new Map<string, FingerboardSetRow[]>()
    for (const row of setRows as FingerboardSetRow[]) {
        const list = setsByWorkout.get(row.workout_id) ?? []
        list.push(row)
        setsByWorkout.set(row.workout_id, list)
    }

    return workoutRows.map((row) =>
        mapFingerboardWorkoutRow(row, (setsByWorkout.get(row.id) ?? []).map(mapFingerboardSetRow))
    )
}

/**
 * Persists a finished workout, its sets, and the session it logs — in one
 * transaction, via an RPC. Doing it as three client calls meant a failure part
 * way through left an orphan session behind, and retrying duplicated it.
 */
export async function saveFingerboardWorkout(
    workout: FingerboardWorkoutRequest,
    session: SessionRequest | null
): Promise<string> {
    const { data, error } = await supabase.rpc("save_fingerboard_workout", {
        p_protocol: workout.protocol,
        p_bodyweight_kg: workout.bodyweightKg,
        p_params: workout.params,
        p_duration_seconds: workout.durationSeconds,
        p_completed: workout.completed,
        p_notes: workout.notes,
        p_sets: workout.sets,
        p_session: session,
    })

    if (error) {
        // Surface what actually went wrong: "check your connection" sent the
        // user round a retry loop for what was a constraint violation.
        throw new Error(error.message)
    }

    return data as string
}

export async function deleteFingerboardWorkout(id: string): Promise<void> {
    const { error } = await supabase
        .from("fingerboard_workouts")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete fingerboard workout")
    }
}
