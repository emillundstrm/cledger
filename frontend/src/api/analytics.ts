import type { Analytics } from "./types"

export async function fetchAnalytics(): Promise<Analytics> {
    const response = await fetch("/api/analytics")
    if (!response.ok) {
        throw new Error("Failed to fetch analytics")
    }
    return response.json()
}
