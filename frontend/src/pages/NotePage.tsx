import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import {
    deleteNote,
    fetchBacklinks,
    fetchNote,
    setNoteArchived,
    updateNote,
} from "@/api/notes"
import { ASSISTANT_TAG, type NoteRequest } from "@/api/types"
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
import AddItem from "@/components/notes/AddItem"
import UnsavedNotice from "@/components/notes/UnsavedNotice"
import { useNoteContent } from "@/components/notes/useNoteContent"
import { addItem, checklistItems, setItemChecked } from "@/lib/checklist"

/** Set on the history entry when the editor is opened from the note itself. */
interface EditState {
    fromNote?: boolean
}

/**
 * A note, and with `editing` its editor at /notes/:id/edit. The editor has a
 * URL of its own so a reload keeps it open; the form guards unsaved changes.
 */
function NotePage({ editing = false }: { editing?: boolean }) {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()

    const { data: note, isLoading, isError, refetch } = useQuery({
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
        onSuccess: invalidate,
    })

    // Back to the note: step back when the editor was opened from it, so the
    // history holds no stale editor entry; otherwise replace the editor.
    const closeEditor = () => {
        if ((location.state as EditState | null)?.fromNote) {
            navigate(-1)
        } else {
            navigate(`/notes/${id}`, { replace: true })
        }
    }

    const checklist = useNoteContent()

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
        return <p className="text-muted-foreground">Laddar anteckning…</p>
    }

    if (isError) {
        return (
            <div role="alert" className="space-y-4">
                <p className="text-destructive">Kunde inte ladda anteckningen.</p>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Försök igen
                    </Button>
                    <Link to="/notes" className="text-sm text-muted-foreground hover:text-foreground">
                        ← Alla anteckningar
                    </Link>
                </div>
            </div>
        )
    }

    if (!note) {
        return (
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    Anteckningen finns inte. Den kan ha tagits bort.
                </p>
                <Link to="/notes" className="text-sm text-muted-foreground hover:text-foreground">
                    ← Alla anteckningar
                </Link>
            </div>
        )
    }

    const archived = note.archivedAt !== null

    if (editing) {
        return (
            <div className="space-y-6">
                <h2 className="font-display text-4xl">Redigera anteckning</h2>
                <NoteForm
                    initial={{
                        title: note.title ?? "",
                        content: note.content,
                        tags: note.tags,
                        pinned: note.pinned,
                    }}
                    submitLabel="Spara"
                    isPending={updateMutation.isPending}
                    onSubmit={async (data) => {
                        await updateMutation.mutateAsync(data)
                        closeEditor()
                    }}
                    onCancel={closeEditor}
                />
                {updateMutation.isError && (
                    <p role="alert" className="text-sm text-destructive">
                        Kunde inte spara ändringarna. Det du skrivit finns kvar, försök igen.
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link to="/notes" className="text-sm text-muted-foreground hover:text-foreground">
                ← Alla anteckningar
            </Link>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="min-w-0 font-display text-4xl break-words">{note.title ?? "Namnlös"}</h2>
                    <NoteBadges
                        isRule={note.tags.includes(ASSISTANT_TAG)}
                        pinned={note.pinned}
                        archived={archived}
                    />
                </div>
                <p className="text-xs text-dim">
                    {note.source === "assistant" ? "Skriven av assistenten" : "Skriven av dig"}
                    {" · "}uppdaterad {formatTimestamp(note.updatedAt)}
                </p>
                <TagList tags={note.tags} />
            </div>

            <NoteMarkdown
                content={note.content}
                onToggleItem={(line, checked) => checklist.change(id, (c) => setItemChecked(c, line, checked))}
            />
            <AddItem
                hasChecklist={checklistItems(note.content).length > 0}
                onAdd={(text) => checklist.change(id, (c) => addItem(c, text))}
            />
            {checklist.isUnsaved(id) && (
                <UnsavedNotice
                    isRetrying={checklist.isSaving}
                    onRetry={() => checklist.retry(id)}
                    onDiscard={() => checklist.discard(id)}
                />
            )}

            {backlinks && backlinks.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Länkad från</h3>
                    <ul className="space-y-1">
                        {backlinks.map((b) => (
                            <li key={b.id}>
                                <Link to={`/notes/${b.id}`} className="text-sm text-primary">
                                    {b.title ?? "Namnlös"}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button onClick={() => navigate("edit", { state: { fromNote: true } satisfies EditState })}>
                    Redigera
                </Button>
                <Button
                    variant="outline"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(!archived)}
                >
                    {archived ? "Återställ" : "Arkivera"}
                </Button>
                {archived && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Ta bort permanent</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Ta bort anteckning</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Anteckningen och dess redigeringshistorik tas bort. Det går inte att ångra.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                    Ta bort
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
            {archiveMutation.isError && (
                <p className="text-destructive">Kunde inte uppdatera anteckningen.</p>
            )}
            {deleteMutation.isError && (
                <p className="text-destructive">Kunde inte ta bort anteckningen.</p>
            )}
        </div>
    )
}

export default NotePage
