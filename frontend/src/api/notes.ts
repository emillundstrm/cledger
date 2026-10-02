import { supabase } from "@/lib/supabase"
import type { AppLink } from "@/lib/links"
import type { Note, NoteRequest, NoteRow, TagCount } from "./types"
import { mapNoteRow } from "./types"

export async function fetchNotes(includeArchived: boolean): Promise<Note[]> {
    let query = supabase
        .from("notes")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })

    if (!includeArchived) {
        query = query.is("archived_at", null)
    }

    const { data, error } = await query

    if (error) {
        throw new Error("Failed to fetch notes")
    }

    return (data as NoteRow[]).map(mapNoteRow)
}

export async function fetchNote(id: string): Promise<Note> {
    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single()

    if (error) {
        throw new Error("Failed to fetch note")
    }

    return mapNoteRow(data as NoteRow)
}

export async function createNote(data: NoteRequest): Promise<Note> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("notes")
        .insert({
            user_id: user.id,
            title: data.title,
            content: data.content,
            tags: data.tags,
            pinned: data.pinned,
            source: "user",
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to create note")
    }

    return mapNoteRow(row as NoteRow)
}

export async function updateNote(id: string, data: NoteRequest): Promise<Note> {
    const { data: row, error } = await supabase
        .from("notes")
        .update({
            title: data.title,
            content: data.content,
            tags: data.tags,
            pinned: data.pinned,
        })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error("Failed to update note")
    }

    return mapNoteRow(row as NoteRow)
}

export async function setNoteArchived(id: string, archived: boolean): Promise<Note> {
    const { data: row, error } = await supabase
        .from("notes")
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error(archived ? "Failed to archive note" : "Failed to restore note")
    }

    return mapNoteRow(row as NoteRow)
}

export async function deleteNote(id: string): Promise<void> {
    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete note")
    }
}

export async function fetchNoteTags(): Promise<TagCount[]> {
    const { data, error } = await supabase.rpc("note_tags")

    if (error) {
        throw new Error("Failed to fetch tags")
    }

    return (data as { tag: string; count: number }[]).map((row) => ({
        tag: row.tag,
        count: Number(row.count),
    }))
}

/** Notes whose content links to the given note. */
export async function fetchBacklinks(id: string): Promise<Note[]> {
    const { data, error } = await supabase
        .from("notes")
        .select("*")
        .ilike("content", `%/notes/${id}%`)
        .neq("id", id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })

    if (error) {
        throw new Error("Failed to fetch backlinks")
    }

    return (data as NoteRow[]).map(mapNoteRow)
}

/**
 * Display titles for linked items, keyed `kind:id`. Items that no longer
 * exist are absent from the map.
 */
export async function resolveLinks(links: AppLink[]): Promise<Map<string, string>> {
    const noteIds = links.filter((l) => l.kind === "note").map((l) => l.id)
    const sessionIds = links.filter((l) => l.kind === "session").map((l) => l.id)
    const titles = new Map<string, string>()

    const [notesResult, sessionsResult] = await Promise.all([
        noteIds.length > 0
            ? supabase.from("notes").select("id, title").in("id", noteIds)
            : Promise.resolve({ data: [], error: null }),
        sessionIds.length > 0
            ? supabase.from("sessions").select("id, date").in("id", sessionIds)
            : Promise.resolve({ data: [], error: null }),
    ])

    if (notesResult.error || sessionsResult.error) {
        throw new Error("Failed to resolve links")
    }

    for (const row of notesResult.data as { id: string; title: string | null }[]) {
        titles.set(`note:${row.id}`, row.title ?? "Untitled note")
    }
    for (const row of sessionsResult.data as { id: string; date: string }[]) {
        titles.set(`session:${row.id}`, `Session ${row.date}`)
    }

    return titles
}
