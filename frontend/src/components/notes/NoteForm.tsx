import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import TagInput from "./TagInput"

function NoteForm({
    initial,
    onSubmit,
    onCancel,
    submitLabel,
    isPending,
    error,
}: {
    initial?: NoteRequest
    /** Saves and then navigates away; rejects if saving failed. */
    onSubmit: (data: NoteRequest) => Promise<void>
    /** Navigates away; a form with changes asks before they are discarded. */
    onCancel: () => void
    submitLabel: string
    isPending?: boolean
    /** Why the last save failed, shown above the buttons. */
    error?: ReactNode
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
        <FormLayout
            onSubmit={(e) => {
                e.preventDefault()
                if (canSubmit) {
                    void submit({ title: title.trim(), content, tags, pinned })
                }
            }}
        >
            <FormField
                label="Titel"
                htmlFor="note-title"
                hint={missingTitle ? "Ge anteckningen en titel för att kunna spara." : undefined}
                hintId="note-title-hint"
            >
                <Input
                    id="note-title"
                    value={title}
                    aria-describedby={missingTitle ? "note-title-hint" : undefined}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </FormField>
            <FormField label="Innehåll" htmlFor="note-content">
                <Textarea
                    id="note-content"
                    className="min-h-[180px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Markdown. Checklistpunkter: - [ ] punkt. Länkar: [text](/notes/<id>)."
                />
            </FormField>
            <FormField label="Taggar" htmlFor="note-tags">
                <TagInput
                    id="note-tags"
                    value={tags}
                    onChange={setTags}
                    suggestions={(tagCounts ?? []).map((t) => t.tag)}
                />
            </FormField>
            <div className="flex items-center gap-2">
                <Checkbox
                    id="note-pinned"
                    checked={pinned}
                    onCheckedChange={(checked) => setPinned(checked === true)}
                />
                <Label htmlFor="note-pinned">Fäst anteckningen</Label>
            </div>
            {error && <FormError>{error}</FormError>}
            <FormActions>
                <Button type="submit" disabled={!canSubmit}>
                    {submitLabel}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Avbryt
                </Button>
            </FormActions>

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
                        <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
                            Släng ändringarna
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </FormLayout>
    )
}

export default NoteForm
