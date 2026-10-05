import { useState } from "react"
import { Link } from "react-router"
import { format, parseISO } from "date-fns"
import type { JournalEntry, JournalEntryRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import NoteMarkdown from "@/components/notes/NoteMarkdown"
import { TagList } from "@/components/notes/NoteMeta"
import { cn } from "@/lib/utils"
import { LOCALE } from "@/lib/locale"
import JournalEntryForm from "./JournalEntryForm"

export function DayHeading({ date }: { date: string }) {
    return (
        <h3 className="font-display text-xl">
            {parseISO(date).toLocaleDateString(LOCALE, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            })}
        </h3>
    )
}

function JournalEntryCard({
    entry,
    tagSuggestions,
    highlighted,
    onSave,
    onArchive,
    onDelete,
}: {
    entry: JournalEntry
    tagSuggestions: string[]
    highlighted?: boolean
    onSave: (data: JournalEntryRequest) => void
    onArchive: (archived: boolean) => void
    onDelete: () => void
}) {
    const [editing, setEditing] = useState(false)
    const archived = entry.archivedAt !== null

    if (editing) {
        return (
            <Card className="rounded-[14px] px-1 py-4">
                <CardContent>
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
                </CardContent>
            </Card>
        )
    }

    return (
        <Card
            className={cn(
                "session-card gap-0 rounded-[14px] px-1 py-4",
                highlighted && "accent-pinned",
                archived && "opacity-60",
            )}
        >
            <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
                    <Link to={`/journal/${entry.id}`} className="hover:text-foreground">
                        {format(parseISO(entry.createdAt), "HH:mm")}
                    </Link>
                    {entry.mood !== null && <span>Humör {entry.mood}/5</span>}
                    {entry.energy !== null && <span>Energi {entry.energy}/5</span>}
                    {entry.source === "assistant" && <span>Via assistenten</span>}
                    {archived && (
                        <span className="font-semibold uppercase tracking-[0.08em]">Arkiverad</span>
                    )}
                    <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                            Redigera
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => onArchive(!archived)}
                        >
                            {archived ? "Återställ" : "Arkivera"}
                        </Button>
                        {archived && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive"
                                onClick={onDelete}
                            >
                                Ta bort
                            </Button>
                        )}
                    </div>
                </div>
                <NoteMarkdown content={entry.content} />
                <TagList tags={entry.tags} />
            </CardContent>
        </Card>
    )
}

export default JournalEntryCard
