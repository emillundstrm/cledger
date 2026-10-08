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

import { createSession, fetchSessions, fetchVenues, fetchInjuryLocations } from "@/api/sessions"

const mockCreateSession = vi.mocked(createSession)
const mockFetchSessions = vi.mocked(fetchSessions)
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
    mockFetchSessions.mockResolvedValue([])
})

describe("NewSessionPage", () => {
    it("renders the Logga pass heading", () => {
        renderNewSessionPage()
        expect(screen.getByRole("heading", { level: 1, name: "Logga pass" })).toBeInTheDocument()
    })

    it("links back to the sessions list", () => {
        renderNewSessionPage()
        expect(screen.getByRole("link", { name: "← Pass" })).toHaveAttribute("href", "/sessions")
    })

    it("renders the session form", () => {
        renderNewSessionPage()
        expect(screen.getByText("Typ av pass")).toBeInTheDocument()
        expect(screen.getByText("Intensitet (RPE)")).toBeInTheDocument()
    })

    it("calls createSession on submit", async () => {
        const user = userEvent.setup()
        mockCreateSession.mockResolvedValue({
            id: "new-id",
            date: "2026-02-01",
            types: ["boulder"],
            intensity: 5,
            performance: "normal",
            durationMinutes: null,
            maxGrade: null,
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
        await user.click(screen.getByRole("button", { name: "Logga pass" }))

        expect(mockCreateSession).toHaveBeenCalledOnce()
        const submittedData = mockCreateSession.mock.calls[0][0]
        expect(submittedData.types).toContain("boulder")
    })

    it("starts from the last session's venue and an hour's duration", async () => {
        mockFetchSessions.mockResolvedValue([
            {
                id: "last",
                date: "2026-02-01",
                types: ["boulder"],
                intensity: 6,
                performance: "normal",
                durationMinutes: 120,
                maxGrade: "7A",
                venue: "Beta Bloc",
                injuries: [],
                notes: null,
                createdAt: "2026-02-01T10:00:00",
                updatedAt: "2026-02-01T10:00:00",
            },
        ])

        renderNewSessionPage()

        expect(await screen.findByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.getByLabelText("Längd (min)")).toHaveValue(60)
        // Only the venue carries over
        expect(screen.queryByLabelText("Maxgrad")).not.toBeInTheDocument()
    })

    it("shows error message when createSession fails", async () => {
        const user = userEvent.setup()
        mockCreateSession.mockRejectedValue(new Error("Server error"))

        renderNewSessionPage()

        await user.click(screen.getByText("Boulder"))
        await user.click(screen.getByRole("button", { name: "Logga pass" }))

        expect(
            await screen.findByRole("alert")
        ).toHaveTextContent("Kunde inte spara passet. Försök igen.")
    })
})
