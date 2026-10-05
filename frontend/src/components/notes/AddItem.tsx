import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Quick entry for checklist items. Notes without a checklist offer to start
 * one, so any note can become a list without opening the editor.
 */
function AddItem({
    hasChecklist,
    onAdd,
    label = "Ny punkt",
    compact = false,
}: {
    hasChecklist: boolean
    onAdd: (text: string) => void
    /** Accessible name of the field, unique when several are on one page. */
    label?: string
    /** A quiet row that reads as the next list item, for cards in the notes list. */
    compact?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")

    if (!hasChecklist && !open) {
        return (
            <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(true)}
            >
                + Lägg till checklista
            </button>
        )
    }

    return (
        <form
            className="flex gap-2"
            onSubmit={(e) => {
                e.preventDefault()
                if (text.trim()) {
                    onAdd(text)
                    setText("")
                }
            }}
        >
            <Input
                aria-label={label}
                placeholder={compact ? "+ Lägg till punkt" : "Lägg till punkt"}
                className={cn(compact && "h-8 border-transparent bg-transparent px-0 text-sm shadow-none md:text-sm focus-visible:px-3")}
                value={text}
                autoFocus={open}
                onChange={(e) => setText(e.target.value)}
            />
            {(!compact || text.trim()) && (
                <Button type="submit" variant="outline" size={compact ? "sm" : "default"} disabled={!text.trim()}>
                    Lägg till
                </Button>
            )}
        </form>
    )
}

export default AddItem
