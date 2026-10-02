import { Link } from "react-router"
import { ASSISTANT_TAG } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatTimestamp } from "./format"
import { NoteBadges, TagList } from "./NoteMeta"

function NoteCard({
    id,
    title,
    preview,
    tags,
    pinned,
    archived,
    fromAssistant,
    timestamp,
    delayMs,
}: {
    id: string
    title: string | null
    preview: string
    tags: string[]
    pinned: boolean
    archived: boolean
    fromAssistant: boolean
    timestamp: string
    delayMs: number
}) {
    const isRule = tags.includes(ASSISTANT_TAG)

    return (
        <Link to={`/notes/${id}`} className="block">
            <Card
                className={cn(
                    "session-card anim-fade-up gap-0 rounded-[14px] px-1 py-4",
                    (pinned || isRule) && "accent-pinned",
                    archived && "opacity-60",
                )}
                style={{ animationDelay: `${delayMs}ms` }}
            >
                <CardContent className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn("font-medium", !title && "italic text-muted-foreground")}>
                            {title ?? "Untitled"}
                        </h3>
                        <NoteBadges isRule={isRule} pinned={pinned} archived={archived} />
                        <span className="ml-auto text-xs text-dim">
                            {fromAssistant ? "Assistant · " : ""}
                            {formatTimestamp(timestamp)}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{preview}</p>
                    <TagList tags={tags} />
                </CardContent>
            </Card>
        </Link>
    )
}

export default NoteCard
