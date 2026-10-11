import { useNavigate, useSearchParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createSession, fetchSessions } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"
import { PageHeader } from "@/components/system/PageHeader"

function NewSessionPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    // Started from an item on the plan page: that item starts picked, and saving returns there
    const [searchParams] = useSearchParams()
    const planEntryId = searchParams.get("plan")
    const backTo = planEntryId ? "/plan" : "/sessions"

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
            queryClient.invalidateQueries({ queryKey: ["planWeek"] })
            queryClient.invalidateQueries({ queryKey: ["trainingPlan"] })
            navigate(backTo)
        },
    })

    function handleSubmit(data: SessionRequest) {
        mutation.mutate(data)
    }

    function handleCancel() {
        navigate(backTo)
    }

    return (
        <div className="space-y-7">
            <PageHeader title="Logga pass" back={planEntryId ? { to: "/plan", label: "Plan" } : { to: "/sessions", label: "Pass" }} />

            <SessionForm
                defaults={defaults}
                initialPlanEntryIds={planEntryId ? [planEntryId] : undefined}
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
