import { supabase } from "@/lib/supabase"
import type { Insight, InsightRequest, InsightRow } from "./types"
import { mapInsightRow } from "./types"

export async function fetchInsights(): Promise<Insight[]> {
    const { data, error } = await supabase
        .from("coach_insights")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })

    if (error) {
        throw new Error("Failed to fetch insights")
    }

    return (data as InsightRow[]).map(mapInsightRow)
}

export async function fetchInsight(id: string): Promise<Insight> {
    const { data, error } = await supabase
        .from("coach_insights")
        .select("*")
        .eq("id", id)
        .single()

    if (error) {
        throw new Error("Failed to fetch insight")
    }

    return mapInsightRow(data as InsightRow)
}

export async function createInsight(data: InsightRequest): Promise<Insight> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Not authenticated")
    }

    const { data: row, error } = await supabase
        .from("coach_insights")
        .insert({
            user_id: user.id,
            content: data.content,
            pinned: data.pinned,
        })
        .select()
        .single()

    if (error) {
        throw new Error("Failed to create insight")
    }

    return mapInsightRow(row as InsightRow)
}

export async function updateInsight(id: string, data: InsightRequest): Promise<Insight> {
    const { data: row, error } = await supabase
        .from("coach_insights")
        .update({
            content: data.content,
            pinned: data.pinned,
        })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error("Failed to update insight")
    }

    return mapInsightRow(row as InsightRow)
}

export async function deleteInsight(id: string): Promise<void> {
    const { error } = await supabase
        .from("coach_insights")
        .delete()
        .eq("id", id)

    if (error) {
        throw new Error("Failed to delete insight")
    }
}
