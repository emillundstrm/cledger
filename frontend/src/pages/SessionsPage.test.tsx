import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import SessionsPage from "@/pages/SessionsPage"
import type { Session } from "@/api/types"

vi.mock("@/api/sessions", () => ({
    fetchSessions: vi.fn(),
}))

import { fetchSessions } from "@/api/sessions"

const mockFetchSessions = vi.mocked(fetchSessions)

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function renderSessionsPage() {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/sessions"]}>
                <SessionsPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

const mockSessions: Session[] = [
    {
        id: "1",
        date: "2026-01-28",
        types: ["boulder", "hangboard"],
        intensity: "hard",
        performance: "strong",
        productivity: "high",
        durationMinutes: 90,
        notes: "Good session",
        maxGrade: "V8",
        venue: "Beta Bloc",
        injuries: [],
        createdAt: "2026-01-28T10:00:00",
        updatedAt: "2026-01-28T10:00:00",
    },
    {
        id: "2",
        date: "2026-01-26",
        types: ["routes"],
        intensity: "moderate",
        performance: "normal",
        productivity: "normal",
        durationMinutes: 120,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [{ id: "i1", location: "finger", note: null }],
        createdAt: "2026-01-26T10:00:00",
        updatedAt: "2026-01-26T10:00:00",
    },
    {
        id: "3",
        date: "2026-01-20",
        types: ["strength"],
        intensity: "easy",
        performance: "weak",
        productivity: "low",
        durationMinutes: 60,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [],
        createdAt: "2026-01-20T10:00:00",
        updatedAt: "2026-01-20T10:00:00",
    },
]

beforeEach(() => {
    vi.resetAllMocks()
})

describe("SessionsPage", () => {
    it("renders the Sessions heading", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(screen.getByText("Sessions")).toBeInTheDocument()
    })

    it("renders a Log Session button linking to /sessions/new", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        const link = screen.getByRole("link", { name: "Log Session" })
        expect(link).toHaveAttribute("href", "/sessions/new")
    })

    it("shows loading state initially", () => {
        mockFetchSessions.mockReturnValue(new Promise(() => {}))
        renderSessionsPage()
        expect(screen.getByText("Loading sessions...")).toBeInTheDocument()
    })

    it("shows empty message when no sessions exist", async () => {
        mockFetchSessions.mockResolvedValue([])
        renderSessionsPage()
        expect(
            await screen.findByText(/No sessions yet/)
        ).toBeInTheDocument()
    })

    it("renders sessions grouped by week", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        // Wait for sessions to load - check for session type badges
        expect(await screen.findByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Hangboard")).toBeInTheDocument()
        expect(screen.getByText("Routes")).toBeInTheDocument()
        expect(screen.getByText("Strength")).toBeInTheDocument()
    })

    it("shows intensity, performance, and productivity for each session", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        expect(await screen.findByText("Hard")).toBeInTheDocument()
        expect(screen.getByText("Strong")).toBeInTheDocument()
        expect(screen.getByText("High")).toBeInTheDocument()
    })

    it("renders session rows as links to edit page", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        const editLinks = screen.getAllByRole("link").filter((link) =>
            link.getAttribute("href")?.includes("/edit")
        )
        expect(editLinks.length).toBe(3)
        expect(editLinks[0]).toHaveAttribute("href", "/sessions/1/edit")
    })

    it("shows error message when fetch fails", async () => {
        mockFetchSessions.mockRejectedValue(new Error("Network error"))
        renderSessionsPage()
        expect(
            await screen.findByText("Failed to load sessions.")
        ).toBeInTheDocument()
    })

    it("shows venue when present on a session", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        expect(await screen.findByText("@ Beta Bloc")).toBeInTheDocument()
    })

    it("shows week separators for sessions in different weeks", async () => {
        mockFetchSessions.mockResolvedValue(mockSessions)
        renderSessionsPage()

        await screen.findByText("Boulder")

        // Sessions from Jan 26 and Jan 28 are in the same week (Mon Jan 26 – Sun Feb 1)
        // Session from Jan 20 is in a different week (Mon Jan 19 – Sun Jan 25)
        const headings = screen.getAllByRole("heading", { level: 3 })
        expect(headings.length).toBe(2)
    })
})
