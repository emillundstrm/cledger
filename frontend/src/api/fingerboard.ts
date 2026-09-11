import { supabase } from "@/lib/supabase"
import type { Grip, Hand, Protocol } from "@/lib/fingerboard/protocols"
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
import { createSession } from "./sessions"

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
 * Persists a finished workout and, when a session is supplied, auto-creates the
 * linked `sessions` row so the user never logs a fingerboard session by hand.
 * The workout outlives the session: deleting the session nulls the link rather
 * than cascading.
 */
export async function saveFingerboardWorkout(
    workout: FingerboardWorkoutRequest,
    session: SessionRequest | null
): Promise<FingerboardWorkout> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    let sessionId: string | null = null
    if (session !== null) {
        const created = await createSession(session)
        sessionId = created.id
    }

    const { data: workoutRow, error } = await supabase
        .from("fingerboard_workouts")
        .insert({
            user_id: user.id,
            session_id: sessionId,
            protocol: workout.protocol,
            bodyweight_kg: workout.bodyweightKg,
            params: workout.params,
            duration_seconds: workout.durationSeconds,
            completed: workout.completed,
            notes: workout.notes,
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to create fingerboard workout")
    }

    const created = workoutRow as FingerboardWorkoutRow

    if (workout.sets.length === 0) {
        return mapFingerboardWorkoutRow(created)
    }

    const { data: setRows, error: setError } = await supabase
        .from("fingerboard_sets")
        .insert(
            workout.sets.map((set) => ({
                user_id: user.id,
                workout_id: created.id,
                set_index: set.setIndex,
                grip: set.grip,
                edge_mm: set.edgeMm,
                hand: set.hand,
                mode: set.mode,
                added_kg: set.addedKg,
                lifted_kg: set.liftedKg,
                total_load_kg: set.totalLoadKg,
                work_seconds: set.workSeconds,
                completed: set.completed,
                rpe: set.rpe,
            }))
        )
        .select()

    if (setError) {
        throw new Error("Failed to create fingerboard sets")
    }

    return mapFingerboardWorkoutRow(created, (setRows as FingerboardSetRow[]).map(mapFingerboardSetRow))
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
