import { render, screen, waitFor, within } from "@testing-library/react"
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

import {
    createJournalEntry,
    deleteJournalEntry,
    fetchJournalEntries,
    setJournalEntryArchived,
    updateJournalEntry,
} from "@/api/journal"
import { fetchSessions } from "@/api/sessions"

const mockFetchEntries = vi.mocked(fetchJournalEntries)
const mockCreateEntry = vi.mocked(createJournalEntry)
const mockSetArchived = vi.mocked(setJournalEntryArchived)
const mockUpdateEntry = vi.mocked(updateJournalEntry)
const mockDeleteEntry = vi.mocked(deleteJournalEntry)
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
        await user.click(screen.getByRole("radio", { name: "Humör 4 av 5" }))
        await user.click(screen.getByRole("radio", { name: "Energi 5 av 5" }))
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(expect.objectContaining({ mood: 4, energy: 5 }))
        })
    })

    it("moves through mood with one tab stop and arrow keys", async () => {
        mockCreateEntry.mockResolvedValue(makeEntry({ id: "j9" }))
        renderPage()

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Nytt inlägg"), "Pigg.")
        await user.click(screen.getByRole("button", { name: "Humör, energi, taggar" }))

        // With nothing chosen, tabbing in lands on 1; the arrows change the value
        await user.tab()
        expect(screen.getByRole("radio", { name: "Humör 1 av 5" })).toHaveFocus()
        expect(screen.getByRole("radio", { name: "Humör 1 av 5" })).not.toBeChecked()
        await user.keyboard("{ArrowRight}{ArrowRight}")
        expect(screen.getByRole("radio", { name: "Humör 3 av 5" })).toHaveFocus()
        expect(screen.getByRole("radio", { name: "Humör 3 av 5" })).toBeChecked()

        // The next tab leaves the scale for energy, not the next mood pill
        await user.tab()
        expect(screen.getByRole("radio", { name: "Energi 1 av 5" })).toHaveFocus()
        await user.keyboard("{ArrowLeft}")
        expect(screen.getByRole("radio", { name: "Energi 5 av 5" })).toBeChecked()
        await user.keyboard("{Delete}")
        expect(screen.getByRole("radio", { name: "Energi 5 av 5" })).not.toBeChecked()

        // Back into mood, the tab stop is the chosen value
        await user.tab({ shift: true })
        expect(screen.getByRole("radio", { name: "Humör 3 av 5" })).toHaveFocus()

        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))
        await waitFor(() => {
            expect(mockCreateEntry).toHaveBeenCalledWith(expect.objectContaining({ mood: 3, energy: null }))
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

    it("keeps the text when saving a new entry fails", async () => {
        mockCreateEntry.mockRejectedValueOnce(new Error("offline"))
        renderPage()

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Nytt inlägg"), "Lugn dag.")
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Kunde inte spara inlägget.")
        expect(screen.getByLabelText("Nytt inlägg")).toHaveValue("Lugn dag.")
    })

    it("clears the composer once the entry is saved", async () => {
        mockCreateEntry.mockResolvedValue(makeEntry({ id: "j9" }))
        renderPage()

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Nytt inlägg"), "Lugn dag.")
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        await waitFor(() => {
            expect(screen.getByLabelText("Nytt inlägg")).toHaveValue("")
        })
    })

    it("says text is needed instead of saving an empty entry", async () => {
        renderPage()
        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Spara inlägg" }))

        expect(screen.getByLabelText("Nytt inlägg")).toHaveAccessibleDescription("Skriv något innan du sparar.")
        expect(mockCreateEntry).not.toHaveBeenCalled()
    })

    it("keeps the editor open with the changes when saving an edit fails", async () => {
        mockUpdateEntry.mockRejectedValueOnce(new Error("offline"))
        renderPage()
        const user = userEvent.setup()
        await user.click((await screen.findAllByRole("button", { name: "Redigera" }))[0])

        const field = screen.getByLabelText("Inlägg")
        await user.clear(field)
        await user.type(field, "Ändrad dag.")
        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Kunde inte uppdatera inlägget.")
        expect(screen.getByLabelText("Inlägg")).toHaveValue("Ändrad dag.")
    })

    it("asks before deleting an archived entry for good", async () => {
        mockFetchEntries.mockResolvedValue([makeEntry({ id: "j1", archivedAt: "2026-10-03T10:00:00Z" })])
        mockDeleteEntry.mockResolvedValue(undefined)
        renderPage()
        const user = userEvent.setup()

        await user.click(await screen.findByRole("button", { name: "Ta bort" }))
        expect(mockDeleteEntry).not.toHaveBeenCalled()
        expect(screen.getByRole("alertdialog")).toHaveTextContent("Det går inte att ångra.")

        await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Ta bort" }))
        await waitFor(() => {
            expect(mockDeleteEntry).toHaveBeenCalled()
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
