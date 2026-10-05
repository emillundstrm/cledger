import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchNoteTags } from "@/api/notes"
import type { NoteRequest } from "@/api/types"
import { Button } from "@/components/ui/button"
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
    onSubmit: (data: NoteRequest) => void
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

    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault()
                if (canSubmit) {
                    onSubmit({ title: title.trim(), content, tags, pinned })
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
                    onChange={(e) => setTitle(e.target.value)}
                />
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
        </form>
    )
}

export default NoteForm
