import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import NotePage from "./NotePage"
import type { Note } from "@/api/types"

vi.mock("@/api/notes")

import {
    deleteNote,
    fetchBacklinks,
    fetchNote,
    fetchNoteTags,
    resolveLinks,
    setNoteArchived,
    updateNote,
    updateNoteContent,
} from "@/api/notes"

const mockFetchNote = vi.mocked(fetchNote)
const mockFetchBacklinks = vi.mocked(fetchBacklinks)
const mockFetchNoteTags = vi.mocked(fetchNoteTags)
const mockResolveLinks = vi.mocked(resolveLinks)
const mockUpdateNote = vi.mocked(updateNote)
const mockSetNoteArchived = vi.mocked(setNoteArchived)
const mockDeleteNote = vi.mocked(deleteNote)
const mockUpdateNoteContent = vi.mocked(updateNoteContent)

const NOTE_ID = "3f2a0000-0000-4000-8000-000000000001"
const LINKED_ID = "3f2a0000-0000-4000-8000-000000000002"
const MISSING_ID = "3f2a0000-0000-4000-8000-000000000003"

function makeNote(overrides: Partial<Note> = {}): Note {
    return {
        id: NOTE_ID,
        title: "Axellärdomar",
        content: `Se [sömnen](/notes/${LINKED_ID}) och [gammal](/notes/${MISSING_ID}).`,
        tags: ["träning"],
        pinned: false,
        source: "assistant",
        archivedAt: null,
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
        ...overrides,
    }
}

function renderPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/notes/${NOTE_ID}`]}>
                <Routes>
                    <Route path="/notes" element={<p>All notes</p>} />
                    <Route path="/notes/:id" element={<NotePage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("NotePage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchNote.mockResolvedValue(makeNote())
        mockFetchBacklinks.mockResolvedValue([])
        mockFetchNoteTags.mockResolvedValue([])
        mockResolveLinks.mockResolvedValue(new Map([[`note:${LINKED_ID}`, "Sömn"]]))
    })

    it("renders links to existing notes and marks missing ones", async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("link", { name: "sömnen" })).toHaveAttribute("href", `/notes/${LINKED_ID}`)
        })
        await waitFor(() => {
            expect(screen.getByText("(missing)")).toBeInTheDocument()
        })
        expect(screen.queryByRole("link", { name: "gammal" })).not.toBeInTheDocument()
    })

    it("shows backlinks", async () => {
        mockFetchBacklinks.mockResolvedValue([makeNote({ id: LINKED_ID, title: "Sömn" })])
        renderPage()
        await waitFor(() => {
            expect(screen.getByText("Linked from")).toBeInTheDocument()
        })
        expect(screen.getByRole("link", { name: "Sömn" })).toHaveAttribute("href", `/notes/${LINKED_ID}`)
    })

    it("edits a note", async () => {
        mockUpdateNote.mockResolvedValue(makeNote({ title: "Axeln" }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Edit" }))
        const title = screen.getByLabelText("Title")
        await user.clear(title)
        await user.type(title, "Axeln")
        await user.click(screen.getByRole("button", { name: "Save" }))

        await waitFor(() => {
            expect(mockUpdateNote).toHaveBeenCalledWith(NOTE_ID, expect.objectContaining({ title: "Axeln" }))
        })
    })

    it("archives a note, and only offers delete once archived", async () => {
        mockSetNoteArchived.mockResolvedValue(makeNote({ archivedAt: "2026-10-01T10:00:00Z" }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument()
        })
        expect(screen.queryByRole("button", { name: "Delete permanently" })).not.toBeInTheDocument()

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Archive" }))

        await waitFor(() => {
            expect(mockSetNoteArchived).toHaveBeenCalledWith(NOTE_ID, true)
        })
    })

    it("ticks a checklist item straight from the note, moving it down", async () => {
        mockFetchNote.mockResolvedValue(makeNote({ content: "- [ ] kaffefilter\n- [ ] kaffe" }))
        mockUpdateNoteContent.mockImplementation(async (_id, content) => makeNote({ content }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("checkbox", { name: "kaffefilter" })).not.toBeChecked()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("checkbox", { name: "kaffefilter" }))

        expect(mockUpdateNoteContent).toHaveBeenCalledWith(NOTE_ID, "- [ ] kaffe\n- [x] kaffefilter")
        await waitFor(() => {
            expect(screen.getByRole("checkbox", { name: "kaffefilter" })).toBeChecked()
        })
        const order = screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))
        expect(order).toEqual(["kaffe", "kaffefilter"])
    })

    it("adds an item to the checklist", async () => {
        mockFetchNote.mockResolvedValue(makeNote({ content: "- [ ] kaffe\n- [x] mjölk" }))
        mockUpdateNoteContent.mockImplementation(async (_id, content) => makeNote({ content }))
        renderPage()
        await waitFor(() => {
            expect(screen.getByLabelText("New item")).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.type(screen.getByLabelText("New item"), "kaffefilter{Enter}")

        expect(mockUpdateNoteContent).toHaveBeenCalledWith(NOTE_ID, "- [ ] kaffe\n- [ ] kaffefilter\n- [x] mjölk")
        expect(screen.getByLabelText("New item")).toHaveValue("")
    })

    it("offers to start a checklist in a note without one", async () => {
        mockFetchNote.mockResolvedValue(makeNote({ content: "Filmer att se" }))
        mockUpdateNoteContent.mockImplementation(async (_id, content) => makeNote({ content }))
        renderPage()

        const user = userEvent.setup()
        await user.click(await screen.findByRole("button", { name: "+ Add checklist" }))
        await user.type(screen.getByLabelText("New item"), "Dune{Enter}")

        expect(mockUpdateNoteContent).toHaveBeenCalledWith(NOTE_ID, "Filmer att se\n\n- [ ] Dune")
    })

    it("deletes an archived note after confirmation", async () => {
        mockFetchNote.mockResolvedValue(makeNote({ archivedAt: "2026-10-01T10:00:00Z" }))
        mockDeleteNote.mockResolvedValue()
        renderPage()
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument()
        })

        const user = userEvent.setup()
        await user.click(screen.getByRole("button", { name: "Delete permanently" }))
        await user.click(screen.getByRole("button", { name: "Delete" }))

        await waitFor(() => {
            expect(mockDeleteNote).toHaveBeenCalledWith(NOTE_ID)
        })
        await waitFor(() => {
            expect(screen.getByText("All notes")).toBeInTheDocument()
        })
    })
})
