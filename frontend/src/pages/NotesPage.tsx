import { useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Search } from "lucide-react"
import { fetchNotes, fetchNoteTags } from "@/api/notes"
import { search } from "@/api/search"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NoteCard from "@/components/notes/NoteCard"
import NoteListItem from "@/components/notes/NoteListItem"
import { useNoteContent } from "@/components/notes/useNoteContent"
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
    const [listsOnly, setListsOnly] = useState(false)
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const checklist = useNoteContent()
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

    const allNotes = notesQuery.data ?? []
    const hasOpenItems = (note: Note) => openItems(note.content).length > 0
    const listCount = allNotes.filter(hasOpenItems).length
    const notes = allNotes.filter(
        (note) => (activeTag === null || note.tags.includes(activeTag)) && (!listsOnly || hasOpenItems(note)),
    )
    // Rules are instructions for the assistant, rarely what the user opens
    // Notes for, so they sit in a collapsed section below everything else,
    // unless the user filters on the rule tag itself. The rest keep the API's
    // order: pinned first, then most recently updated.
    const rulesApart = activeTag !== ASSISTANT_TAG
    const mainNotes = rulesApart ? notes.filter((n) => !n.tags.includes(ASSISTANT_TAG)) : notes
    const rules = rulesApart ? notes.filter((n) => n.tags.includes(ASSISTANT_TAG)) : []
    const visible = [...mainNotes, ...(showRules ? rules : [])]
    const allExpanded = visible.length > 0 && visible.every((n) => expanded.has(n.id))
    const toggleExpanded = (id: string) => {
        const next = new Set(expanded)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setExpanded(next)
    }
    const renderNote = (note: Note) => (
        <NoteListItem
            key={note.id}
            note={note}
            expanded={expanded.has(note.id)}
            onToggleExpanded={() => toggleExpanded(note.id)}
            onChangeContent={(edit) => checklist.change(note.id, edit)}
        />
    )

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
                    {listCount > 0 && (
                        <FilterChip pressed={listsOnly} onClick={() => setListsOnly(!listsOnly)}>
                            Lists <span className="opacity-70">{listCount}</span>
                        </FilterChip>
                    )}
                    {(tagCounts ?? []).map(({ tag, count }) => (
                        <FilterChip
                            key={tag}
                            pressed={activeTag === tag}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        >
                            {tag} <span className="opacity-70">{count}</span>
                        </FilterChip>
                    ))}
                    {!isSearching && visible.length > 0 && (
                        <button
                            type="button"
                            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setExpanded(allExpanded ? new Set() : new Set(visible.map((n) => n.id)))}
                        >
                            {allExpanded ? "Collapse all" : "Expand all"}
                        </button>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

            {checklist.isError && <p className="text-destructive">Failed to save the checklist.</p>}

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
                        {listsOnly
                            ? "No lists with open items."
                            : "No notes yet. Notes you or your assistant write will show up here."}
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

function FilterChip({
    pressed,
    onClick,
    children,
}: {
    pressed: boolean
    onClick: () => void
    children: ReactNode
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                pressed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
            )}
        >
            {children}
        </button>
    )
}

export default NotesPage
