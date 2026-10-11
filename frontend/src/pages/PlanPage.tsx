import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Check, Circle } from "lucide-react"
import { fetchCurrentPlanWeek, fetchTrainingPlan } from "@/api/plans"
import type { CurrentPlanWeek, PlanSession, PlanWeek, PlanWeekItem, TrainingPlan } from "@/api/types"
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

/** "12–18 okt", or "27 okt – 2 nov" across a month boundary ("27 okt–2 nov" when compact). */
function formatRange(start: string, end: string, compact = false): string {
    if (start.slice(0, 7) === end.slice(0, 7)) {
        return `${formatDay(start, { day: "numeric" })}–${formatDay(end, { day: "numeric", month: "short" })}`
    }
    const dash = compact ? "–" : " – "
    return `${formatDay(start, { day: "numeric", month: "short" })}${dash}${formatDay(end, { day: "numeric", month: "short" })}`
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
            <PlanWeeks plan={plan} currentWeek={week?.week ?? null} today={today} />
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

/** The plan's weeks at a glance: phase and how much of each was done. A week
 * expands to its focus and the sessions in its bucket. On a phone the dates
 * move into the expanded part, to keep the row on one line. Before the plan starts,
 * week 1 is open, since there is no current week above to show it. */
function PlanWeeks({ plan, currentWeek, today }: { plan: TrainingPlan; currentWeek: number | null; today: string }) {
    const firstOpen = today < plan.startDate ? 1 : null
    return (
        <section aria-labelledby="plan-weeks">
            <GroupHeader count={`${plan.weeks.length} veckor`}>
                <span id="plan-weeks">Planens veckor</span>
            </GroupHeader>
            <ListFrame aria-label="Planens veckor">
                {plan.weeks.map((week) => (
                    <PlanWeekRow
                        key={week.week}
                        week={week}
                        sessions={plan.sessions}
                        isCurrent={week.week === currentWeek}
                        isPast={currentWeek !== null ? week.week < currentWeek : today > plan.startDate}
                        defaultOpen={week.week === firstOpen}
                    />
                ))}
            </ListFrame>
        </section>
    )
}

function PlanWeekRow({
    week,
    sessions,
    isCurrent,
    isPast,
    defaultOpen,
}: {
    week: PlanWeek
    sessions: PlanSession[]
    isCurrent: boolean
    isPast: boolean
    defaultOpen: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    const started = isPast || isCurrent
    const range = formatRange(week.startDate, addDays(week.startDate, 6), true)
    const contents = sessions
        .filter((session) => !session.archived)
        .flatMap((session) => {
            const entry = session.entries.find((e) => e.week === week.week)
            return entry ? [{ session, entry }] : []
        })

    return (
        <ListRow aria-current={isCurrent ? "true" : undefined} className={cn(isCurrent && "bg-accent/60")}>
            <RowButton expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2">
                <span className="min-w-14 shrink-0 whitespace-nowrap text-sm font-medium">Vecka {week.week}</span>
                <span className="hidden min-w-0 truncate text-xs text-dim sm:inline">{range}</span>
                <span className={cn(PILL, "bg-accent text-foreground")}>{PLAN_PHASE_LABELS[week.phase]}</span>
                <span className="ml-auto whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                    {started ? `${week.doneCount} av ${weekGoal(week)}` : `${week.plannedCount} pass`}
                </span>
                <RowChevron expanded={open} />
            </RowButton>

            {open && (
                <RowControls className="mt-3 space-y-2 text-sm">
                    {/* A phone has no room for the dates in the row */}
                    <p className="text-xs text-dim sm:hidden">{range}</p>
                    {week.focus && <p className="text-muted-foreground">{week.focus}</p>}
                    {week.targetCount !== null && (
                        <p className="text-muted-foreground">
                            Mål: minst {week.targetCount} av {week.plannedCount}
                        </p>
                    )}
                    {contents.length === 0 ? (
                        <p className="text-muted-foreground">Inga pass planerade.</p>
                    ) : (
                        <ul className="space-y-1">
                            {contents.map(({ session, entry }) => {
                                const done = started && entry.doneCount >= entry.count
                                return (
                                    <li key={entry.id} className="flex items-baseline gap-2">
                                        <span className={cn("font-medium", done && "text-muted-foreground line-through")}>
                                            {session.title}
                                        </span>
                                        {entry.count > 1 && (
                                            <span className="tabular-nums text-muted-foreground">
                                                {started ? `${Math.min(entry.doneCount, entry.count)} av ${entry.count}` : `×${entry.count}`}
                                            </span>
                                        )}
                                        <span className="text-xs text-dim">{PLAN_CATEGORY_LABELS[session.category]}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </RowControls>
            )}
        </ListRow>
    )
}

export default PlanPage
