import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate, useParams } from "react-router"
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
import { cn } from "@/lib/utils"
import { addItem, checklistItems, setItemChecked } from "@/lib/checklist"
import { ListFrame, ListRow, RowChevron, RowLink } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { ErrorState, LoadingState, NotFoundState } from "@/components/system/States"

const BACK_TO_NOTES = { to: "/notes", label: "Alla anteckningar" }

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
        return <LoadingState>Laddar anteckning…</LoadingState>
    }

    if (isError) {
        return (
            <div className="space-y-7">
                <PageHeader title="Anteckning" back={BACK_TO_NOTES} />
                <ErrorState onRetry={() => refetch()}>Kunde inte ladda anteckningen.</ErrorState>
            </div>
        )
    }

    if (!note) {
        return (
            <NotFoundState back={BACK_TO_NOTES}>
                Anteckningen finns inte. Den kan ha tagits bort.
            </NotFoundState>
        )
    }

    const archived = note.archivedAt !== null
    const title = note.title ?? "Namnlös"

    if (editing) {
        return (
            <div className="space-y-7">
                <PageHeader title="Redigera anteckning" back={{ to: `/notes/${id}`, label: title }} />
                <NoteForm
                    initial={{
                        title: note.title ?? "",
                        content: note.content,
                        tags: note.tags,
                        pinned: note.pinned,
                    }}
                    submitLabel="Spara"
                    isPending={updateMutation.isPending}
                    error={
                        updateMutation.isError
                            ? "Kunde inte spara ändringarna. Det du skrivit finns kvar, försök igen."
                            : undefined
                    }
                    onSubmit={async (data) => {
                        await updateMutation.mutateAsync(data)
                        closeEditor()
                    }}
                    onCancel={closeEditor}
                />
            </div>
        )
    }

    return (
        <div className="space-y-7">
            <div className="space-y-3">
                <PageHeader title={title} back={BACK_TO_NOTES} />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <NoteBadges
                        isRule={note.tags.includes(ASSISTANT_TAG)}
                        pinned={note.pinned}
                        archived={archived}
                    />
                    <p className="text-xs text-dim">
                        {note.source === "assistant" ? "Skriven av assistenten" : "Skriven av dig"}
                        {" · "}uppdaterad {formatTimestamp(note.updatedAt)}
                    </p>
                </div>
                <TagList tags={note.tags} />
            </div>

            <div className="space-y-4">
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
            </div>

            {backlinks && backlinks.length > 0 && (
                <section className="space-y-3">
                    <h2 className="font-display text-xl">Länkad från</h2>
                    <ListFrame aria-label="Länkad från">
                        {backlinks.map((b) => (
                            <ListRow key={b.id} className="flex items-center gap-3">
                                <RowLink
                                    to={`/notes/${b.id}`}
                                    className={cn(
                                        "min-w-0 flex-1 text-sm font-medium break-words",
                                        !b.title && "italic text-muted-foreground",
                                    )}
                                >
                                    {b.title ?? "Namnlös"}
                                </RowLink>
                                <RowChevron />
                            </ListRow>
                        ))}
                    </ListFrame>
                </section>
            )}

            <div className="space-y-3 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
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
                                <Button variant="destructive-outline">Ta bort permanent</Button>
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
                                    <AlertDialogAction variant="destructive" onClick={() => deleteMutation.mutate()}>
                                        Ta bort
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                {archiveMutation.isError && (
                    <p role="alert" className="text-sm text-bad">Kunde inte uppdatera anteckningen.</p>
                )}
                {deleteMutation.isError && (
                    <p role="alert" className="text-sm text-bad">Kunde inte ta bort anteckningen.</p>
                )}
            </div>
        </div>
    )
}

export default NotePage
