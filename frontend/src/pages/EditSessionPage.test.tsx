import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import EditSessionPage from "@/pages/EditSessionPage"
import type { Session } from "@/api/types"

vi.mock("@/api/sessions", () => ({
    fetchSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    fetchVenues: vi.fn(),
    fetchInjuryLocations: vi.fn(),
}))

import { fetchSession, updateSession, deleteSession, fetchVenues, fetchInjuryLocations } from "@/api/sessions"

const mockFetchSession = vi.mocked(fetchSession)
const mockUpdateSession = vi.mocked(updateSession)
const mockDeleteSession = vi.mocked(deleteSession)
const mockFetchVenues = vi.mocked(fetchVenues)
const mockFetchInjuryLocations = vi.mocked(fetchInjuryLocations)

const mockSession: Session = {
    id: "abc-123",
    date: "2026-01-15",
    types: ["boulder", "hangboard"],
    intensity: 9,
    performance: "strong",
    durationMinutes: 90,
    maxGrade: "7A",
    venue: "Beta Bloc",
    injuries: [{ id: "inj-1", location: "finger", note: null, severity: 2 }],
    notes: "Great session",
    createdAt: "2026-01-15T10:00:00",
    updatedAt: "2026-01-15T10:00:00",
}

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    })
}

function renderEditSessionPage(sessionId = "abc-123") {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/sessions/${sessionId}/edit`]}>
                <Routes>
                    <Route path="/sessions/:id/edit" element={<EditSessionPage />} />
                    <Route path="/sessions" element={<div>Sessions List</div>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    mockFetchVenues.mockResolvedValue([])
    mockFetchInjuryLocations.mockResolvedValue([])
})

describe("EditSessionPage", () => {
    it("shows loading state while fetching session", () => {
        mockFetchSession.mockReturnValue(new Promise(() => {}))
        renderEditSessionPage()
        expect(screen.getByText("Laddar pass…")).toBeInTheDocument()
    })

    it("shows error state when fetch fails", async () => {
        mockFetchSession.mockRejectedValue(new Error("Not found"))
        renderEditSessionPage()
        expect(await screen.findByText("Kunde inte ladda passet.")).toBeInTheDocument()
    })

    it("retries loading the session when Försök igen is clicked", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockRejectedValueOnce(new Error("Network error"))
        mockFetchSession.mockResolvedValueOnce(mockSession)
        renderEditSessionPage()

        await user.click(await screen.findByRole("button", { name: "Försök igen" }))

        expect(await screen.findByRole("button", { name: "Spara" })).toBeInTheDocument()
        expect(mockFetchSession).toHaveBeenCalledTimes(2)
    })

    it("links back to the sessions list", async () => {
        mockFetchSession.mockResolvedValue(mockSession)
        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })
        expect(screen.getByRole("link", { name: "← Pass" })).toHaveAttribute("href", "/sessions")
    })

    it("shows an error when delete fails", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)
        mockDeleteSession.mockRejectedValue(new Error("Server error"))
        renderEditSessionPage()

        await user.click(await screen.findByRole("button", { name: "Ta bort" }))
        const deleteButtons = screen.getAllByRole("button", { name: "Ta bort" })
        await user.click(deleteButtons[deleteButtons.length - 1])

        expect(await screen.findByText("Kunde inte ta bort passet. Försök igen.")).toBeInTheDocument()
    })

    it("renders the edit form pre-filled with session data", async () => {
        mockFetchSession.mockResolvedValue(mockSession)
        renderEditSessionPage()

        expect(await screen.findByRole("button", { name: "Spara" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { level: 1, name: "Redigera pass" })).toBeInTheDocument()
        expect(screen.getByText("Spara")).toBeInTheDocument()
        expect(screen.getByDisplayValue("90")).toBeInTheDocument()
        expect(screen.getByDisplayValue("7A")).toBeInTheDocument()
        expect(screen.getByDisplayValue("Great session")).toBeInTheDocument()
    })

    it("renders the delete button", async () => {
        mockFetchSession.mockResolvedValue(mockSession)
        renderEditSessionPage()

        expect(await screen.findByRole("button", { name: "Ta bort" })).toBeInTheDocument()
    })

    it("calls updateSession on submit", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)
        mockUpdateSession.mockResolvedValue({ ...mockSession, notes: "Updated" })

        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })

        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(mockUpdateSession).toHaveBeenCalledOnce()
        expect(mockUpdateSession.mock.calls[0][0]).toBe("abc-123")
    })

    it("shows error when update fails", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)
        mockUpdateSession.mockRejectedValue(new Error("Server error"))

        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })

        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(
            await screen.findByText("Kunde inte spara passet. Försök igen.")
        ).toBeInTheDocument()
    })

    it("shows delete confirmation dialog", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)

        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })

        await user.click(screen.getByRole("button", { name: "Ta bort" }))

        expect(await screen.findByText("Ta bort passet?")).toBeInTheDocument()
        expect(screen.getByText(/Det går inte att ångra/)).toBeInTheDocument()
    })

    it("calls deleteSession when delete is confirmed", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)
        mockDeleteSession.mockResolvedValue(undefined)

        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })

        // Open dialog
        await user.click(screen.getByRole("button", { name: "Ta bort" }))

        // There are two "Ta bort" buttons - the trigger and the confirm. Get the one in the dialog.
        const deleteButtons = screen.getAllByRole("button", { name: "Ta bort" })
        await user.click(deleteButtons[deleteButtons.length - 1])

        await waitFor(() => {
            expect(mockDeleteSession).toHaveBeenCalledWith("abc-123")
        })
    })

    it("navigates back on cancel", async () => {
        const user = userEvent.setup()
        mockFetchSession.mockResolvedValue(mockSession)

        renderEditSessionPage()

        await screen.findByRole("button", { name: "Spara" })

        await user.click(screen.getByRole("button", { name: "Avbryt" }))

        expect(await screen.findByText("Sessions List")).toBeInTheDocument()
    })
})
