import { useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createSession } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"

function NewSessionPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: createSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sessions"] })
            navigate("/sessions")
        },
    })

    function handleSubmit(data: SessionRequest) {
        mutation.mutate(data)
    }

    function handleCancel() {
        navigate("/sessions")
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">Log Session</h2>

            {mutation.isError && (
                <p className="text-destructive">Failed to save session. Please try again.</p>
            )}

            <SessionForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                submitLabel="Log Session"
                isSubmitting={mutation.isPending}
            />
        </div>
    )
}

export default NewSessionPage
