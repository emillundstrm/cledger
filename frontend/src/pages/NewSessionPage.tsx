import { useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createSession } from "@/api/sessions"
import type { SessionRequest } from "@/api/types"
import SessionForm from "@/components/SessionForm"
import { PageHeader } from "@/components/system/PageHeader"

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
        <div className="space-y-7">
            <PageHeader title="Logga pass" back={{ to: "/sessions", label: "Pass" }} />

            <SessionForm
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
