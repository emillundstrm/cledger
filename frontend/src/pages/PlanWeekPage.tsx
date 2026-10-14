import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { fetchTrainingPlan, updateTrainingPlan } from "@/api/plans"
import type { PlanSession, PlanWeek, TrainingPlan, TrainingPlanPatch } from "@/api/types"
import { PLAN_CATEGORY_LABELS, PLAN_PHASES, PLAN_PHASE_LABELS } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChoiceChip } from "@/components/system/ChoiceChip"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import { fieldErrorId } from "@/components/system/fieldErrorId"
import { ListFrame, ListRow } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
import { minCount, plannedTotal, targetError, weekDraft, weekPatch, type WeekDraft } from "@/lib/plans/edit"
import { cn } from "@/lib/utils"

const BACK = { to: "/plan", label: "Plan" }

/**
 * Edits one week of the plan (`/plan/weeks/:week`): its phase, target and
 * focus, and how many times each of the plan's sessions is in it. The sessions
 * themselves are edited on their own page; here they are only counted.
 */
function PlanWeekPage() {
    const weekNumber = Number(useParams<{ week: string }>().week)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const planQuery = useQuery({
        queryKey: ["trainingPlan"],
        queryFn: () => fetchTrainingPlan(),
    })

    const mutation = useMutation({
        mutationFn: ({ plan, patch }: { plan: TrainingPlan; patch: TrainingPlanPatch }) =>
            updateTrainingPlan(plan.id, patch),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trainingPlan"] })
            queryClient.invalidateQueries({ queryKey: ["planWeek"] })
            navigate("/plan")
        },
    })

    const title = `Vecka ${weekNumber}`

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
    const week = plan?.weeks.find((w) => w.week === weekNumber)

    if (!plan || !week) {
        return (
            <div className="space-y-7">
                <PageHeader title={title} back={BACK} />
                <EmptyState>{plan ? "Veckan finns inte i planen." : "Ingen aktiv träningsplan."}</EmptyState>
            </div>
        )
    }

    return (
        <div className="space-y-7">
            <PageHeader title={title} back={BACK} subtitle={plan.title} />
            <WeekForm
                week={week}
                sessions={plan.sessions}
                error={mutation.isError ? "Kunde inte spara veckan. Försök igen." : undefined}
                isSubmitting={mutation.isPending}
                onSubmit={(draft) => mutation.mutate({ plan, patch: weekPatch(week, plan.sessions, draft) })}
                onCancel={() => navigate("/plan")}
            />
        </div>
    )
}

function WeekForm({
    week,
    sessions,
    error,
    isSubmitting,
    onSubmit,
    onCancel,
}: {
    week: PlanWeek
    sessions: PlanSession[]
    error?: string
    isSubmitting: boolean
    onSubmit: (draft: WeekDraft) => void
    onCancel: () => void
}) {
    const [draft, setDraft] = useState(() => weekDraft(week, sessions))
    const [attempted, setAttempted] = useState(false)
    // Notes are rare, so an empty one is a quiet link until asked for
    const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
    const byId = new Map(sessions.map((s) => [s.id, s]))
    const planned = plannedTotal(draft)
    const targetProblem = targetError(draft)
    const shownTargetError = attempted ? targetProblem : undefined

    const setSession = (sessionId: string, change: { count?: number; note?: string }) =>
        setDraft({
            ...draft,
            sessions: draft.sessions.map((s) => (s.sessionId === sessionId ? { ...s, ...change } : s)),
        })

    return (
        <FormLayout
            noValidate
            onSubmit={(e) => {
                e.preventDefault()
                setAttempted(true)
                if (targetProblem === undefined) {
                    onSubmit(draft)
                }
            }}
        >
            <FormField label="Fas">
                <div role="group" aria-label="Fas" className="flex flex-wrap gap-2">
                    {PLAN_PHASES.map((phase) => (
                        <ChoiceChip
                            key={phase}
                            pressed={draft.phase === phase}
                            onClick={() => setDraft({ ...draft, phase })}
                        >
                            {PLAN_PHASE_LABELS[phase]}
                        </ChoiceChip>
                    ))}
                </div>
            </FormField>

            <FormField label="Fokus" htmlFor="week-focus">
                <Input
                    id="week-focus"
                    value={draft.focus}
                    placeholder="Veckans inriktning, i en mening"
                    onChange={(e) => setDraft({ ...draft, focus: e.target.value })}
                />
            </FormField>

            <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-medium">Veckans pass</h2>
                    <span className="text-sm tabular-nums text-muted-foreground">{planned} planerade</span>
                </div>
                {draft.sessions.length === 0 ? (
                    <EmptyState>
                        Planen har inga pass än. <Link to="/plan/sessions/new" className="underline">Lägg till ett</Link>.
                    </EmptyState>
                ) : (
                    <ListFrame aria-label="Veckans pass">
                        {draft.sessions.map((line) => {
                            const session = byId.get(line.sessionId)!
                            const min = minCount(session, week.week)
                            return (
                                <ListRow key={line.sessionId} interactive={false} className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("min-w-0 flex-1", line.count === 0 && "text-muted-foreground")}>
                                            <span className="block text-sm font-medium">{session.title}</span>
                                            <span className="block text-xs text-dim">
                                                {PLAN_CATEGORY_LABELS[session.category]}
                                                {min > 0 && ` · ${min} gjort`}
                                            </span>
                                        </div>
                                        <CountStepper
                                            label={session.title}
                                            value={line.count}
                                            min={min}
                                            onChange={(count) => setSession(line.sessionId, { count })}
                                        />
                                    </div>
                                    {line.count > 0 &&
                                        (line.note !== "" || openNotes.has(line.sessionId) ? (
                                            <Input
                                                aria-label={`Notering för ${session.title} den här veckan`}
                                                value={line.note}
                                                placeholder="t.ex. lättare den här veckan"
                                                className="h-8 text-sm"
                                                autoFocus={line.note === ""}
                                                onChange={(e) => setSession(line.sessionId, { note: e.target.value })}
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                aria-label={`Lägg till notering för ${session.title}`}
                                                className="cursor-pointer rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                                                onClick={() => setOpenNotes(new Set(openNotes).add(line.sessionId))}
                                            >
                                                + Notering
                                            </button>
                                        ))}
                                </ListRow>
                            )
                        })}
                    </ListFrame>
                )}
            </div>

            <FormField
                label="Mål"
                htmlFor="week-target"
                error={shownTargetError}
                hint={shownTargetError ? undefined : `Minst så många av de ${planned} passen. Tomt: alla.`}
                hintId="week-target-hint"
            >
                <Input
                    id="week-target"
                    inputMode="numeric"
                    className="w-24"
                    value={draft.target}
                    placeholder={String(planned)}
                    aria-invalid={shownTargetError !== undefined}
                    aria-describedby={shownTargetError ? fieldErrorId("week-target") : "week-target-hint"}
                    onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                />
            </FormField>

            {error && <FormError>{error}</FormError>}

            <FormActions>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sparar…" : "Spara"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Avbryt
                </Button>
            </FormActions>
        </FormLayout>
    )
}

/** How many times a session is in the week. It cannot go below what is already done. */
function CountStepper({
    label,
    value,
    min,
    onChange,
}: {
    label: string
    value: number
    min: number
    onChange: (value: number) => void
}) {
    const button =
        "flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/80 disabled:cursor-not-allowed disabled:opacity-40"
    return (
        <div role="group" aria-label={label} className="flex shrink-0 items-center rounded-lg border border-border">
            <button
                type="button"
                aria-label={`Färre ${label}`}
                className={button}
                disabled={value <= min}
                onClick={() => onChange(value - 1)}
            >
                <Minus className="size-4" />
            </button>
            <output aria-live="polite" className="w-7 text-center text-sm font-medium tabular-nums">
                {value}
            </output>
            <button
                type="button"
                aria-label={`Fler ${label}`}
                className={button}
                disabled={value >= 9}
                onClick={() => onChange(value + 1)}
            >
                <Plus className="size-4" />
            </button>
        </div>
    )
}

export default PlanWeekPage
