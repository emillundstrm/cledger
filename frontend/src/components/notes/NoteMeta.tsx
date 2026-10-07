import { Badge } from "@/components/ui/badge"

const BADGE_CLASS = "gap-1 px-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"

export function NoteBadges({
    isRule,
    pinned,
    archived,
}: {
    isRule: boolean
    pinned: boolean
    archived: boolean
}) {
    return (
        <>
            {isRule && (
                <Badge variant="ghost" className={`${BADGE_CLASS} text-foreground`}>
                    <span aria-hidden="true">§</span>
                    <span>Regel</span>
                </Badge>
            )}
            {pinned && (
                <Badge variant="ghost" className={BADGE_CLASS}>
                    <span aria-hidden="true">⌖</span>
                    <span>Fäst</span>
                </Badge>
            )}
            {archived && (
                <Badge variant="ghost" className={BADGE_CLASS}>
                    Arkiverad
                </Badge>
            )}
        </>
    )
}

export function TagList({ tags }: { tags: string[] }) {
    if (tags.length === 0) {
        return null
    }
    return (
        <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                </Badge>
            ))}
        </div>
    )
}
