import { useState } from "react"
import { Link } from "react-router"
import { format, parseISO } from "date-fns"
import type { JournalEntry, JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import NoteMarkdown from "@/components/notes/NoteMarkdown"
import { TagList } from "@/components/notes/NoteMeta"
import { ListRow } from "@/components/system/List"
import { cn } from "@/lib/utils"
import JournalEntryForm from "./JournalEntryForm"

/**
 * One entry as a list row, read in place: it opens nothing, so it takes no
 * hover wash. Editing swaps the row's content for the form, in the same row.
 */
function JournalEntryRow({
    entry,
    tagSuggestions,
    highlighted,
    error,
    onSave,
    onArchive,
    onDelete,
}: {
    entry: JournalEntry
    tagSuggestions: string[]
    highlighted?: boolean
    /** A failed edit, archive or delete of this entry. */
    error?: string
    onSave: (data: JournalEntryRequest) => void
    onArchive: (archived: boolean) => void
    onDelete: () => void
}) {
    const [editing, setEditing] = useState(false)
    const archived = entry.archivedAt !== null

    if (editing) {
        return (
            <ListRow interactive={false} className="py-5">
                <JournalEntryForm
                    idPrefix={`edit-${entry.id}`}
                    initial={{
                        entryDate: entry.entryDate,
                        content: entry.content,
                        tags: entry.tags,
                        mood: entry.mood,
                        energy: entry.energy,
                    }}
                    tagSuggestions={tagSuggestions}
                    submitLabel="Spara"
                    onSubmit={(data) => {
                        onSave(data)
                        setEditing(false)
                    }}
                    onCancel={() => setEditing(false)}
                />
            </ListRow>
        )
    }

    return (
        <ListRow
            interactive={false}
            archived={archived}
            className={cn("space-y-2", highlighted && "bg-accent/60")}
        >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
                <Link
                    to={`/journal/${entry.id}`}
                    className="rounded-sm tabular-nums outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    {format(parseISO(entry.createdAt), "HH:mm")}
                </Link>
                {entry.mood !== null && <span>Humör {entry.mood}/5</span>}
                {entry.energy !== null && <span>Energi {entry.energy}/5</span>}
                {entry.source === "assistant" && <span>Via assistenten</span>}
                {archived && (
                    <span className="font-semibold uppercase tracking-[0.08em]">Arkiverad</span>
                )}
                <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(true)}>
                        Redigera
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => onArchive(!archived)}>
                        {archived ? "Återställ" : "Arkivera"}
                    </Button>
                    {archived && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-bad hover:text-bad"
                            onClick={onDelete}
                        >
                            Ta bort
                        </Button>
                    )}
                </div>
            </div>
            <NoteMarkdown content={entry.content} />
            <TagList tags={entry.tags} />
            {error && (
                <p role="alert" className="text-sm text-bad">
                    {error}
                </p>
            )}
        </ListRow>
    )
}

export default JournalEntryRow
