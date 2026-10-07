import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { ListRow, RowButton, RowChevron, RowControls, RowLink } from "@/components/system/List"
import { addItem, checklistItems, setItemChecked, uncheckItem } from "@/lib/checklist"
import { cn } from "@/lib/utils"
import AddItem from "./AddItem"
import { formatTimestamp, plainPreview } from "./format"
import NoteMarkdown from "./NoteMarkdown"
import { NoteBadges, TagList } from "./NoteMeta"
import UnsavedNotice from "./UnsavedNotice"

/** How long "Bockade … · Ångra" stays after ticking an item off a collapsed row. */
const UNDO_MS = 6000

/**
 * A note in the notes list: an expanding row. Tapping the header expands the
 * full note in place. Checklist notes show their open items even when
 * collapsed, tappable and with an add field, so a shopping list works without
 * leaving the list. An item ticked there leaves the row at once, so it can be
 * brought back for a few seconds.
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
    const archived = note.archivedAt !== null
    const items = checklistItems(note.content)
    const open = items.filter((item) => !item.checked)
    const doneCount = items.length - open.length
    const title = note.title ?? "Namnlös"

    const [justTicked, setJustTicked] = useState<string | null>(null)
    // The undo stays while the user is on it (hovered or focused), so it can't
    // expire under the pointer or the keyboard.
    const [undoHeld, setUndoHeld] = useState(false)
    const openItemsRef = useRef<HTMLDivElement>(null)
    const undoButton = useRef<HTMLButtonElement>(null)
    const headerButton = useRef<HTMLButtonElement>(null)
    // Set when the ticked checkbox had focus: it leaves the row, so focus
    // moves to the undo instead of dropping to the page.
    const focusUndo = useRef(false)

    useEffect(() => {
        if (justTicked === null || undoHeld) {
            return
        }
        const timer = setTimeout(() => setJustTicked(null), UNDO_MS)
        return () => {
            clearTimeout(timer)
        }
    }, [justTicked, undoHeld])

    useEffect(() => {
        if (justTicked !== null && focusUndo.current) {
            focusUndo.current = false
            undoButton.current?.focus()
        }
    }, [justTicked])

    const toggleItem = (line: number, checked: boolean) => {
        onChangeContent((c) => setItemChecked(c, line, checked))
    }
    const tickFromRow = (line: number, checked: boolean) => {
        focusUndo.current = openItemsRef.current?.contains(document.activeElement) ?? false
        toggleItem(line, checked)
        const item = items.find((i) => i.line === line)
        if (checked && item) {
            setJustTicked(item.text)
            // A fresh undo starts its own countdown, whatever the last one was doing.
            setUndoHeld(false)
        }
    }
    const undoTick = () => {
        if (justTicked !== null) {
            const text = justTicked
            onChangeContent((c) => uncheckItem(c, text))
            setJustTicked(null)
            setUndoHeld(false)
            // The undo button goes away; keep focus in this row.
            headerButton.current?.focus()
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
        <ListRow archived={archived}>
            <NoteRowHead
                untitled={!note.title}
                target={
                    <RowButton ref={headerButton} expanded={expanded} onClick={onToggleExpanded}>
                        {title}
                    </RowButton>
                }
                chevron={<RowChevron expanded={expanded} />}
                tags={note.tags}
                pinned={note.pinned}
                archived={archived}
                openCount={open.length}
                fromAssistant={note.source === "assistant"}
                timestamp={note.updatedAt}
                preview={!expanded && items.length === 0 ? plainPreview(note.content) : null}
            />

            {!expanded && items.length > 0 && (
                <RowControls className="mt-3 space-y-2">
                    <div ref={openItemsRef}>
                        <OpenItems content={note.content} onToggleItem={tickFromRow} />
                    </div>
                    {doneCount > 0 && (
                        <button
                            type="button"
                            className="cursor-pointer rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                            onClick={onToggleExpanded}
                        >
                            + {doneCount} klara
                        </button>
                    )}
                    {addField}
                </RowControls>
            )}

            {/* Always rendered, so screen readers announce what appears in it. */}
            <RowControls aria-live="polite">
                {justTicked !== null && !expanded && (
                    <p
                        className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        onPointerEnter={() => setUndoHeld(true)}
                        onPointerLeave={() => setUndoHeld(false)}
                        onFocus={() => setUndoHeld(true)}
                        onBlur={() => setUndoHeld(false)}
                    >
                        <span className="min-w-0 truncate">
                            Bockade <span className="text-foreground">{plainPreview(justTicked, 60)}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <button
                            ref={undoButton}
                            type="button"
                            className="shrink-0 cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/80"
                            onClick={undoTick}
                        >
                            Ångra
                        </button>
                    </p>
                )}
            </RowControls>

            {unsaved && onRetrySave && onDiscardChange && (
                <RowControls className="mt-3">
                    <UnsavedNotice onRetry={onRetrySave} onDiscard={onDiscardChange} isRetrying={isSaving} />
                </RowControls>
            )}

            {expanded && (
                <RowControls className="mt-3 space-y-3">
                    <NoteMarkdown content={note.content} onToggleItem={toggleItem} />
                    {items.length > 0 && addField}
                    <Link
                        to={`/notes/${note.id}`}
                        className="inline-block rounded-sm text-sm text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/80"
                    >
                        Öppna anteckning →
                    </Link>
                </RowControls>
            )}

            {note.tags.length > 0 && (
                <div className="mt-3">
                    <TagList tags={note.tags} />
                </div>
            )}
        </ListRow>
    )
}

/**
 * A note that only navigates, for a search hit that is not in the loaded
 * notes: the same head as NoteListItem, with the hit's snippet as preview.
 */
export function NoteLinkRow({
    id,
    title,
    preview,
    tags,
    timestamp,
}: {
    id: string
    title: string | null
    preview: string
    tags: string[]
    timestamp: string
}) {
    return (
        <ListRow>
            <NoteRowHead
                untitled={!title}
                target={<RowLink to={`/notes/${id}`}>{title ?? "Namnlös"}</RowLink>}
                chevron={<RowChevron />}
                tags={tags}
                pinned={false}
                archived={false}
                openCount={0}
                fromAssistant={false}
                timestamp={timestamp}
                preview={preview}
            />
            {tags.length > 0 && (
                <div className="mt-3">
                    <TagList tags={tags} />
                </div>
            )}
        </ListRow>
    )
}

/** Title with its stretched target, badges, count, timestamp and chevron, then the preview line. */
function NoteRowHead({
    untitled,
    target,
    chevron,
    tags,
    pinned,
    archived,
    openCount,
    fromAssistant,
    timestamp,
    preview,
}: {
    untitled: boolean
    target: ReactNode
    chevron: ReactNode
    tags: string[]
    pinned: boolean
    archived: boolean
    openCount: number
    fromAssistant: boolean
    timestamp: string
    preview: string | null
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={cn("min-w-0 font-medium break-words", untitled && "italic text-muted-foreground")}>
                        {target}
                    </h3>
                    <NoteBadges isRule={tags.includes(ASSISTANT_TAG)} pinned={pinned} archived={archived} />
                    {openCount > 0 && (
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-foreground">
                            {openCount} kvar
                        </span>
                    )}
                    <span className="ml-auto text-xs text-dim">
                        {fromAssistant ? "Assistenten · " : ""}
                        {formatTimestamp(timestamp)}
                    </span>
                </div>
                {preview !== null && <p className="text-sm text-muted-foreground">{preview}</p>}
            </div>
            <span className="mt-1">{chevron}</span>
        </div>
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
