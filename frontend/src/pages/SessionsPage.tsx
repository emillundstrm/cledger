import { useState } from "react"
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
import { TypeDots } from "@/components/system/TypeDots"
import { LOCALE } from "@/lib/locale"
import { cn } from "@/lib/utils"

const SESSION_TYPE_ABBREV: Record<string, string> = {
    boulder: "B",
    routes: "L",
    board: "Bd",
    hangboard: "F",
    strength: "S",
    rehab: "R",
    other: "Ö",
}

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
    if (SESSION_TYPE_ABBREV[type]) {
        return `type-${type}`
    }
    return "type-other"
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
            <TypeDots types={session.types} />
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

function getMondayOfWeek(dateStr: string): Date {
    const date = new Date(dateStr + "T00:00:00")
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - ((day + 6) % 7))
    return monday
}

function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function getTodayKey(): string {
    return toDateKey(new Date())
}

function getWeekRows(sessions: Session[]): { monday: Date; days: (Session[] | null)[] }[] {
    const sessionsByDate = new Map<string, Session[]>()
    for (const session of sessions) {
        const key = session.date
        const list = sessionsByDate.get(key) ?? []
        list.push(session)
        sessionsByDate.set(key, list)
    }

    const weekMap = new Map<string, Date>()
    for (const session of sessions) {
        const monday = getMondayOfWeek(session.date)
        const key = toDateKey(monday)
        if (!weekMap.has(key)) {
            weekMap.set(key, monday)
        }
    }

    const sortedWeeks = Array.from(weekMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))

    return sortedWeeks.map(([, monday]) => {
        const days: (Session[] | null)[] = []
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday)
            day.setDate(monday.getDate() + i)
            const key = toDateKey(day)
            days.push(sessionsByDate.get(key) ?? null)
        }
        return { monday, days }
    })
}

function typeAbbrev(type: string): string {
    return SESSION_TYPE_ABBREV[type] ?? type.charAt(0).toUpperCase()
}

// A tinted chip in the session's primary type hue: no border, no lift
function CalendarSessionChip({ session }: { session: Session }) {
    const description = `${session.types.map(sessionTypeLabel).join(", ")}${session.venue ? ` @ ${session.venue}` : ""}`
    return (
        <Link
            to={`/sessions/${session.id}/edit`}
            className={cn(
                "block rounded-[10px] px-1.5 py-1 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-2",
                typePillClass(session.types[0] ?? "other")
            )}
            title={description}
            aria-label={`${description}, RPE ${session.intensity}`}
        >
            <div className="flex min-w-0 items-center gap-1">
                <TypeDots types={session.types} />
                {session.venue && (
                    <span className="truncate text-[11px] font-semibold">
                        {session.venue}
                    </span>
                )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[9px] font-bold">
                {session.types.map((type) => (
                    <span key={type}>{typeAbbrev(type)}</span>
                ))}
                <span className="ml-auto font-semibold opacity-80">
                    RPE {session.intensity}
                </span>
            </div>
        </Link>
    )
}

function CalendarView({ sessions }: { sessions: Session[] }) {
    const todayKey = getTodayKey()
    const weekRows = getWeekRows(sessions)

    return (
        <div className="space-y-7" data-testid="calendar-view">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">
                {DAY_LABELS.map((label) => (
                    <div key={label} className="py-1">{label}</div>
                ))}
            </div>
            {weekRows.map((week) => {
                const weekKey = toDateKey(week.monday)
                const count = week.days.reduce((sum, day) => sum + (day?.length ?? 0), 0)
                return (
                    <section key={weekKey} data-testid="calendar-week">
                        <GroupHeader count={`${count} pass`}>{getWeekLabel(weekKey)}</GroupHeader>
                        <div className="grid grid-cols-7 gap-1.5">
                            {week.days.map((daySessions, dayIndex) => {
                                const cellDate = new Date(week.monday)
                                cellDate.setDate(week.monday.getDate() + dayIndex)
                                const cellKey = toDateKey(cellDate)
                                const isToday = cellKey === todayKey

                                // Every day is the same plain cell; today is only a Wash pill behind the date
                                return (
                                    <div
                                        key={cellKey}
                                        data-testid={`calendar-cell-${cellKey}`}
                                        aria-current={isToday ? "date" : undefined}
                                        className="flex min-h-[86px] min-w-0 flex-col gap-1 border-t border-border/60 pt-1.5"
                                    >
                                        <div className="flex justify-end">
                                            <span
                                                data-testid={isToday ? "calendar-today" : undefined}
                                                className={cn(
                                                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                                                    isToday
                                                        ? "bg-accent text-foreground"
                                                        : daySessions
                                                            ? "text-foreground"
                                                            : "text-dim"
                                                )}
                                            >
                                                {isToday && <span className="sr-only">Idag, </span>}
                                                {cellDate.getDate()}
                                            </span>
                                        </div>
                                        {daySessions && daySessions.map((session) => (
                                            <CalendarSessionChip
                                                key={session.id}
                                                session={session}
                                            />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )
            })}
        </div>
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
