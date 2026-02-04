import { supabase } from "@/lib/supabase"
import type { Session, SessionRequest, SessionRow, SessionInjuryRow } from "./types"
import { mapSessionRow, mapInjuryRow } from "./types"

export async function fetchSessions(): Promise<Session[]> {
    const { data: rows, error } = await supabase
        .from("sessions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

    if (error) {
        throw new Error("Failed to fetch sessions")
    }

    const sessionRows = rows as SessionRow[]
    if (sessionRows.length === 0) {
        return []
    }

    const sessionIds = sessionRows.map((s) => s.id)
    const { data: injuryRows, error: injError } = await supabase
        .from("session_injuries")
        .select("*")
        .in("session_id", sessionIds)

    if (injError) {
        throw new Error("Failed to fetch session injuries")
    }

    const injuriesBySession = new Map<string, SessionInjuryRow[]>()
    for (const row of (injuryRows as SessionInjuryRow[])) {
        const list = injuriesBySession.get(row.session_id) ?? []
        list.push(row)
        injuriesBySession.set(row.session_id, list)
    }

    return sessionRows.map((row) =>
        mapSessionRow(row, (injuriesBySession.get(row.id) ?? []).map(mapInjuryRow))
    )
}

export async function fetchSession(id: string): Promise<Session> {
    const { data: row, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .single()

    if (error) {
        throw new Error("Failed to fetch session")
    }

    const { data: injuryRows, error: injError } = await supabase
        .from("session_injuries")
        .select("*")
        .eq("session_id", id)

    if (injError) {
        throw new Error("Failed to fetch session injuries")
    }

    return mapSessionRow(
        row as SessionRow,
        (injuryRows as SessionInjuryRow[]).map(mapInjuryRow)
    )
}

export async function createSession(data: SessionRequest): Promise<Session> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("sessions")
        .insert({
            user_id: user.id,
            date: data.date,
            types: data.types,
            intensity: data.intensity,
            performance: data.performance,
            productivity: data.productivity,
            duration_minutes: data.durationMinutes,
            notes: data.notes,
            max_grade: data.maxGrade,
            venue: data.venue,
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to create session")
    }

    const sessionRow = row as SessionRow
    let injuries = data.injuries ?? []
    if (injuries.length > 0) {
        const { data: injRows, error: injError } = await supabase
            .from("session_injuries")
            .insert(
                injuries.map((inj) => ({
                    user_id: user.id,
                    session_id: sessionRow.id,
                    location: inj.location,
                    note: inj.note,
                }))
            )
            .select()

        if (injError) {
            throw new Error("Failed to create session injuries")
        }

        return mapSessionRow(
            sessionRow,
            (injRows as SessionInjuryRow[]).map(mapInjuryRow)
        )
    }

    return mapSessionRow(sessionRow)
}

export async function updateSession(id: string, data: SessionRequest): Promise<Session> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("sessions")
        .update({
            date: data.date,
            types: data.types,
            intensity: data.intensity,
            performance: data.performance,
            productivity: data.productivity,
            duration_minutes: data.durationMinutes,
            notes: data.notes,
            max_grade: data.maxGrade,
            venue: data.venue,
        })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error("Failed to update session")
    }

    // Replace injuries: delete existing, insert new
    const { error: deleteError } = await supabase
        .from("session_injuries")
        .delete()
        .eq("session_id", id)

    if (deleteError) {
        throw new Error("Failed to update session injuries")
    }

    const injuries = data.injuries ?? []
    if (injuries.length > 0) {
        const { data: injRows, error: injError } = await supabase
            .from("session_injuries")
            .insert(
                injuries.map((inj) => ({
                    user_id: user.id,
                    session_id: id,
                    location: inj.location,
                    note: inj.note,
                }))
            )
            .select()

        if (injError) {
            throw new Error("Failed to create session injuries")
        }

        return mapSessionRow(
            row as SessionRow,
            (injRows as SessionInjuryRow[]).map(mapInjuryRow)
        )
    }

    return mapSessionRow(row as SessionRow)
}

export async function deleteSession(id: string): Promise<void> {
    const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete session")
    }
}

export async function fetchVenues(): Promise<string[]> {
    const { data, error } = await supabase
        .from("sessions")
        .select("venue")
        .not("venue", "is", null)
        .order("venue")

    if (error) {
        throw new Error("Failed to fetch venues")
    }

    const unique = [...new Set((data as { venue: string }[]).map((r) => r.venue))]
    return unique
}

export async function fetchInjuryLocations(): Promise<string[]> {
    const { data, error } = await supabase
        .from("session_injuries")
        .select("location")
        .order("location")

    if (error) {
        throw new Error("Failed to fetch injury locations")
    }

    const unique = [...new Set((data as { location: string }[]).map((r) => r.location))]
    return unique
}
