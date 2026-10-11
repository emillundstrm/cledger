import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Check, Circle } from "lucide-react"
import { fetchCurrentPlanWeek, fetchTrainingPlan } from "@/api/plans"
import type { CurrentPlanWeek, PlanWeekItem, TrainingPlan } from "@/api/types"
import { PLAN_CATEGORY_LABELS, PLAN_PHASE_LABELS, sessionTypeLabel } from "@/api/types"
import { Button } from "@/components/ui/button"
import { GroupHeader, ListFrame, ListRow, RowButton, RowChevron, RowControls } from "@/components/system/List"
import NoteMarkdown from "@/components/notes/NoteMarkdown"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
import { weekGoal } from "@/lib/plans/week"
import { todayLocal } from "@/lib/dates"
import { LOCALE } from "@/lib/locale"
import { cn } from "@/lib/utils"

// One size for every inline pill in a row (DESIGN.md: Pills and Badges)
const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold"

function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Date(date + "T00:00:00").toLocaleDateString(LOCALE, options)
}

/** "12–18 okt", or "27 okt – 2 nov" across a month boundary. */
function formatRange(start: string, end: string): string {
    if (start.slice(0, 7) === end.slice(0, 7)) {
        return `${formatDay(start, { day: "numeric" })}–${formatDay(end, { day: "numeric", month: "short" })}`
    }
    return `${formatDay(start, { day: "numeric", month: "short" })} – ${formatDay(end, { day: "numeric", month: "short" })}`
}

function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}

function PlanPage() {
    const today = todayLocal()
    const weekQuery = useQuery({
        queryKey: ["planWeek", today],
        queryFn: () => fetchCurrentPlanWeek(today),
    })
    const planQuery = useQuery({
        queryKey: ["trainingPlan"],
        queryFn: () => fetchTrainingPlan(),
    })

    const logAction = (
        <Button asChild>
            <Link to="/sessions/new">
                <span aria-hidden="true">+</span> Logga pass
            </Link>
        </Button>
    )

    if (weekQuery.isLoading || planQuery.isLoading) {
        return (
            <div className="space-y-7">
                <PageHeader title="Plan" />
                <LoadingState>Laddar planen…</LoadingState>
            </div>
        )
    }

    if (weekQuery.isError || planQuery.isError) {
        return (
            <div className="space-y-7">
                <PageHeader title="Plan" />
                <ErrorState
                    onRetry={() => {
                        weekQuery.refetch()
                        planQuery.refetch()
                    }}
                >
                    Kunde inte ladda planen.
                </ErrorState>
            </div>
        )
    }

    const plan = planQuery.data ?? null
    const week = weekQuery.data ?? null

    if (!plan) {
        return (
            <div className="space-y-7">
                <PageHeader title="Plan" />
                <EmptyState>Ingen aktiv träningsplan. Be assistenten lägga upp en.</EmptyState>
            </div>
        )
    }

    return (
        <div className="space-y-7">
            <PageHeader
                title={plan.title}
                subtitle={plan.goal ?? undefined}
                actions={logAction}
            />
            {week ? <ThisWeek week={week} /> : <OutsidePlan plan={plan} today={today} />}
            <PlanWeeks plan={plan} currentWeek={week?.week ?? null} />
        </div>
    )
}

function ThisWeek({ week }: { week: CurrentPlanWeek }) {
    const goal = weekGoal(week)
    const left = Math.max(goal - week.doneCount, 0)

    return (
        <section aria-labelledby="this-week" className="space-y-5">
            <div className="space-y-2">
                <h2 id="this-week" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                        Vecka {week.week} av {week.weekCount}
                    </span>
                    <span>{formatRange(week.startDate, week.endDate)}</span>
                    <span className={cn(PILL, "bg-accent text-foreground")}>{PLAN_PHASE_LABELS[week.phase]}</span>
                </h2>
                <p className="flex items-baseline gap-3">
                    <span className="font-display text-6xl leading-none tabular-nums">{week.doneCount}</span>
                    <span className="text-sm text-muted-foreground">
                        {week.targetCount !== null
                            ? `av ${goal} · ${week.plannedCount} planerade`
                            : `av ${goal} planerade`}
                    </span>
                </p>
                {week.focus && <p className="text-sm text-muted-foreground">{week.focus}</p>}
            </div>

            <div>
                <GroupHeader count={left > 0 ? `${left} kvar` : "Veckan är klar"}>Veckans pass</GroupHeader>
                {week.items.length === 0 ? (
                    <EmptyState>Inga pass planerade den här veckan.</EmptyState>
                ) : (
                    <ListFrame aria-label="Veckans pass">
                        {week.items.map((item) => (
                            <PlanItemRow key={`${item.entryId}-${item.slot}`} item={item} />
                        ))}
                    </ListFrame>
                )}
            </div>
        </section>
    )
}

/** First line of a template's description, as a preview. */
function firstLine(text: string | null): string | null {
    const line = text?.split("\n").find((l) => l.trim() !== "")
    return line ? line.replace(/^[#>*\-\s]+/, "").trim() : null
}

function PlanItemRow({ item }: { item: PlanWeekItem }) {
    const [open, setOpen] = useState(false)
    const done = item.sessionId !== null
    const preview = item.note ?? firstLine(item.description)

    return (
        <ListRow>
            <RowButton expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 text-sm">
                {done ? (
                    <Check aria-label="Klart" className="mt-0.5 size-4 shrink-0 text-good" />
                ) : (
                    <Circle aria-label="Kvar" className="mt-0.5 size-4 shrink-0 text-dim" />
                )}
                <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn("font-medium", done && "text-muted-foreground line-through")}>
                            {item.title}
                        </span>
                        <span className="text-xs text-dim">{PLAN_CATEGORY_LABELS[item.category]}</span>
                        {done && (
                            <span className="ml-auto text-xs text-dim">
                                {formatDay(item.sessionDate!, { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                        )}
                    </span>
                    {!open && !done && preview && (
                        <span className="line-clamp-2 block text-muted-foreground">{preview}</span>
                    )}
                </span>
                <span className="mt-0.5">
                    <RowChevron expanded={open} />
                </span>
            </RowButton>

            {open && (
                <RowControls className="mt-3 space-y-3 pl-7">
                    {item.note && (
                        <p className="text-sm">
                            <span className="font-medium">Den här veckan: </span>
                            {item.note}
                        </p>
                    )}
                    {item.description ? (
                        <div className="text-sm">
                            <NoteMarkdown content={item.description} />
                        </div>
                    ) : (
                        !item.note && <p className="text-sm text-muted-foreground">Ingen beskrivning.</p>
                    )}
                    {item.sessionTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {item.sessionTypes.map((type) => (
                                <span key={type} className={cn("type-pill", PILL, `type-${type}`)}>
                                    {sessionTypeLabel(type)}
                                </span>
                            ))}
                        </div>
                    )}
                    <div>
                        {done ? (
                            <Button asChild variant="outline" size="sm">
                                <Link to={`/sessions/${item.sessionId}/edit`}>Visa passet</Link>
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <Link to={`/sessions/new?plan=${item.entryId}`}>Logga det här passet</Link>
                            </Button>
                        )}
                    </div>
                </RowControls>
            )}
        </ListRow>
    )
}

function OutsidePlan({ plan, today }: { plan: TrainingPlan; today: string }) {
    if (today < plan.startDate) {
        return (
            <EmptyState>
                Planen börjar {formatDay(plan.startDate, { weekday: "long", day: "numeric", month: "long" })}.
            </EmptyState>
        )
    }
    return <EmptyState>Planens sista vecka är slut. Be assistenten om nästa plan.</EmptyState>
}

/** The plan's weeks at a glance: phase and how much of each was done. */
function PlanWeeks({ plan, currentWeek }: { plan: TrainingPlan; currentWeek: number | null }) {
    return (
        <section aria-labelledby="plan-weeks">
            <GroupHeader count={`${plan.weeks.length} veckor`}>
                <span id="plan-weeks">Planens veckor</span>
            </GroupHeader>
            <ListFrame aria-label="Planens veckor">
                {plan.weeks.map((week) => {
                    const isCurrent = week.week === currentWeek
                    const isPast = currentWeek !== null ? week.week < currentWeek : false
                    return (
                        <ListRow
                            key={week.week}
                            interactive={false}
                            aria-current={isCurrent ? "true" : undefined}
                            className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", isCurrent && "bg-accent/60")}
                        >
                            <span className="w-20 text-sm font-medium">Vecka {week.week}</span>
                            <span className="text-xs text-dim">
                                {formatRange(week.startDate, addDays(week.startDate, 6))}
                            </span>
                            <span className={cn(PILL, "bg-accent text-foreground")}>{PLAN_PHASE_LABELS[week.phase]}</span>
                            {week.focus && <span className="min-w-0 text-sm text-muted-foreground">{week.focus}</span>}
                            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                                {isPast || isCurrent
                                    ? `${week.doneCount} av ${weekGoal(week)}`
                                    : `${week.plannedCount} pass`}
                            </span>
                        </ListRow>
                    )
                })}
            </ListFrame>
        </section>
    )
}

export default PlanPage
