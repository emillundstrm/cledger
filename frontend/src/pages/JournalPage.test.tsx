import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import JournalPage from "./JournalPage"
import type { JournalEntry, Session } from "@/api/types"
import { todayLocal } from "@/lib/dates"

vi.mock("@/api/journal")
vi.mock("@/api/sessions")
vi.mock("@/api/notes")

import { createJournalEntry, fetchJournalEntries, setJournalEntryArchived } from "@/api/journal"
import { fetchSessions } from "@/api/sessions"

const mockFetchEntries = vi.mocked(fetchJournalEntries)
const mockCreateEntry = vi.mocked(createJournalEntry)
const mockSetArchived = vi.mocked(setJournalEntryArchived)
const mockFetchSessions = vi.mocked(fetchSessions)

function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
    return {
        id: "j1",
        entryDate: "2026-10-01",
        content: "Trött efter passet.",
        tags: [],
        mood: null,
        energy: null,
        source: "user",
        archivedAt: null,
        createdAt: "2026-10-01T19:30:00Z",
        updatedAt: "2026-10-01T19:30:00Z",
        ...overrides,
    }
}

const entries: JournalEntry[] = [
    makeEntry({ id: "j3", entryDate: "2026-10-02", content: "Ny dag.", createdAt: "2026-10-02T07:00:00Z" }),
    makeEntry({ id: "j2", content: "Bra kväll.", energy: 4, createdAt: "2026-10-01T21:00:00Z" }),
    makeEntry({ id: "j1" }),
]

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/journal"]}>
                <JournalPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("JournalPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchEntries.mockResolvedValue(entries)
        mockFetchSessions.mockResolvedValue([
            { id: "s1", date: "2026-10-01" } as Session,
        ])
    })

    it("groups entries by day, several per day", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Bra kväll.")).toBeInTheDocument()
        })
        const days = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
        expect(days).toEqual(["fredag 2 oktober 2026", "torsdag 1 oktober 2026"])
        expect(screen.getByText("Trött efter passet.")).toBeInTheDocument()
        expect(screen.getByText("Energi 4/5")).toBeInTheDocument()
    })

    it("links days with a training session to it", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("link", { name: /Träningspass/ })).toHaveAttribute(
                "href",
                "/sessions/s1/edit",
            )
        })
    })

    it("writes an entry for today with only text required", async () => {
        mockCreateEntry.mockResolvedValue(makeEntry({ id: "j9" }))
        renderPage()

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Nytt inlägg"), "Lugn dag.")
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith({
                entryDate: todayLocal(),
                content: "Lugn dag.",
                tags: [],
                mood: null,
                energy: null,
            })
        })
    })

    it("records mood and energy when given", async () => {
        mockCreateEntry.mockResolvedValue(makeEntry({ id: "j9" }))
        renderPage()

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Nytt inlägg"), "Pigg.")
        await user.click(screen.getByRole("button", { name: "Humör, energi, taggar" }))
        await user.click(screen.getByRole("button", { name: "Humör 4" }))
        await user.click(screen.getByRole("button", { name: "Energi 5" }))
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(expect.objectContaining({ mood: 4, energy: 5 }))
        })
    })

    it("archives an entry", async () => {
        mockSetArchived.mockResolvedValue(makeEntry({ archivedAt: "2026-10-02T10:00:00Z" }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Ny dag.")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getAllByRole("button", { name: "Arkivera" })[0])

        await waitFor(() => {
            expect(mockSetArchived).toHaveBeenCalledWith("j3", true)
        })
    })

    it("shows a failed update by the entry it concerns", async () => {
        mockSetArchived.mockRejectedValue(new Error("nope"))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Ny dag.")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getAllByRole("button", { name: "Arkivera" })[0])

        const alert = await screen.findByRole("alert")
        expect(alert).toHaveTextContent("Kunde inte uppdatera inlägget.")
        expect(alert.closest("li")).toHaveTextContent("Ny dag.")
    })

    it("toggles archived entries with a chip", async () => {
        renderPage()
        const chip = screen.getByRole("button", { name: "Visa arkiverade" })
        expect(chip).toHaveAttribute("aria-pressed", "false")

        const user = userEvent.setup()
        await user.click(chip)

        expect(chip).toHaveAttribute("aria-pressed", "true")
        await waitFor(() => {
            expect(mockFetchEntries).toHaveBeenLastCalledWith(expect.any(String), true)
        })
    })

    it("offers a retry when the journal fails to load", async () => {
        mockFetchEntries.mockRejectedValueOnce(new Error("nope"))
        renderPage()

        const user = userEvent.setup()
        await user.click(await screen.findByRole("button", { name: "Försök igen" }))

        await waitFor(() => {
            expect(screen.getByText("Bra kväll.")).toBeInTheDocument()
        })
    })
})
