import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import NewSessionPage from "@/pages/NewSessionPage"

vi.mock("@/api/sessions", () => ({
    fetchSessions: vi.fn(),
    createSession: vi.fn(),
    fetchVenues: vi.fn(),
    fetchInjuryLocations: vi.fn(),
}))

import { createSession, fetchVenues, fetchInjuryLocations } from "@/api/sessions"

const mockCreateSession = vi.mocked(createSession)
const mockFetchVenues = vi.mocked(fetchVenues)
const mockFetchInjuryLocations = vi.mocked(fetchInjuryLocations)

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })
}

function renderNewSessionPage() {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/sessions/new"]}>
                <NewSessionPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    mockFetchVenues.mockResolvedValue([])
    mockFetchInjuryLocations.mockResolvedValue([])
})

describe("NewSessionPage", () => {
    it("renders the Log Session heading", () => {
        renderNewSessionPage()
        expect(screen.getByText("Log Session", { selector: "h2" })).toBeInTheDocument()
    })

    it("renders the session form", () => {
        renderNewSessionPage()
        expect(screen.getByText("Session Types")).toBeInTheDocument()
        expect(screen.getByText("Intensity")).toBeInTheDocument()
    })

    it("calls createSession on submit", async () => {
        const user = userEvent.setup()
        mockCreateSession.mockResolvedValue({
            id: "new-id",
            date: "2026-02-01",
            types: ["boulder"],
            intensity: "moderate",
            performance: "normal",
            productivity: "normal",
            durationMinutes: null,
            maxGrade: null,
            hardAttempts: null,
            venue: null,
            injuries: [],
            notes: null,
            createdAt: "2026-02-01T10:00:00",
            updatedAt: "2026-02-01T10:00:00",
        })

        renderNewSessionPage()

        // Select a session type
        await user.click(screen.getByText("Boulder"))

        // Submit the form
        await user.click(screen.getByRole("button", { name: "Log Session" }))

        expect(mockCreateSession).toHaveBeenCalledOnce()
        const submittedData = mockCreateSession.mock.calls[0][0]
        expect(submittedData.types).toContain("boulder")
    })

    it("shows error message when createSession fails", async () => {
        const user = userEvent.setup()
        mockCreateSession.mockRejectedValue(new Error("Server error"))

        renderNewSessionPage()

        await user.click(screen.getByText("Boulder"))
        await user.click(screen.getByRole("button", { name: "Log Session" }))

        expect(
            await screen.findByText("Failed to save session. Please try again.")
        ).toBeInTheDocument()
    })
})
