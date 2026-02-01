import type { Session, SessionRequest } from "./types"

export async function fetchSessions(): Promise<Session[]> {
    const response = await fetch("/api/sessions")
    if (!response.ok) {
        throw new Error("Failed to fetch sessions")
    }
    return response.json()
}

export async function fetchSession(id: string): Promise<Session> {
    const response = await fetch(`/api/sessions/${id}`)
    if (!response.ok) {
        throw new Error("Failed to fetch session")
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

export async function updateSession(id: string, data: SessionRequest): Promise<Session> {
    const response = await fetch(`/api/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    if (!response.ok) {
        throw new Error("Failed to update session")
    }
    return response.json()
}

export async function deleteSession(id: string): Promise<void> {
    const response = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
    })
    if (!response.ok) {
        throw new Error("Failed to delete session")
    }
}
