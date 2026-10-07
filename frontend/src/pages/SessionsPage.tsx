import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchSessions } from "@/api/sessions"
import type { Session } from "@/api/types"
import { performanceLabel, sessionTypeLabel, SEVERITY_LEVELS } from "@/api/types"
import { Button } from "@/components/ui/button"
import { GroupHeader, ListFrame, ListRow, RowChevron, RowLink } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { SegmentedControl, type SegmentedOption } from "@/components/system/SegmentedControl"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
import { LOCALE } from "@/lib/locale"
import { cn } from "@/lib/utils"

const KNOWN_TYPES = new Set(["boulder", "routes", "board", "hangboard", "strength", "rehab", "other"])

const VIEW_STORAGE_KEY = "cledger-sessions-view"

type ViewMode = "list" | "calendar"

const VIEW_OPTIONS: SegmentedOption<ViewMode>[] = [
    { value: "list", label: "Lista", title: "Visa som lista" },
    { value: "calendar", label: "Kalender", title: "Visa som kalender" },
]

function getStoredView(): ViewMode {
    try {
        const stored = localStorage.getItem(VIEW_STORAGE_KEY)
        if (stored === "list" || stored === "calendar") {
            return stored
        }
    } catch {
        // localStorage unavailable
    }
    return "list"
}

function getWeekLabel(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00")
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const fmt = (d: Date) =>
        d.toLocaleDateString(LOCALE, { month: "short", day: "numeric" })

    return `${fmt(monday)} – ${fmt(sunday)}`
}

function getWeekKey(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00")
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    return monday.toISOString().slice(0, 10)
}

function groupByWeek(sessions: Session[]): Map<string, Session[]> {
    const groups = new Map<string, Session[]>()
    for (const session of sessions) {
        const key = getWeekKey(session.date)
        const group = groups.get(key)
        if (group) {
            group.push(session)
        } else {
            groups.set(key, [session])
        }
    }
    return groups
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString(LOCALE, {
        weekday: "short",
        month: "short",
        day: "numeric",
    })
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function typePillClass(type: string): string {
    return KNOWN_TYPES.has(type) ? `type-${type}` : "type-other"
}

/** The type's hue, for text and bars in the calendar. */
function typeColor(type: string): string {
    return `var(--t-${KNOWN_TYPES.has(type) ? type : "other"})`
}

function rpeColor(value: number): string {
    if (value >= 8) {
        return "pill-orange"
    }
    if (value <= 4) {
        return "pill-blue"
    }
    return "pill-secondary"
}

function performanceColor(value: string): string {
    switch (value) {
        case "strong":
            return "pill-green"
        case "weak":
            return "pill-red"
        default:
            return "pill-secondary"
    }
}

function severityClass(severity: number | null): string {
    if (severity != null && severity >= 1 && severity <= 5) {
        return `pill-sev-${severity}`
    }
    return "pill-injury"
}

function severityLabel(severity: number | null): string {
    if (severity == null) {
        return ""
    }
    const level = SEVERITY_LEVELS.find((l) => l.value === severity)
    return level ? level.name : ""
}

// One size for every inline pill in a row (DESIGN.md: Pills and Badges)
const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold"

function SessionRow({ session }: { session: Session }) {
    return (
        <ListRow className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <RowLink to={`/sessions/${session.id}/edit`} className="text-sm font-medium">
                        {formatDate(session.date)}
                        {session.venue && (
                            <span className="ml-2 font-normal text-muted-foreground">
                                @ {session.venue}
                            </span>
                        )}
                    </RowLink>
                    <div className="flex flex-wrap gap-1.5">
                        {session.types.map((type) => (
                            <span key={type} className={cn("type-pill", PILL, typePillClass(type))}>
                                {sessionTypeLabel(type)}
                            </span>
                        ))}
                        {session.injuries.map((injury) => (
                            <span
                                key={injury.id}
                                className={cn(PILL, severityClass(injury.severity))}
                                title={injury.severity ? `Allvarlighetsgrad: ${severityLabel(injury.severity)}` : undefined}
                            >
                                {capitalize(injury.location)}
                                {injury.severity != null && (
                                    <span className="ml-1 opacity-75">({injury.severity})</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span title="Intensitet" className={cn(PILL, rpeColor(session.intensity))}>
                        RPE {session.intensity}
                    </span>
                    <span title="Prestation" className={cn(PILL, performanceColor(session.performance))}>
                        {performanceLabel(session.performance)}
                    </span>
                </div>
            </div>
            <RowChevron />
        </ListRow>
    )
}

const DAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"]

function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(month: Date, delta: number): Date {
    return new Date(month.getFullYear(), month.getMonth() + delta, 1)
}

/** ISO 8601 week number, as Swedish calendars show it. */
function isoWeek(date: Date): number {
    const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7))
    const firstThursday = new Date(thursday.getFullYear(), 0, 4)
    return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

/** The weeks (Monday first) that cover the month, each as seven dates. */
function monthWeeks(month: Date): Date[][] {
    const first = startOfMonth(month)
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7))
    const weeks: Date[][] = []
    const cursor = new Date(start)
    do {
        const week: Date[] = []
        for (let i = 0; i < 7; i++) {
            week.push(new Date(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }
        weeks.push(week)
    } while (cursor.getMonth() === first.getMonth())
    return weeks
}

function monthTitle(month: Date): string {
    return capitalize(month.toLocaleDateString(LOCALE, { month: "long", year: "numeric" }))
}

/**
 * A session in a calendar day: neutral, with each type named in its own hue.
 * On narrow screens, where a day is too small for words, a bar with one
 * colored segment per type.
 */
function CalendarSessionChip({ session }: { session: Session }) {
    const types = session.types.length > 0 ? session.types : ["other"]
    const description = `${types.map(sessionTypeLabel).join(", ")}${session.venue ? ` @ ${session.venue}` : ""}`
    return (
        <Link
            to={`/sessions/${session.id}/edit`}
            title={description}
            aria-label={`${description}, RPE ${session.intensity}`}
            className="block rounded-md outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:bg-accent/60 sm:px-1.5 sm:py-1 sm:hover:bg-accent"
        >
            <span aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full sm:hidden">
                {types.map((type) => (
                    <span key={type} className="flex-1" style={{ background: typeColor(type) }} />
                ))}
            </span>
            <span aria-hidden="true" className="hidden sm:block">
                <span className="block truncate text-[11px] font-semibold">
                    {types.map((type, index) => (
                        <span key={type}>
                            {index > 0 && <span className="text-dim"> · </span>}
                            <span style={{ color: typeColor(type) }}>{sessionTypeLabel(type)}</span>
                        </span>
                    ))}
                </span>
                {session.venue && (
                    <span className="block truncate text-[11px] text-muted-foreground">{session.venue}</span>
                )}
            </span>
        </Link>
    )
}

/**
 * A month calendar: weeks run top to bottom, days Monday to Sunday, with faint
 * lines between days and the ISO week number in front of each week.
 */
function CalendarView({ sessions }: { sessions: Session[] }) {
    const [month, setMonth] = useState(() => startOfMonth(new Date()))
    const todayKey = toDateKey(new Date())
    const isCurrentMonth = toDateKey(month) === toDateKey(startOfMonth(new Date()))

    const sessionsByDate = new Map<string, Session[]>()
    for (const session of sessions) {
        const list = sessionsByDate.get(session.date) ?? []
        list.push(session)
        sessionsByDate.set(session.date, list)
    }
    const monthPrefix = toDateKey(month).slice(0, 7)
    const monthCount = sessions.filter((s) => s.date.startsWith(monthPrefix)).length

    return (
        <section className="space-y-3" data-testid="calendar-view" aria-labelledby="calendar-month">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h2 id="calendar-month" aria-live="polite" className="font-display text-xl">
                        {monthTitle(month)}
                    </h2>
                    <span className="text-xs text-dim">{monthCount} pass</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={isCurrentMonth} onClick={() => setMonth(startOfMonth(new Date()))}>
                        Idag
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Föregående månad" onClick={() => setMonth(addMonths(month, -1))}>
                        <ChevronLeft />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Nästa månad" onClick={() => setMonth(addMonths(month, 1))}>
                        <ChevronRight />
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full table-fixed border-collapse">
                    <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">
                            <th scope="col" className="w-7 py-2 font-semibold sm:w-9">
                                <span className="sr-only">Vecka</span>
                                <span aria-hidden="true">v.</span>
                            </th>
                            {DAY_LABELS.map((label) => (
                                <th key={label} scope="col" className="py-2 font-semibold">
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {monthWeeks(month).map((week) => (
                            <tr key={toDateKey(week[0])} data-testid="calendar-week">
                                <th
                                    scope="row"
                                    className="border-t border-border/60 pt-1.5 align-top text-[11px] font-medium tabular-nums text-dim"
                                >
                                    <span className="sr-only">Vecka </span>
                                    {isoWeek(week[0])}
                                </th>
                                {week.map((day) => {
                                    const key = toDateKey(day)
                                    const daySessions = sessionsByDate.get(key) ?? []
                                    const isToday = key === todayKey
                                    const inMonth = day.getMonth() === month.getMonth()
                                    return (
                                        <td
                                            key={key}
                                            data-testid={`calendar-cell-${key}`}
                                            aria-current={isToday ? "date" : undefined}
                                            className="h-20 border-t border-l border-border/60 p-1 align-top sm:h-24 sm:p-1.5"
                                        >
                                            <div className={cn("flex flex-col gap-1", !inMonth && "opacity-45")}>
                                                <span
                                                    data-testid={isToday ? "calendar-today" : undefined}
                                                    className={cn(
                                                        "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                                                        isToday ? "bg-accent font-semibold text-foreground" : "text-muted-foreground",
                                                    )}
                                                >
                                                    {isToday && <span className="sr-only">Idag, </span>}
                                                    {day.getDate()}
                                                </span>
                                                {daySessions.map((session) => (
                                                    <CalendarSessionChip key={session.id} session={session} />
                                                ))}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function SessionsPage() {
    const [view, setView] = useState<ViewMode>(getStoredView)

    const sessionsQuery = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })
    const sessions = sessionsQuery.data

    function handleViewChange(newView: ViewMode) {
        setView(newView)
        try {
            localStorage.setItem(VIEW_STORAGE_KEY, newView)
        } catch {
            // localStorage unavailable
        }
    }

    const weekGroups = sessions ? Array.from(groupByWeek(sessions)) : []

    return (
        <div className="space-y-7">
            <PageHeader
                title="Pass"
                actions={
                    <>
                        <SegmentedControl
                            aria-label="Visning av pass"
                            value={view}
                            onChange={handleViewChange}
                            options={VIEW_OPTIONS}
                        />
                        <Button asChild>
                            <Link to="/sessions/new">
                                <span aria-hidden="true">+</span> Logga pass
                            </Link>
                        </Button>
                    </>
                }
            />

            {sessionsQuery.isLoading && <LoadingState>Laddar pass…</LoadingState>}

            {sessionsQuery.isError && (
                <ErrorState onRetry={() => sessionsQuery.refetch()}>Kunde inte ladda pass.</ErrorState>
            )}

            {sessions && sessions.length === 0 && (
                <EmptyState>Inga pass än. Börja logga din träning.</EmptyState>
            )}

            {sessions && sessions.length > 0 && view === "list" && (
                <div className="space-y-7">
                    {weekGroups.map(([weekKey, weekSessions]) => (
                        <section key={weekKey}>
                            <GroupHeader count={`${weekSessions.length} pass`}>
                                {getWeekLabel(weekSessions[0].date)}
                            </GroupHeader>
                            <ListFrame>
                                {weekSessions.map((session) => (
                                    <SessionRow
                                        key={session.id}
                                        session={session}
                                    />
                                ))}
                            </ListFrame>
                        </section>
                    ))}
                </div>
            )}

            {sessions && sessions.length > 0 && view === "calendar" && (
                <CalendarView sessions={sessions} />
            )}
        </div>
    )
}

export default SessionsPage
