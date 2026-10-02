import { supabase } from "@/lib/supabase"
import type { SearchKind, SearchResult } from "./types"

export async function search(
    query: string,
    kinds: SearchKind[] | null = null,
    includeArchived = false,
): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc("search", {
        p_query: query,
        p_kinds: kinds,
        p_include_archived: includeArchived,
    })

    if (error) {
        throw new Error("Search failed")
    }

    // Column names are single words, so rows need no snake_case mapping.
    return data as SearchResult[]
}
