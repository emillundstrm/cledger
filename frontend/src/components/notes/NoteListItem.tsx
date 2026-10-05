import { Link } from "react-router"
import { ASSISTANT_TAG, type Note } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { addItem, checklistItems, setItemChecked } from "@/lib/checklist"
import { cn } from "@/lib/utils"
import AddItem from "./AddItem"
import { formatTimestamp, plainPreview } from "./format"
import NoteMarkdown from "./NoteMarkdown"
import { NoteBadges, TagList } from "./NoteMeta"

/**
 * A note in the notes list. Tapping the header expands the full note in
 * place. Checklist notes show their open items even when collapsed, tappable
 * and with an add field, so a shopping list works without leaving the list.
 */
function NoteListItem({
    note,
    expanded,
    onToggleExpanded,
    onChangeContent,
}: {
    note: Note
    expanded: boolean
    onToggleExpanded: () => void
    onChangeContent: (edit: (content: string) => string) => void
}) {
    const isRule = note.tags.includes(ASSISTANT_TAG)
    const archived = note.archivedAt !== null
    const items = checklistItems(note.content)
    const open = items.filter((item) => !item.checked)
    const doneCount = items.length - open.length
    const title = note.title ?? "Namnlös"

    const toggleItem = (line: number, checked: boolean) => {
        onChangeContent((c) => setItemChecked(c, line, checked))
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
                        <h3 className={cn("font-medium", !note.title && "italic text-muted-foreground")}>
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
                        <OpenItems content={note.content} onToggleItem={toggleItem} />
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
