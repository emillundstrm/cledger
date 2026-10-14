import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchTrainingPlan, updateTrainingPlan } from "@/api/plans"
import type { PlanCategory, PlanSession, PlanSessionInput, TrainingPlan } from "@/api/types"
import { PLAN_CATEGORIES, PLAN_CATEGORY_LABELS, SESSION_TYPES, sessionTypeLabel } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChoiceChip } from "@/components/system/ChoiceChip"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import { fieldErrorId } from "@/components/system/fieldErrorId"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"

const BACK = { to: "/plan", label: "Plan" }

/**
 * Creates or edits one of the plan's sessions (`/plan/sessions/new`,
 * `/plan/sessions/:id`). The session is shared by every week it is in; which
 * weeks and how often is set in the week editor.
 */
function PlanSessionPage() {
    const { id } = useParams<{ id: string }>()
    const isNew = id === undefined
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const planQuery = useQuery({
        queryKey: ["trainingPlan"],
        queryFn: () => fetchTrainingPlan(),
    })

    const mutation = useMutation({
        mutationFn: ({ plan, session }: { plan: TrainingPlan; session: PlanSessionInput }) =>
            updateTrainingPlan(plan.id, { sessions: [session] }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingPlan"] })
            queryClient.invalidateQueries({ queryKey: ["planWeek"] })
            navigate("/plan")
        },
    })

    const title = isNew ? "Nytt pass" : "Redigera pass"

    if (planQuery.isLoading) {
        return (
            <div className="space-y-7">
                <PageHeader title={title} back={BACK} />
                <LoadingState>Laddar planen…</LoadingState>
            </div>
        )
    }

    if (planQuery.isError) {
        return (
            <div className="space-y-7">
                <PageHeader title={title} back={BACK} />
                <ErrorState onRetry={() => planQuery.refetch()}>Kunde inte ladda planen.</ErrorState>
            </div>
        )
    }

    const plan = planQuery.data ?? null
    const session = plan?.sessions.find((s) => s.id === id)

    if (!plan || (!isNew && !session)) {
        return (
            <div className="space-y-7">
                <PageHeader title={title} back={BACK} />
                <EmptyState>{plan ? "Passet finns inte i planen." : "Ingen aktiv träningsplan."}</EmptyState>
            </div>
        )
    }

    const save = (input: PlanSessionInput) => mutation.mutate({ plan, session: input })

    return (
        <div className="space-y-7">
            <PageHeader
                title={title}
                back={BACK}
                actions={
                    session && (
                        <Button
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={() => save({ id: session.id, archived: !session.archived })}
                        >
                            {session.archived ? "Återställ" : "Arkivera"}
                        </Button>
                    )
                }
                subtitle={
                    session?.archived
                        ? "Arkiverat: passet ingår inte i någon vecka. Återställ det för att använda det igen."
                        : undefined
                }
            />
            <PlanSessionForm
                session={session}
                error={mutation.isError ? "Kunde inte spara passet. Försök igen." : undefined}
                isSubmitting={mutation.isPending}
                onSubmit={(fields) => save(session ? { id: session.id, ...fields } : fields)}
                onCancel={() => navigate("/plan")}
            />
        </div>
    )
}

type SessionFields = Required<Pick<PlanSessionInput, "title" | "category" | "description" | "sessionTypes">>

function PlanSessionForm({
    session,
    error,
    isSubmitting,
    onSubmit,
    onCancel,
}: {
    session?: PlanSession
    error?: string
    isSubmitting: boolean
    onSubmit: (fields: SessionFields) => void
    onCancel: () => void
}) {
    const [title, setTitle] = useState(session?.title ?? "")
    const [category, setCategory] = useState<PlanCategory | null>(session?.category ?? null)
    const [description, setDescription] = useState(session?.description ?? "")
    const [types, setTypes] = useState<string[]>(session?.sessionTypes ?? [])
    const [attempted, setAttempted] = useState(false)

    const titleError = attempted && title.trim() === "" ? "Ge passet ett namn." : undefined
    const categoryError = attempted && category === null ? "Välj en kategori." : undefined

    return (
        <FormLayout
            noValidate
            onSubmit={(e) => {
                e.preventDefault()
                setAttempted(true)
                if (title.trim() === "" || category === null) {
                    return
                }
                onSubmit({
                    title: title.trim(),
                    category,
                    description: description.trim() || null,
                    sessionTypes: types,
                })
            }}
        >
            <FormField label="Namn" htmlFor="plan-session-title" error={titleError}>
                <Input
                    id="plan-session-title"
                    value={title}
                    placeholder="t.ex. Maxhäng 20 mm"
                    aria-invalid={titleError !== undefined}
                    aria-describedby={titleError ? fieldErrorId("plan-session-title") : undefined}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </FormField>

            <FormField label="Kategori" error={categoryError}>
                <div role="group" aria-label="Kategori" className="flex flex-wrap gap-2">
                    {PLAN_CATEGORIES.map((value) => (
                        <ChoiceChip key={value} pressed={category === value} onClick={() => setCategory(value)}>
                            {PLAN_CATEGORY_LABELS[value]}
                        </ChoiceChip>
                    ))}
                </div>
            </FormField>

            <FormField label="Beskrivning" htmlFor="plan-session-description">
                <Textarea
                    id="plan-session-description"
                    className="min-h-[140px]"
                    value={description}
                    placeholder="Hur passet går till. Markdown fungerar."
                    onChange={(e) => setDescription(e.target.value)}
                />
            </FormField>

            <FormField
                label="Typ av pass"
                hint="Förväljs när du loggar passet."
                hintId="plan-session-types-hint"
            >
                <ToggleGroup
                    type="multiple"
                    value={types}
                    onValueChange={setTypes}
                    spacing={2}
                    className="flex flex-wrap"
                    aria-label="Typ av pass"
                    aria-describedby="plan-session-types-hint"
                >
                    {SESSION_TYPES.map((type) => (
                        <ToggleGroupItem
                            key={type}
                            value={type}
                            variant="outline"
                            aria-label={sessionTypeLabel(type)}
                            className="type-chip h-auto px-4 py-2 text-[13px]"
                            style={{ "--chip-c": `var(--t-${type})` } as React.CSSProperties}
                        >
                            {sessionTypeLabel(type)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </FormField>

            {error && <FormError>{error}</FormError>}

            <FormActions>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sparar…" : session ? "Spara" : "Lägg till"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Avbryt
                </Button>
            </FormActions>
        </FormLayout>
    )
}

export default PlanSessionPage
