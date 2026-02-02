import {
    SessionResponse,
    SessionRequest,
    AnalyticsResponse,
} from "./types.js";

export class CledgerApi {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    private async request<T>(path: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `API request failed: ${response.status} ${response.statusText} - ${body}`
            );
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json() as Promise<T>;
    }

    async listSessions(): Promise<SessionResponse[]> {
        return this.request<SessionResponse[]>("/api/sessions");
    }

    async getSession(id: string): Promise<SessionResponse> {
        return this.request<SessionResponse>(`/api/sessions/${encodeURIComponent(id)}`);
    }

    async createSession(session: SessionRequest): Promise<SessionResponse> {
        return this.request<SessionResponse>("/api/sessions", {
            method: "POST",
            body: JSON.stringify(session),
        });
    }

    async updateSession(id: string, session: SessionRequest): Promise<SessionResponse> {
        return this.request<SessionResponse>(`/api/sessions/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify(session),
        });
    }

    async deleteSession(id: string): Promise<void> {
        return this.request<void>(`/api/sessions/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });
    }

    async getAnalytics(): Promise<AnalyticsResponse> {
        return this.request<AnalyticsResponse>("/api/analytics");
    }

    async getInjuryLocations(): Promise<string[]> {
        return this.request<string[]>("/api/injury-locations");
    }

    async getVenues(): Promise<string[]> {
        return this.request<string[]>("/api/venues");
    }
}
