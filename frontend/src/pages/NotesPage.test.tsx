import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import NotesPage from "./NotesPage"
import NewNotePage from "./NewNotePage"
import type { Note } from "@/api/types"

vi.mock("@/api/notes")
vi.mock("@/api/search")

import { createNote, fetchNotes, fetchNoteTags, updateNoteContent } from "@/api/notes"
import { search } from "@/api/search"

const mockFetchNotes = vi.mocked(fetchNotes)
const mockFetchNoteTags = vi.mocked(fetchNoteTags)
const mockCreateNote = vi.mocked(createNote)
const mockSearch = vi.mocked(search)
const mockUpdateNoteContent = vi.mocked(updateNoteContent)

function makeNote(overrides: Partial<Note>): Note {
    return {
        id: "n1",
        title: "Axellärdomar",
        content: "Vänster axeln blir irriterad av kompression.",
        tags: ["träning"],
        pinned: false,
        source: "assistant",
        archivedAt: null,
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
        ...overrides,
    }
}

const sampleNotes: Note[] = [
    makeNote({ id: "n1", pinned: true }),
    makeNote({ id: "n2", title: "Sömn", content: "Dålig sömn före tävling.", tags: ["hälsa"], source: "user" }),
    makeNote({ id: "n3", title: "Korta avstämningar", content: "Håll check-ins korta.", tags: ["assistant"] }),
]

function renderAt(path: string) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/notes/new" element={<NewNotePage />} />
                    <Route path="/notes/:id" element={<p>Note page</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("NotesPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchNotes.mockResolvedValue(sampleNotes)
        mockFetchNoteTags.mockResolvedValue([
            { tag: "träning", count: 1 },
            { tag: "hälsa", count: 1 },
            { tag: "assistant", count: 1 },
        ])
    })

    it("shows error state", async () => {
        mockFetchNotes.mockRejectedValue(new Error("fail"))
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText("Kunde inte ladda anteckningar.")).toBeInTheDocument()
        })
    })

    it("shows empty state", async () => {
        mockFetchNotes.mockResolvedValue([])
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText(/Inga anteckningar än/)).toBeInTheDocument()
        })
    })

    it("keeps pinned notes on top and rules in a collapsed section", async () => {
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText("Axellärdomar")).toBeInTheDocument()
        })
        const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
        expect(titles()).toEqual(["Axellärdomar", "Sömn"])
        expect(screen.getByText("Fäst")).toBeInTheDocument()

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /Regler för assistenten \(1\)/ }))
        expect(titles()).toEqual(["Axellärdomar", "Sömn", "Korta avstämningar"])
        expect(screen.getByText("Regel")).toBeInTheDocument()
    })

    it("shows rules in the list when filtering on the rule tag", async () => {
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText("Axellärdomar")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /^assistant/ }))
        expect(screen.getByText("Korta avstämningar")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /Regler för assistenten/ })).not.toBeInTheDocument()
    })

    it("expands a note in place, and all notes at once", async () => {
        renderAt("/notes")
        const user = userEvent.setup()
        await user.click(await screen.findByRole("button", { name: "Sömn" }))

        expect(screen.getByRole("button", { name: "Sömn" })).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByRole("link", { name: "Öppna anteckning →" })).toHaveAttribute("href", "/notes/n2")
        expect(screen.queryByText("Note page")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Fäll ut alla" }))
        expect(screen.getAllByRole("link", { name: "Öppna anteckning →" })).toHaveLength(2)

        await user.click(screen.getByRole("button", { name: "Fäll ihop alla" }))
        expect(screen.queryByRole("link", { name: "Öppna anteckning →" })).not.toBeInTheDocument()
    })

    describe("with a shopping list", () => {
        const shopping = makeNote({
            id: "n4",
            title: "Inköp",
            content: "Till helgen.\n\n- [ ] kaffefilter\n- [ ] kaffe\n- [x] mjölk",
            tags: [],
        })

        beforeEach(() => {
            // Behaves like the server: a refetch returns what was saved.
            let stored = shopping
            mockFetchNotes.mockImplementation(async () => [stored, ...sampleNotes])
            mockUpdateNoteContent.mockImplementation(async (_id, content) => {
                stored = { ...stored, content }
                return stored
            })
        })

        it("shows open items collapsed and ticks them without leaving the list", async () => {
            renderAt("/notes")
            const user = userEvent.setup()
            await user.click(await screen.findByRole("checkbox", { name: "kaffefilter" }))

            expect(mockUpdateNoteContent).toHaveBeenCalledWith(
                "n4",
                "Till helgen.\n\n- [ ] kaffe\n- [x] mjölk\n- [x] kaffefilter",
            )
            await waitFor(() => {
                expect(screen.queryByRole("checkbox", { name: "kaffefilter" })).not.toBeInTheDocument()
            })
            expect(screen.getByRole("button", { name: "+ 2 klara" })).toBeInTheDocument()
            expect(screen.queryByText("Till helgen.")).not.toBeInTheDocument()
        })

        it("adds an item from the list", async () => {
            renderAt("/notes")
            const user = userEvent.setup()
            await user.type(await screen.findByLabelText("Ny punkt i Inköp"), "bröd{Enter}")

            expect(mockUpdateNoteContent).toHaveBeenCalledWith(
                "n4",
                "Till helgen.\n\n- [ ] kaffefilter\n- [ ] kaffe\n- [ ] bröd\n- [x] mjölk",
            )
        })

        it("filters to lists with open items", async () => {
            renderAt("/notes")
            const user = userEvent.setup()
            await user.click(await screen.findByRole("button", { name: /^Listor/ }))

            expect(screen.getByText("Inköp")).toBeInTheDocument()
            expect(screen.queryByText("Sömn")).not.toBeInTheDocument()
        })
    })

    it("filters by tag", async () => {
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText("Sömn")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: /hälsa/ }))

        expect(screen.getByText("Sömn")).toBeInTheDocument()
        expect(screen.queryByText("Axellärdomar")).not.toBeInTheDocument()
    })

    it("searches notes", async () => {
        mockSearch.mockResolvedValue([
            {
                kind: "note",
                id: "n2",
                title: "Sömn",
                snippet: "Dålig sömn före tävling.",
                date: "2026-09-01T10:00:00Z",
                tags: ["hälsa"],
                score: 0.8,
            },
        ])
        renderAt("/notes")

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Sök anteckningar"), "sömnen")

        await waitFor(() => {
            expect(mockSearch).toHaveBeenCalledWith("sömnen", ["note"], false)
        })
        await waitFor(() => {
            expect(screen.queryByText("Axellärdomar")).not.toBeInTheDocument()
        })
        expect(screen.getByText("Sömn")).toBeInTheDocument()
    })

    it("includes archived notes when asked", async () => {
        renderAt("/notes")
        await waitFor(() => {
            expect(mockFetchNotes).toHaveBeenCalledWith(false)
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Arkiverade" }))

        await waitFor(() => {
            expect(mockFetchNotes).toHaveBeenCalledWith(true)
        })
    })

    it("creates a note with tags", async () => {
        mockCreateNote.mockResolvedValue(makeNote({ id: "n9" }))
        renderAt("/notes/new")

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Titel"), "Ny lärdom")
        await user.type(screen.getByLabelText("Innehåll"), "Vila efter hårda block.")
        await user.type(screen.getByLabelText("Taggar"), "Träning{Enter}")
        await user.click(screen.getByRole("button", { name: "Spara anteckning" }))

        await waitFor(() => {
            expect(mockCreateNote).toHaveBeenCalledWith({
                title: "Ny lärdom",
                content: "Vila efter hårda block.",
                tags: ["träning"],
                pinned: false,
            })
        })
        await waitFor(() => {
            expect(screen.getByText("Note page")).toBeInTheDocument()
        })
    })

    it("requires a title", async () => {
        renderAt("/notes/new")

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Innehåll"), "Utan titel")

        expect(screen.getByRole("button", { name: "Spara anteckning" })).toBeDisabled()
    })
})
