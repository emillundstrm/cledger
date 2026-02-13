import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchSession, updateSession, deleteSession } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"
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

function EditSessionPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [deleteError, setDeleteError] = useState(false)

    const sessionQuery = useQuery({
        queryKey: ["sessions", id],
        queryFn: () => fetchSession(id!),
        enabled: !!id,
    })

    const updateMutation = useMutation({
        mutationFn: (data: SessionRequest) => updateSession(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] })
            navigate("/sessions")
        },
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteSession(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] })
            navigate("/sessions")
        },
        onError: () => {
            setDeleteError(true)
        },
    })

    function handleSubmit(data: SessionRequest) {
        updateMutation.mutate(data)
    }

    function handleCancel() {
        navigate("/sessions")
    }

    function handleDelete() {
        deleteMutation.mutate()
    }

    if (sessionQuery.isLoading) {
        return <p className="text-muted-foreground">Loading session...</p>
    }

    if (sessionQuery.isError) {
        return <p className="text-destructive">Failed to load session.</p>
    }

    const session = sessionQuery.data!

    const initialData: SessionRequest = {
        date: session.date,
        types: session.types,
        intensity: session.intensity,
        performance: session.performance,
        durationMinutes: session.durationMinutes,
        maxGrade: session.maxGrade,
        venue: session.venue,
        injuries: session.injuries.map((i) => ({ location: i.location, note: i.note, severity: i.severity })),
        notes: session.notes,
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Edit Session</h2>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete session?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this training session.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {updateMutation.isError && (
                <p className="text-destructive">Failed to update session. Please try again.</p>
            )}

            {deleteError && (
                <p className="text-destructive">Failed to delete session. Please try again.</p>
            )}

            <SessionForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                submitLabel="Save Changes"
                isSubmitting={updateMutation.isPending}
            />
        </div>
    )
}

export default EditSessionPage
