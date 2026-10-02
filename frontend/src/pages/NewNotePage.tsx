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
        onSuccess: (note) => {
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            queryClient.invalidateQueries({ queryKey: ["note-tags"] })
            navigate(`/notes/${note.id}`)
        },
    })

    return (
        <div className="space-y-6">
            <h2 className="font-display text-4xl">New note</h2>
            <NoteForm
                submitLabel="Save note"
                isPending={createMutation.isPending}
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => navigate("/notes")}
            />
            {createMutation.isError && (
                <p className="text-destructive">Failed to save note.</p>
            )}
        </div>
    )
}

export default NewNotePage
