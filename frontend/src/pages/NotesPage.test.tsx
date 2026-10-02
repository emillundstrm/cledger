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

import { createNote, fetchNotes, fetchNoteTags } from "@/api/notes"
import { search } from "@/api/search"

const mockFetchNotes = vi.mocked(fetchNotes)
const mockFetchNoteTags = vi.mocked(fetchNoteTags)
const mockCreateNote = vi.mocked(createNote)
const mockSearch = vi.mocked(search)

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
            expect(screen.getByText("Failed to load notes.")).toBeInTheDocument()
        })
    })

    it("shows empty state", async () => {
        mockFetchNotes.mockResolvedValue([])
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
        })
    })

    it("lists rules for the assistant first", async () => {
        renderAt("/notes")
        await waitFor(() => {
            expect(screen.getByText("Axellärdomar")).toBeInTheDocument()
        })
        const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)
        expect(titles).toEqual(["Korta avstämningar", "Axellärdomar", "Sömn"])
        expect(screen.getByText("Rule")).toBeInTheDocument()
        expect(screen.getByText("Pinned")).toBeInTheDocument()
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
        await user.type(screen.getByLabelText("Search notes"), "sömnen")

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
        await user.click(screen.getByLabelText("Show archived"))

        await waitFor(() => {
            expect(mockFetchNotes).toHaveBeenCalledWith(true)
        })
    })

    it("creates a note with tags", async () => {
        mockCreateNote.mockResolvedValue(makeNote({ id: "n9" }))
        renderAt("/notes/new")

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("Title"), "Ny lärdom")
        await user.type(screen.getByLabelText("Content"), "Vila efter hårda block.")
        await user.type(screen.getByLabelText("Tags"), "Träning{Enter}")
        await user.click(screen.getByRole("button", { name: "Save note" }))

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
        await user.type(screen.getByLabelText("Content"), "Utan titel")

        expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled()
    })
})
