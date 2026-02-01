import type { Session, SessionRequest } from "./types"

export async function fetchSessions(): Promise<Session[]> {
    const response = await fetch("/api/sessions")
    if (!response.ok) {
        throw new Error("Failed to fetch sessions")
    }
    return response.json()
}

export async function createSession(data: SessionRequest): Promise<Session> {
    const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to create session")
    }
    return response.json()
}
