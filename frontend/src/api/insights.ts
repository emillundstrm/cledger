import type { Insight, InsightRequest } from "./types"

export async function fetchInsights(): Promise<Insight[]> {
    const response = await fetch("/api/insights")
    if (!response.ok) {
        throw new Error("Failed to fetch insights")
    }
    return response.json()
}

export async function fetchInsight(id: string): Promise<Insight> {
    const response = await fetch(`/api/insights/${id}`)
    if (!response.ok) {
        throw new Error("Failed to fetch insight")
    }
    return response.json()
}

export async function createInsight(data: InsightRequest): Promise<Insight> {
    const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to create insight")
    }
    return response.json()
}

export async function updateInsight(id: string, data: InsightRequest): Promise<Insight> {
    const response = await fetch(`/api/insights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to update insight")
    }
    return response.json()
}

export async function deleteInsight(id: string): Promise<void> {
    const response = await fetch(`/api/insights/${id}`, {
        method: "DELETE",
    })
    if (!response.ok) {
        throw new Error("Failed to delete insight")
    }
}
