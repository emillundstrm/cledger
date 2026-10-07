import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { createNote } from "@/api/notes"
import type { NoteRequest } from "@/api/types"
import NoteForm from "@/components/notes/NoteForm"
import { PageHeader } from "@/components/system/PageHeader"

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
        <div className="space-y-7">
            <PageHeader title="Ny anteckning" back={{ to: "/notes", label: "Alla anteckningar" }} />
            <NoteForm
                submitLabel="Spara anteckning"
                isPending={createMutation.isPending}
                error={
                    createMutation.isError
                        ? "Kunde inte spara anteckningen. Det du skrivit finns kvar, försök igen."
                        : undefined
                }
                onSubmit={async (data) => {
                    const note = await createMutation.mutateAsync(data)
                    // Replace, so going back from the new note skips the empty form.
                    navigate(`/notes/${note.id}`, { replace: true })
                }}
                onCancel={() => navigate("/notes")}
            />
        </div>
    )
}

export default NewNotePage
