import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Search } from "lucide-react"
import { fetchNotes, fetchNoteTags } from "@/api/notes"
import { search } from "@/api/search"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NoteCard from "@/components/notes/NoteCard"
import { plainPreview } from "@/components/notes/format"
import { openItems } from "@/lib/checklist"
import { cn } from "@/lib/utils"

function useDebounced<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])
    return debounced
}

function NotesPage() {
    const [query, setQuery] = useState("")
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [showArchived, setShowArchived] = useState(false)
    const [showRules, setShowRules] = useState(false)
    const debouncedQuery = useDebounced(query.trim(), 250)
    const isSearching = debouncedQuery !== ""

    const notesQuery = useQuery({
        queryKey: ["notes", { showArchived }],
        queryFn: () => fetchNotes(showArchived),
    })

    const searchQuery = useQuery({
        queryKey: ["search", debouncedQuery, { showArchived }],
        queryFn: () => search(debouncedQuery, ["note"], showArchived),
        enabled: isSearching,
    })

    const { data: tagCounts } = useQuery({
        queryKey: ["note-tags"],
        queryFn: fetchNoteTags,
    })

    const notes = (notesQuery.data ?? []).filter(
        (note) => activeTag === null || note.tags.includes(activeTag),
    )
    // Rules are instructions for the assistant, rarely what the user opens
    // Notes for, so they sit in a collapsed section below everything else,
    // unless the user filters on the rule tag itself. The rest keep the API's
    // order: pinned first, then most recently updated.
    const rulesApart = activeTag !== ASSISTANT_TAG
    const mainNotes = rulesApart ? notes.filter((n) => !n.tags.includes(ASSISTANT_TAG)) : notes
    const rules = rulesApart ? notes.filter((n) => n.tags.includes(ASSISTANT_TAG)) : []
    const results = (searchQuery.data ?? []).filter(
        (hit) => activeTag === null || hit.tags.includes(activeTag),
    )

    const isLoading = isSearching ? searchQuery.isLoading : notesQuery.isLoading
    const isError = isSearching ? searchQuery.isError : notesQuery.isError

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-4xl">Notes</h2>
                <Button asChild>
                    <Link to="/notes/new">
                        <span aria-hidden="true">+</span> <span>New note</span>
                    </Link>
                </Button>
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label="Search notes"
                        className="pl-10"
                        placeholder="Search notes"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {(tagCounts ?? []).map(({ tag, count }) => (
                        <button
                            key={tag}
                            type="button"
                            aria-pressed={activeTag === tag}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                            className={cn(
                                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                                activeTag === tag
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {tag} <span className="opacity-70">{count}</span>
                        </button>
                    ))}
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                        />
                        Show archived
                    </label>
                </div>
            </div>

            {isLoading && <p className="text-muted-foreground">Loading notes...</p>}
            {isError && <p className="text-destructive">Failed to load notes.</p>}

            {isSearching && searchQuery.data && (
                results.length === 0 ? (
                    <p className="text-muted-foreground">No notes match “{debouncedQuery}”.</p>
                ) : (
                    <div className="space-y-3">
                        {results.map((hit) => (
                            <NoteCard
                                key={hit.id}
                                id={hit.id}
                                title={hit.title}
                                preview={plainPreview(hit.snippet, 200)}
                                tags={hit.tags}
                                pinned={false}
                                archived={false}
                                fromAssistant={false}
                                timestamp={hit.date}
                            />
                        ))}
                    </div>
                )
            )}

            {!isSearching && notesQuery.data && (
                mainNotes.length === 0 && rules.length === 0 ? (
                    <p className="text-muted-foreground">
                        No notes yet. Notes you or your assistant write will show up here.
                    </p>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">{mainNotes.map(renderNote)}</div>
                        {rules.length > 0 && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    aria-expanded={showRules}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowRules(!showRules)}
                                >
                                    {showRules ? "▾" : "▸"} Rules for the assistant ({rules.length})
                                </button>
                                {showRules && <div className="space-y-3">{rules.map(renderNote)}</div>}
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    )
}

function renderNote(note: Note) {
    return (
        <NoteCard
            key={note.id}
            id={note.id}
            title={note.title}
            preview={plainPreview(note.content)}
            tags={note.tags}
            pinned={note.pinned}
            archived={note.archivedAt !== null}
            fromAssistant={note.source === "assistant"}
            timestamp={note.updatedAt}
            openCount={openItems(note.content).length}
        />
    )
}

export default NotesPage
