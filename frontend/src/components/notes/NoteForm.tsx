import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useBlocker } from "react-router"
import { fetchNoteTags } from "@/api/notes"
import type { NoteRequest } from "@/api/types"
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import TagInput from "./TagInput"

function NoteForm({
    initial,
    onSubmit,
    onCancel,
    submitLabel,
    isPending,
}: {
    initial?: NoteRequest
    /** Saves and then navigates away; rejects if saving failed. */
    onSubmit: (data: NoteRequest) => Promise<void>
    /** Navigates away; a form with changes asks before they are discarded. */
    onCancel: () => void
    submitLabel: string
    isPending?: boolean
}) {
    const [title, setTitle] = useState(initial?.title ?? "")
    const [content, setContent] = useState(initial?.content ?? "")
    const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
    const [pinned, setPinned] = useState(initial?.pinned ?? false)

    const { data: tagCounts } = useQuery({
        queryKey: ["note-tags"],
        queryFn: fetchNoteTags,
    })

    const canSubmit = title.trim() !== "" && !isPending

    const dirty =
        title !== (initial?.title ?? "") ||
        content !== (initial?.content ?? "") ||
        pinned !== (initial?.pinned ?? false) ||
        tags.join("\n") !== (initial?.tags ?? []).join("\n")

    // Only once something is written, so an untouched new form stays quiet.
    const missingTitle = title.trim() === "" && dirty

    // Set while a save is under way, so the navigation that follows a
    // successful save is not taken for leaving with unsaved changes. Read by
    // the blocker, which runs outside React's render cycle.
    const savingRef = useRef(false)

    // Leaving discards everything typed here, including via the back button,
    // so a form with changes asks first.
    const blocker = useBlocker(useCallback(() => dirty && !savingRef.current, [dirty]))

    useEffect(() => {
        if (!dirty) {
            return
        }
        const warn = (event: BeforeUnloadEvent) => {
            if (savingRef.current) {
                return
            }
            event.preventDefault()
        }
        window.addEventListener("beforeunload", warn)
        return () => {
            window.removeEventListener("beforeunload", warn)
        }
    }, [dirty])

    const submit = async (data: NoteRequest) => {
        savingRef.current = true
        try {
            await onSubmit(data)
        } catch {
            // The page shows the error; the changes are still here to retry.
            savingRef.current = false
        }
    }

    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault()
                if (canSubmit) {
                    void submit({ title: title.trim(), content, tags, pinned })
                }
            }}
        >
            <div>
                <label htmlFor="note-title" className="text-sm font-medium">
                    Titel
                </label>
                <Input
                    id="note-title"
                    className="mt-1.5"
                    value={title}
                    aria-describedby={missingTitle ? "note-title-hint" : undefined}
                    onChange={(e) => setTitle(e.target.value)}
                />
                {missingTitle && (
                    <p id="note-title-hint" className="mt-1.5 text-xs text-muted-foreground">
                        Ge anteckningen en titel för att kunna spara.
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="note-content" className="text-sm font-medium">
                    Innehåll
                </label>
                <Textarea
                    id="note-content"
                    className="mt-1.5 min-h-[180px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Markdown. Checklistpunkter: - [ ] punkt. Länkar: [text](/notes/<id>)."
                />
            </div>
            <div>
                <label htmlFor="note-tags" className="text-sm font-medium">
                    Taggar
                </label>
                <div className="mt-1.5">
                    <TagInput
                        id="note-tags"
                        value={tags}
                        onChange={setTags}
                        suggestions={(tagCounts ?? []).map((t) => t.tag)}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="note-pinned"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="rounded"
                />
                <label htmlFor="note-pinned" className="text-sm">
                    Fäst anteckningen
                </label>
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={!canSubmit}>
                    {submitLabel}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Avbryt
                </Button>
            </div>

            <AlertDialog open={blocker.state === "blocked"}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Släng ändringarna?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Det du har skrivit är inte sparat. Lämnar du nu försvinner det.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => blocker.reset?.()}>
                            Fortsätt redigera
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => blocker.proceed?.()}>
                            Släng ändringarna
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    )
}

export default NoteForm
