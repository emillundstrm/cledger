import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Search } from "lucide-react"
import { fetchNotes, fetchNoteTags } from "@/api/notes"
import { search } from "@/api/search"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NoteListItem, { NoteLinkRow } from "@/components/notes/NoteListItem"
import UnsavedNotice from "@/components/notes/UnsavedNotice"
import { useNoteContent } from "@/components/notes/useNoteContent"
import { plainPreview } from "@/components/notes/format"
import { openItems } from "@/lib/checklist"
import { cn } from "@/lib/utils"
import { ChoiceChip } from "@/components/system/ChoiceChip"
import { ListFrame } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"

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
            unsaved={checklist.isUnsaved(note.id)}
            isSaving={checklist.isSaving}
            onRetrySave={() => checklist.retry(note.id)}
            onDiscardChange={() => checklist.discard(note.id)}
        />
    )
    const hasFilters = activeTag !== null || listsOnly
    const clearFilters = () => {
        setActiveTag(null)
        setListsOnly(false)
    }

    const results = (searchQuery.data ?? []).filter(
        (hit) => activeTag === null || hit.tags.includes(activeTag),
    )
    // A hit is shown as the same row as in the list (One Item, One Look), so
    // it is looked up among the loaded notes, which share its archived scope.
    // A hit that is not there yet (the notes are still loading, or changed
    // since) falls back to a row that navigates.
    const notesById = new Map(allNotes.map((n) => [n.id, n]))
    const shownIds = isSearching
        ? results.filter((hit) => notesById.has(hit.id)).map((hit) => hit.id)
        : visible.map((n) => n.id)

    // A failed save is shown on its row; one whose row is filtered away or
    // collapsed under the rules is shown here instead, so it is not missed.
    const hiddenUnsaved = checklist.unsavedIds.filter((id) => !shownIds.includes(id))

    const isLoading = isSearching ? searchQuery.isLoading : notesQuery.isLoading
    const isError = isSearching ? searchQuery.isError : notesQuery.isError

    return (
        <div className="space-y-7">
            <PageHeader
                title="Anteckningar"
                actions={
                    <Button asChild>
                        <Link to="/notes/new" aria-label="Ny anteckning">
                            <span aria-hidden="true">+</span> <span className="sm:hidden">Ny</span><span className="hidden sm:inline">Ny anteckning</span>
                        </Link>
                    </Button>
                }
            />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label="Sök anteckningar"
                        className="pl-10"
                        placeholder="Sök anteckningar"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {listCount > 0 && (
                        <ChoiceChip pressed={listsOnly} onClick={() => setListsOnly(!listsOnly)}>
                            Listor <span className="opacity-70">{listCount}</span>
                        </ChoiceChip>
                    )}
                    {(tagCounts ?? []).map(({ tag, count }) => (
                        <ChoiceChip
                            key={tag}
                            pressed={activeTag === tag}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        >
                            {tag} <span className="opacity-70">{count}</span>
                        </ChoiceChip>
                    ))}
                    <ChoiceChip pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
                        Visa arkiverade
                    </ChoiceChip>
                    {!isSearching && visible.length > 0 && (
                        <button
                            type="button"
                            aria-label={allExpanded ? "Fäll ihop alla" : "Fäll ut alla"}
                            title={allExpanded ? "Fäll ihop alla" : "Fäll ut alla"}
                            className="ml-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                            onClick={() => setExpanded(allExpanded ? new Set() : new Set(visible.map((n) => n.id)))}
                        >
                            {allExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
                        </button>
                    )}
                </div>
            </div>

            {isLoading && <LoadingState>Laddar anteckningar…</LoadingState>}
            {isError && (
                <ErrorState onRetry={() => (isSearching ? searchQuery.refetch() : notesQuery.refetch())}>
                    Kunde inte ladda anteckningarna.
                </ErrorState>
            )}

            {hiddenUnsaved.length > 0 && (
                <UnsavedNotice
                    isRetrying={checklist.isSaving}
                    onRetry={() => hiddenUnsaved.forEach(checklist.retry)}
                    onDiscard={() => hiddenUnsaved.forEach(checklist.discard)}
                />
            )}

            {isSearching && searchQuery.data && (
                results.length === 0 ? (
                    <EmptyState>Inga anteckningar matchar ”{debouncedQuery}”.</EmptyState>
                ) : (
                    <ListFrame aria-label="Sökresultat">
                        {results.map((hit) => {
                            const note = notesById.get(hit.id)
                            if (note) {
                                return renderNote(note)
                            }
                            return (
                                <NoteLinkRow
                                    key={hit.id}
                                    id={hit.id}
                                    title={hit.title}
                                    preview={plainPreview(hit.snippet, 200)}
                                    tags={hit.tags}
                                    timestamp={hit.date}
                                />
                            )
                        })}
                    </ListFrame>
                )
            )}

            {!isSearching && notesQuery.data && (
                mainNotes.length === 0 && rules.length === 0 ? (
                    allNotes.length > 0 && hasFilters ? (
                        <EmptyState action={{ label: "Rensa filter", onClick: clearFilters }}>
                            {listsOnly && activeTag === null
                                ? "Inga listor med punkter kvar."
                                : "Inga anteckningar matchar filtret."}
                        </EmptyState>
                    ) : (
                        <EmptyState>
                            Inga anteckningar än. Anteckningar som du eller assistenten skriver hamnar här.
                        </EmptyState>
                    )
                ) : (
                    <div className="space-y-7">
                        {mainNotes.length > 0 && (
                            <ListFrame aria-label="Anteckningar">{mainNotes.map(renderNote)}</ListFrame>
                        )}
                        {rules.length > 0 && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    aria-expanded={showRules}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                                    onClick={() => setShowRules(!showRules)}
                                >
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={cn(
                                            "size-4 transition-transform duration-200",
                                            showRules ? "rotate-0" : "-rotate-90",
                                        )}
                                    />
                                    Regler för assistenten ({rules.length})
                                </button>
                                {showRules && (
                                    <ListFrame aria-label="Regler för assistenten">{rules.map(renderNote)}</ListFrame>
                                )}
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    )
}

export default NotesPage
