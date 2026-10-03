import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import {
    deleteNote,
    fetchBacklinks,
    fetchNote,
    setNoteArchived,
    updateNote,
    updateNoteContent,
} from "@/api/notes"
import { ASSISTANT_TAG, type Note, type NoteRequest } from "@/api/types"
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import NoteForm from "@/components/notes/NoteForm"
import NoteMarkdown from "@/components/notes/NoteMarkdown"
import { NoteBadges, TagList } from "@/components/notes/NoteMeta"
import { formatTimestamp } from "@/components/notes/format"
import { Input } from "@/components/ui/input"
import { addItem, checklistItems, setItemChecked } from "@/lib/checklist"

function NotePage() {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState(false)

    const { data: note, isLoading, isError } = useQuery({
        queryKey: ["note", id],
        queryFn: () => fetchNote(id),
    })

    const { data: backlinks } = useQuery({
        queryKey: ["backlinks", id],
        queryFn: () => fetchBacklinks(id),
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["notes"] })
        queryClient.invalidateQueries({ queryKey: ["note", id] })
        queryClient.invalidateQueries({ queryKey: ["note-tags"] })
        queryClient.invalidateQueries({ queryKey: ["search"] })
    }

    const updateMutation = useMutation({
        mutationFn: (data: NoteRequest) => updateNote(id, data),
        onSuccess: () => {
            invalidate()
            setEditing(false)
        },
    })

    // Checklist changes show at once and save in the background, one at a
    // time and in order, so quick taps cannot overwrite each other.
    const contentMutation = useMutation({
        mutationFn: (content: string) => updateNoteContent(id, content),
        scope: { id: `note-content-${id}` },
        onMutate: async (content) => {
            await queryClient.cancelQueries({ queryKey: ["note", id] })
            queryClient.setQueryData<Note>(["note", id], (old) => (old ? { ...old, content } : old))
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ["note", id] })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["search"] })
        },
    })

    const changeContent = (change: (content: string) => string) => {
        const current = queryClient.getQueryData<Note>(["note", id])?.content
        if (current === undefined) {
            return
        }
        const next = change(current)
        if (next !== current) {
            contentMutation.mutate(next)
        }
    }

    const archiveMutation = useMutation({
        mutationFn: (archived: boolean) => setNoteArchived(id, archived),
        onSuccess: invalidate,
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteNote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["note-tags"] })
            navigate("/notes")
        },
    })

    if (isLoading) {
        return <p className="text-muted-foreground">Loading note...</p>
    }

    if (isError || !note) {
        return (
            <div className="space-y-4">
                <p className="text-destructive">Note not found.</p>
                <Link to="/notes" className="text-sm text-primary">← All notes</Link>
            </div>
        )
    }

    const archived = note.archivedAt !== null

    if (editing) {
        return (
            <div className="space-y-6">
                <h2 className="font-display text-4xl">Edit note</h2>
                <NoteForm
                    initial={{
                        title: note.title ?? "",
                        content: note.content,
                        tags: note.tags,
                        pinned: note.pinned,
                    }}
                    submitLabel="Save"
                    isPending={updateMutation.isPending}
                    onSubmit={(data) => updateMutation.mutate(data)}
                    onCancel={() => setEditing(false)}
                />
                {updateMutation.isError && (
                    <p className="text-destructive">Failed to update note.</p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link to="/notes" className="text-sm text-muted-foreground hover:text-foreground">
                ← All notes
            </Link>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-4xl">{note.title ?? "Untitled"}</h2>
                    <NoteBadges
                        isRule={note.tags.includes(ASSISTANT_TAG)}
                        pinned={note.pinned}
                        archived={archived}
                    />
                </div>
                <p className="text-xs text-dim">
                    {note.source === "assistant" ? "Written by the assistant" : "Written by you"}
                    {" · "}updated {formatTimestamp(note.updatedAt)}
                </p>
                <TagList tags={note.tags} />
            </div>

            <NoteMarkdown
                content={note.content}
                onToggleItem={(line, checked) => changeContent((c) => setItemChecked(c, line, checked))}
            />
            <AddItem
                hasChecklist={checklistItems(note.content).length > 0}
                onAdd={(text) => changeContent((c) => addItem(c, text))}
            />
            {contentMutation.isError && (
                <p className="text-destructive">Failed to save the checklist.</p>
            )}

            {backlinks && backlinks.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Linked from</h3>
                    <ul className="space-y-1">
                        {backlinks.map((b) => (
                            <li key={b.id}>
                                <Link to={`/notes/${b.id}`} className="text-sm text-primary">
                                    {b.title ?? "Untitled"}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button onClick={() => setEditing(true)}>Edit</Button>
                <Button
                    variant="outline"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(!archived)}
                >
                    {archived ? "Restore" : "Archive"}
                </Button>
                {archived && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Delete permanently</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete note</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This deletes the note and its edit history. It cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            {archiveMutation.isError && (
                <p className="text-destructive">Failed to update note.</p>
            )}
            {deleteMutation.isError && (
                <p className="text-destructive">Failed to delete note.</p>
            )}
        </div>
    )
}

/**
 * Quick entry for checklist items. Notes without a checklist offer to start
 * one, so any note can become a list without opening the editor.
 */
function AddItem({ hasChecklist, onAdd }: { hasChecklist: boolean; onAdd: (text: string) => void }) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")

    if (!hasChecklist && !open) {
        return (
            <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(true)}
            >
                + Add checklist
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
                aria-label="New item"
                placeholder="Add item"
                value={text}
                autoFocus={open}
                onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={!text.trim()}>
                Add
            </Button>
        </form>
    )
}

export default NotePage
