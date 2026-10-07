import { useEffect, useState } from "react"
import { Link } from "react-router"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { addItem, checklistItems, setItemChecked, uncheckItem } from "@/lib/checklist"
import { cn } from "@/lib/utils"
import AddItem from "./AddItem"
import { formatTimestamp, plainPreview } from "./format"
import NoteMarkdown from "./NoteMarkdown"
import { NoteBadges, TagList } from "./NoteMeta"
import UnsavedNotice from "./UnsavedNotice"

/** How long "Bockade … · Ångra" stays after ticking an item off a collapsed card. */
const UNDO_MS = 6000

/**
 * A note in the notes list. Tapping the header expands the full note in
 * place. Checklist notes show their open items even when collapsed, tappable
 * and with an add field, so a shopping list works without leaving the list.
 * An item ticked there leaves the card at once, so it can be brought back for
 * a few seconds.
 */
function NoteListItem({
    note,
    expanded,
    onToggleExpanded,
    onChangeContent,
    unsaved = false,
    isSaving = false,
    onRetrySave,
    onDiscardChange,
}: {
    note: Note
    expanded: boolean
    onToggleExpanded: () => void
    onChangeContent: (edit: (content: string) => string) => void
    /** The latest checklist change to this note failed to save. */
    unsaved?: boolean
    isSaving?: boolean
    onRetrySave?: () => void
    onDiscardChange?: () => void
}) {
    const isRule = note.tags.includes(ASSISTANT_TAG)
    const archived = note.archivedAt !== null
    const items = checklistItems(note.content)
    const open = items.filter((item) => !item.checked)
    const doneCount = items.length - open.length
    const title = note.title ?? "Namnlös"

    const [justTicked, setJustTicked] = useState<string | null>(null)

    useEffect(() => {
        if (justTicked === null) {
            return
        }
        const timer = setTimeout(() => setJustTicked(null), UNDO_MS)
        return () => {
            clearTimeout(timer)
        }
    }, [justTicked])

    const toggleItem = (line: number, checked: boolean) => {
        onChangeContent((c) => setItemChecked(c, line, checked))
    }
    const tickFromCard = (line: number, checked: boolean) => {
        toggleItem(line, checked)
        const item = items.find((i) => i.line === line)
        if (checked && item) {
            setJustTicked(item.text)
        }
    }
    const undoTick = () => {
        if (justTicked !== null) {
            const text = justTicked
            onChangeContent((c) => uncheckItem(c, text))
            setJustTicked(null)
        }
    }
    const addField = (
        <AddItem
            hasChecklist={items.length > 0}
            compact
            label={`Ny punkt i ${title}`}
            onAdd={(text) => onChangeContent((c) => addItem(c, text))}
        />
    )

    return (
        <Card
            className={cn(
                "session-card is-static gap-0 rounded-[14px] px-1 py-4",
                (note.pinned || isRule) && "accent-pinned",
                archived && "opacity-60",
            )}
        >
            <CardContent className="space-y-3">
                {/* The header button stretches over the header and preview. */}
                <div className="relative space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn("min-w-0 font-medium break-words", !note.title && "italic text-muted-foreground")}>
                            <button
                                type="button"
                                aria-expanded={expanded}
                                className="text-left after:absolute after:inset-0 after:content-['']"
                                onClick={onToggleExpanded}
                            >
                                {title}
                            </button>
                        </h3>
                        <NoteBadges isRule={isRule} pinned={note.pinned} archived={archived} />
                        {open.length > 0 && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-foreground">
                                {open.length} kvar
                            </span>
                        )}
                        <span className="ml-auto text-xs text-dim">
                            {note.source === "assistant" ? "Assistenten · " : ""}
                            {formatTimestamp(note.updatedAt)}
                        </span>
                    </div>
                    {!expanded && items.length === 0 && (
                        <p className="text-sm text-muted-foreground">{plainPreview(note.content)}</p>
                    )}
                </div>

                {!expanded && items.length > 0 && (
                    <div className="space-y-2">
                        <OpenItems content={note.content} onToggleItem={tickFromCard} />
                        {doneCount > 0 && (
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={onToggleExpanded}
                            >
                                + {doneCount} klara
                            </button>
                        )}
                        {addField}
                    </div>
                )}

                {/* Always rendered, so screen readers announce what appears in it. */}
                <div aria-live="polite">
                    {justTicked !== null && !expanded && (
                        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <span className="min-w-0 truncate">
                                Bockade <span className="text-foreground">{plainPreview(justTicked, 60)}</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <button
                                type="button"
                                className="shrink-0 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                                onClick={undoTick}
                            >
                                Ångra
                            </button>
                        </p>
                    )}
                </div>

                {unsaved && onRetrySave && onDiscardChange && (
                    <UnsavedNotice onRetry={onRetrySave} onDiscard={onDiscardChange} isRetrying={isSaving} />
                )}

                {expanded && (
                    <div className="space-y-3">
                        <NoteMarkdown content={note.content} onToggleItem={toggleItem} />
                        {items.length > 0 && addField}
                        <Link
                            to={`/notes/${note.id}`}
                            className="inline-block text-sm text-primary hover:underline"
                        >
                            Öppna anteckning →
                        </Link>
                    </div>
                )}

                <TagList tags={note.tags} />
            </CardContent>
        </Card>
    )
}

/** Only the open checklist items, rendered from their own lines so links in them still work. */
function OpenItems({
    content,
    onToggleItem,
}: {
    content: string
    onToggleItem: (line: number, checked: boolean) => void
}) {
    const open = checklistItems(content).filter((item) => !item.checked)
    const lines = content.split("\n")
    const compact = open.map((item) => lines[item.line]).join("\n")

    return (
        <NoteMarkdown
            content={compact}
            onToggleItem={(line, checked) => onToggleItem(open[line].line, checked)}
        />
    )
}

export default NoteListItem
