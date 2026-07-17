import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchSessions } from "@/api/sessions"
import type { Session } from "@/api/types"
import { SEVERITY_LEVELS } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const SESSION_TYPE_ABBREV: Record<string, string> = {
    boulder: "B",
    routes: "R",
    board: "Bd",
    hangboard: "H",
    strength: "S",
    prehab: "P",
    other: "O",
}

const VIEW_STORAGE_KEY = "cledger-sessions-view"

type ViewMode = "list" | "calendar"

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
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

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
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    })
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function accentClass(types: string[]): string {
    const primary = types[0]
    if (primary) {
        return `accent-${primary}`
    }
    return "accent-other"
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

function severityColor(severity: number | null): string {
    switch (severity) {
        case 1:
            return "bg-green-600/15 text-green-600 dark:text-green-400 border-green-600/20"
        case 2:
            return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
        case 3:
            return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20"
        case 4:
            return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
        case 5:
            return "bg-red-800/15 text-red-700 dark:text-red-300 border-red-800/20"
        default:
            return ""
    }
}

function severityLabel(severity: number | null): string {
    if (severity == null) {
        return ""
    }
    const level = SEVERITY_LEVELS.find((l) => l.value === severity)
    return level ? level.name : ""
}

function SessionRow({ session, delayMs }: { session: Session; delayMs: number }) {
    return (
        <Link
            to={`/sessions/${session.id}/edit`}
            className="anim-fade-up block"
            style={{ animationDelay: `${delayMs}ms` }}
        >
            <div
                className={cn(
                    "session-card flex flex-col gap-2 rounded-[14px] border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                    accentClass(session.types)
                )}
            >
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold">
                        {formatDate(session.date)}
                        {session.venue && (
                            <span className="ml-2 font-normal text-muted-foreground">
                                @ {session.venue}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {session.types.map((type) => (
                            <span
                                key={type}
                                className={`type-pill px-2.5 py-0.5 text-[11px] ${typePillClass(type)}`}
                            >
                                {capitalize(type)}
                            </span>
                        ))}
                        {session.injuries.map((injury) => (
                            <Badge
                                key={injury.id}
                                variant="outline"
                                className={`rounded-full text-xs ${severityColor(injury.severity) || "pill-injury"}`}
                                title={injury.severity ? `Severity: ${severityLabel(injury.severity)}` : undefined}
                            >
                                {capitalize(injury.location)}
                                {injury.severity != null && (
                                    <span className="ml-1 opacity-75">({injury.severity})</span>
                                )}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        title="Intensity"
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${rpeColor(session.intensity)}`}
                    >
                        RPE {session.intensity}
                    </span>
                    <span
                        title="Performance"
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${performanceColor(session.performance)}`}
                    >
                        {capitalize(session.performance)}
                    </span>
                    <span aria-hidden="true" className="ml-1 hidden text-lg leading-none text-dim sm:block">
                        ›
                    </span>
                </div>
            </div>
        </Link>
    )
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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

function CalendarSessionChip({ session, delayMs }: { session: Session; delayMs: number }) {
    return (
        <Link
            to={`/sessions/${session.id}/edit`}
            className={cn(
                "cal-chip anim-pop-in block rounded-[9px] border border-border bg-accent px-2 py-1.5",
                accentClass(session.types)
            )}
            style={{ animationDelay: `${delayMs}ms` }}
            title={`${session.types.map(capitalize).join(", ")}${session.venue ? ` @ ${session.venue}` : ""}`}
        >
            <div className="flex items-center justify-between gap-1">
                {session.venue && (
                    <span className="truncate text-[11px] font-semibold">
                        {session.venue}
                    </span>
                )}
                <span aria-hidden="true" className="ml-auto text-xs leading-none text-dim">
                    ›
                </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
                {session.types.map((type) => (
                    <span
                        key={type}
                        className={`type-pill px-1.5 py-px text-[9px] font-bold ${typePillClass(type)}`}
                    >
                        {SESSION_TYPE_ABBREV[type] ?? type.charAt(0).toUpperCase()}
                    </span>
                ))}
                <span className="ml-auto text-[9px] font-semibold text-dim">
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
        <div className="space-y-5" data-testid="calendar-view">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">
                {DAY_LABELS.map((label) => (
                    <div key={label} className="py-1">{label}</div>
                ))}
            </div>
            {weekRows.map((week, weekIndex) => {
                const weekKey = toDateKey(week.monday)
                return (
                    <div
                        key={weekKey}
                        className="anim-fade-up"
                        style={{ animationDelay: `${weekIndex * 70}ms` }}
                    >
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                            {getWeekLabel(weekKey)}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {week.days.map((daySessions, dayIndex) => {
                                const cellDate = new Date(week.monday)
                                cellDate.setDate(week.monday.getDate() + dayIndex)
                                const cellKey = toDateKey(cellDate)
                                const isToday = cellKey === todayKey

                                return (
                                    <div
                                        key={cellKey}
                                        data-testid={`calendar-cell-${cellKey}`}
                                        className={cn(
                                            "flex min-h-[86px] flex-col gap-1 rounded-xl p-1.5 transition-colors sm:p-2",
                                            isToday
                                                ? "ring-1 ring-primary bg-primary/8"
                                                : daySessions
                                                    ? "border border-border bg-card"
                                                    : "border border-dashed border-border/60"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            {isToday && (
                                                <span className="text-[9px] font-bold tracking-[0.1em] text-primary">
                                                    TODAY
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    "ml-auto rounded-full px-1.5 text-[11px] font-semibold",
                                                    isToday
                                                        ? "bg-primary text-primary-foreground"
                                                        : daySessions
                                                            ? "text-foreground"
                                                            : "text-dim"
                                                )}
                                            >
                                                {cellDate.getDate()}
                                            </span>
                                        </div>
                                        {daySessions && daySessions.map((session, sessionIndex) => (
                                            <CalendarSessionChip
                                                key={session.id}
                                                session={session}
                                                delayMs={weekIndex * 70 + (dayIndex + sessionIndex) * 40}
                                            />
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function SessionsPage() {
    const [view, setView] = useState<ViewMode>(getStoredView)

    const { data: sessions, isLoading, isError } = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })

    function handleViewChange(newView: ViewMode) {
        setView(newView)
        try {
            localStorage.setItem(VIEW_STORAGE_KEY, newView)
        } catch {
            // localStorage unavailable
        }
    }

    const weekGroups = sessions ? Array.from(groupByWeek(sessions)) : []
    const weekOffsets: number[] = []
    let runningOffset = 0
    for (const [, weekSessions] of weekGroups) {
        weekOffsets.push(runningOffset)
        runningOffset += weekSessions.length
    }

    return (
        <div className="space-y-7">
            <div className="anim-fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-4xl">Sessions</h2>
                <div className="flex items-center gap-3">
                    <Tabs value={view} onValueChange={(v) => handleViewChange(v as ViewMode)}>
                        <TabsList className="h-auto gap-0.5 rounded-[11px] border border-border bg-card p-[3px]">
                            <TabsTrigger
                                value="list"
                                title="List view"
                                className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium data-[state=active]:bg-accent"
                            >
                                List
                            </TabsTrigger>
                            <TabsTrigger
                                value="calendar"
                                title="Calendar view"
                                className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium data-[state=active]:bg-accent"
                            >
                                Calendar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button asChild>
                        <Link to="/sessions/new">
                            <span aria-hidden="true">+</span> Log Session
                        </Link>
                    </Button>
                </div>
            </div>

            {isLoading && (
                <p className="text-muted-foreground">Loading sessions...</p>
            )}

            {isError && (
                <p className="text-destructive">Failed to load sessions.</p>
            )}

            {sessions && sessions.length === 0 && (
                <p className="text-muted-foreground">
                    No sessions yet. Start logging your training!
                </p>
            )}

            {sessions && sessions.length > 0 && view === "list" && (
                <div className="space-y-8">
                    {weekGroups.map(([weekKey, weekSessions], weekIndex) => (
                        <div
                            key={weekKey}
                            className="anim-fade-up"
                            style={{ animationDelay: `${weekIndex * 90}ms` }}
                        >
                            <h3 className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                {getWeekLabel(weekSessions[0].date)}
                                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                                <span className="font-normal normal-case tracking-normal text-dim">
                                    {weekSessions.length}{" "}
                                    {weekSessions.length === 1 ? "session" : "sessions"}
                                </span>
                            </h3>
                            <div className="flex flex-col gap-2.5">
                                {weekSessions.map((session, sessionIndex) => (
                                    <SessionRow
                                        key={session.id}
                                        session={session}
                                        delayMs={(weekOffsets[weekIndex] + sessionIndex) * 50}
                                    />
                                ))}
                            </div>
                        </div>
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
