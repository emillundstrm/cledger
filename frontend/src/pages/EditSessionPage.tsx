import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchSession, updateSession, deleteSession } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"
import { PageHeader } from "@/components/system/PageHeader"
import { ErrorState, LoadingState } from "@/components/system/States"
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

    const back = { to: "/sessions", label: "Pass" }

    if (sessionQuery.isLoading) {
        return (
            <div className="space-y-7">
                <PageHeader title="Redigera pass" back={back} />
                <LoadingState>Laddar pass…</LoadingState>
            </div>
        )
    }

    if (sessionQuery.isError || !sessionQuery.data) {
        return (
            <div className="space-y-7">
                <PageHeader title="Redigera pass" back={back} />
                <ErrorState onRetry={() => sessionQuery.refetch()}>Kunde inte ladda passet.</ErrorState>
            </div>
        )
    }

    const session = sessionQuery.data

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

    let formError: string | undefined
    if (updateMutation.isError) {
        formError = "Kunde inte spara passet. Försök igen."
    } else if (deleteError) {
        formError = "Kunde inte ta bort passet. Försök igen."
    }

    return (
        <div className="space-y-7">
            <PageHeader
                title="Redigera pass"
                back={back}
                actions={
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Ta bort</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Ta bort passet?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Det går inte att ångra. Passet tas bort permanent.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                                    Ta bort
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                }
            />

            <SessionForm
                initialData={initialData}
                error={formError}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                submitLabel="Spara"
                isSubmitting={updateMutation.isPending}
            />
        </div>
    )
}

export default EditSessionPage
