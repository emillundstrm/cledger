import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { createNote } from "@/api/notes"
import type { NoteRequest } from "@/api/types"
import NoteForm from "@/components/notes/NoteForm"

function NewNotePage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: (data: NoteRequest) => createNote(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["note-tags"] })
        },
    })

    return (
        <div className="space-y-6">
            <h2 className="font-display text-4xl">Ny anteckning</h2>
            <NoteForm
                submitLabel="Spara anteckning"
                isPending={createMutation.isPending}
                onSubmit={async (data) => {
                    const note = await createMutation.mutateAsync(data)
                    // Replace, so going back from the new note skips the empty form.
                    navigate(`/notes/${note.id}`, { replace: true })
                }}
                onCancel={() => navigate("/notes")}
            />
            {createMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                    Kunde inte spara anteckningen. Det du skrivit finns kvar, försök igen.
                </p>
            )}
        </div>
    )
}

export default NewNotePage
