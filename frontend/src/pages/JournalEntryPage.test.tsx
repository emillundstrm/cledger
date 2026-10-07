import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import JournalEntryPage from "./JournalEntryPage"
import type { JournalEntry } from "@/api/types"

vi.mock("@/api/journal")
vi.mock("@/api/notes")

import { fetchJournalEntry } from "@/api/journal"

const mockFetchEntry = vi.mocked(fetchJournalEntry)
const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"

const entry: JournalEntry = {
    id: ID,
    entryDate: "2026-10-01",
    content: "Trött efter passet.",
    tags: [],
    mood: null,
    energy: null,
    source: "user",
    archivedAt: null,
    createdAt: "2026-10-01T19:30:00Z",
    updatedAt: "2026-10-01T19:30:00Z",
}

function renderPage(id: string) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/journal/${id}`]}>
                <Routes>
                    <Route path="/journal/:id" element={<JournalEntryPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("JournalEntryPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchEntry.mockResolvedValue(entry)
    })

    it("titles the page with the entry's day", async () => {
        renderPage(ID)
        expect(await screen.findByRole("heading", { level: 1, name: "torsdag 1 oktober 2026" })).toBeInTheDocument()
        expect(screen.getByText("Trött efter passet.")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "← Dagbok" })).toHaveAttribute("href", "/journal")
    })

    it("treats an id that can't exist as not found, not an error", () => {
        renderPage("finns-inte")
        expect(screen.getByText(/Inlägget finns inte/)).toBeInTheDocument()
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
        expect(mockFetchEntry).not.toHaveBeenCalled()
    })

    it("treats a deleted entry as not found, not an error", async () => {
        mockFetchEntry.mockResolvedValue(null)
        renderPage(ID)
        expect(await screen.findByText(/Inlägget finns inte/)).toBeInTheDocument()
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("offers a retry when the entry fails to load", async () => {
        mockFetchEntry.mockRejectedValueOnce(new Error("nope"))
        renderPage(ID)

        const user = userEvent.setup()
        await user.click(await screen.findByRole("button", { name: "Försök igen" }))

        await waitFor(() => {
            expect(screen.getByText("Trött efter passet.")).toBeInTheDocument()
        })
    })
})
