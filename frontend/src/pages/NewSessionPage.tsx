import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createSession, fetchSessions } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"
import { PageHeader } from "@/components/system/PageHeader"

function NewSessionPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // The venue usually repeats, so a new session starts from the last one's.
    // Usually cached from the sessions list; without it the venue starts empty.
    const sessionsQuery = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })
    const last = sessionsQuery.data?.[0]
    const defaults = sessionsQuery.isSuccess
        ? { venue: last?.venue ?? null }
        : undefined

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
        <div className="space-y-7">
            <PageHeader title="Logga pass" back={{ to: "/sessions", label: "Pass" }} />

            <SessionForm
                defaults={defaults}
                error={mutation.isError ? "Kunde inte spara passet. Försök igen." : undefined}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                submitLabel="Logga pass"
                isSubmitting={mutation.isPending}
            />
        </div>
    )
}

export default NewSessionPage
