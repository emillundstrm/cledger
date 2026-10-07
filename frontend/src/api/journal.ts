import { supabase } from "@/lib/supabase"
import type { JournalEntry, JournalEntryRequest, JournalEntryRow } from "./types"
import { mapJournalEntryRow } from "./types"

/** Entries on or after `from` (YYYY-MM-DD), newest day first, and within a day newest first. */
export async function fetchJournalEntries(from: string, includeArchived: boolean): Promise<JournalEntry[]> {
    let query = supabase
        .from("journal_entries")
        .select("*")
        .gte("entry_date", from)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })

    if (!includeArchived) {
        query = query.is("archived_at", null)
    }

    const { data, error } = await query

    if (error) {
        throw new Error("Failed to fetch journal entries")
    }

    return (data as JournalEntryRow[]).map(mapJournalEntryRow)
}

/** The entry, or null when it does not exist (or RLS hides it). Throws on other errors. */
export async function fetchJournalEntry(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    if (error) {
        throw new Error("Failed to fetch journal entry")
    }

    return data ? mapJournalEntryRow(data as JournalEntryRow) : null
}

export async function createJournalEntry(data: JournalEntryRequest): Promise<JournalEntry> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("journal_entries")
        .insert({
            user_id: user.id,
            entry_date: data.entryDate,
            content: data.content,
            tags: data.tags,
            mood: data.mood,
            energy: data.energy,
            source: "user",
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to save journal entry")
    }

    return mapJournalEntryRow(row as JournalEntryRow)
}

export async function updateJournalEntry(id: string, data: JournalEntryRequest): Promise<JournalEntry> {
    return patchEntry(id, {
        entry_date: data.entryDate,
        content: data.content,
        tags: data.tags,
        mood: data.mood,
        energy: data.energy,
    })
}

export async function setJournalEntryArchived(id: string, archived: boolean): Promise<JournalEntry> {
    return patchEntry(id, { archived_at: archived ? new Date().toISOString() : null })
}

export async function deleteJournalEntry(id: string): Promise<void> {
    const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete journal entry")
    }
}

async function patchEntry(id: string, patch: Record<string, unknown>): Promise<JournalEntry> {
    const { data: row, error } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error("Failed to update journal entry")
    }

    return mapJournalEntryRow(row as JournalEntryRow)
}
