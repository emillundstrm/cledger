import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { normaliseTag } from "./format"

/**
 * Free-form tags as removable chips. Existing tags are offered as
 * suggestions so tags converge rather than drift into near-duplicates.
 */
function TagInput({
    id,
    value,
    onChange,
    suggestions,
}: {
    id: string
    value: string[]
    onChange: (tags: string[]) => void
    suggestions: string[]
}) {
    const [draft, setDraft] = useState("")

    const addTag = (raw: string) => {
        const tag = normaliseTag(raw)
        if (tag && !value.includes(tag)) {
            onChange([...value, tag])
        }
        setDraft("")
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag(draft)
        } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1))
        }
    }

    const needle = normaliseTag(draft)
    const offered = suggestions
        .filter((tag) => !value.includes(tag))
        .filter((tag) => needle === "" || tag.includes(needle))
        .slice(0, 8)

    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <button
                                type="button"
                                aria-label={`Ta bort taggen ${tag}`}
                                className="rounded-full p-0.5 hover:bg-background/60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                                onClick={() => onChange(value.filter((t) => t !== tag))}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <Input
                id={id}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    if (draft.trim()) {
                        addTag(draft)
                    }
                }}
                placeholder="Lägg till en tagg och tryck Enter"
            />
            {offered.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {offered.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addTag(tag)}
                        >
                            + {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default TagInput
