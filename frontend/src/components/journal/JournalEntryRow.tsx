import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { format, parseISO } from "date-fns"
import type { JournalEntry, JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
    /** Saves an edit; rejects if saving failed, and the editor stays open. */
    onSave: (data: JournalEntryRequest) => Promise<void>
    onArchive: (archived: boolean) => void
    onDelete: () => void
}) {
    const [editing, setEditing] = useState(false)
    const archived = entry.archivedAt !== null

    // Closing the editor removes the focused form, so focus returns to the
    // button that opened it rather than dropping to the page.
    const editButton = useRef<HTMLButtonElement>(null)
    const wasEditing = useRef(false)
    useEffect(() => {
        if (wasEditing.current && !editing) {
            editButton.current?.focus()
        }
        wasEditing.current = editing
    }, [editing])

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
                    error={error}
                    onSubmit={async (data) => {
                        await onSave(data)
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
                    className="rounded-sm tabular-nums outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
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
                    <Button ref={editButton} size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(true)}>
                        Redigera
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => onArchive(!archived)}>
                        {archived ? "Återställ" : "Arkivera"}
                    </Button>
                    {archived && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-xs text-bad hover:text-bad">
                                    Ta bort
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Ta bort inlägget?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Inlägget tas bort för gott. Det går inte att ångra.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" onClick={onDelete}>
                                        Ta bort
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
