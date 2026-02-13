import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchSessions } from "@/api/sessions"
import type { Session } from "@/api/types"
import { SEVERITY_LEVELS } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, CalendarDays } from "lucide-react"

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

function rpeColor(value: number): string {
    if (value >= 8) {
        return "bg-orange-600/20 text-orange-700 dark:text-orange-400"
    }
    if (value <= 4) {
        return "bg-blue-600/20 text-blue-700 dark:text-blue-400"
    }
    return "bg-secondary text-secondary-foreground"
}

function performanceColor(value: string): string {
    switch (value) {
        case "strong":
            return "bg-green-600/20 text-green-700 dark:text-green-400"
        case "weak":
            return "bg-red-500/20 text-red-700 dark:text-red-400"
        default:
            return "bg-secondary text-secondary-foreground"
    }
}

function severityColor(severity: number | null): string {
    switch (severity) {
        case 1:
            return "bg-green-600/20 text-green-700 dark:text-green-400 border-green-600/30"
        case 2:
            return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
        case 3:
            return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
        case 4:
            return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
        case 5:
            return "bg-red-800/20 text-red-900 dark:text-red-300 border-red-800/30"
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

function SessionRow({ session }: { session: Session }) {
    return (
        <Link to={`/sessions/${session.id}/edit`} className="block">
            <Card className="py-3 hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="font-medium text-sm">
                            {formatDate(session.date)}
                            {session.venue && (
                                <span className="ml-2 text-muted-foreground font-normal">
                                    @ {session.venue}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {session.types.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {capitalize(type)}
                                </Badge>
                            ))}
                            {session.injuries.map((injury) => (
                                <Badge
                                    key={injury.id}
                                    variant="outline"
                                    className={severityColor(injury.severity) || "bg-destructive/20 text-destructive border-destructive/30"}
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
                    <div className="flex gap-1.5 text-sm">
                        <Badge className={rpeColor(session.intensity)} title="Intensity">
                            RPE {session.intensity}
                        </Badge>
                        <Badge className={performanceColor(session.performance)} title="Performance">
                            {capitalize(session.performance)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
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

function CalendarView({ sessions }: { sessions: Session[] }) {
    const todayKey = getTodayKey()
    const weekRows = getWeekRows(sessions)

    return (
        <div className="space-y-4" data-testid="calendar-view">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {DAY_LABELS.map((label) => (
                    <div key={label} className="py-1">{label}</div>
                ))}
            </div>
            {weekRows.map((week) => {
                const weekKey = toDateKey(week.monday)
                return (
                    <div key={weekKey}>
                        <div className="text-xs text-muted-foreground mb-1">
                            {getWeekLabel(weekKey)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {week.days.map((daySessions, dayIndex) => {
                                const cellDate = new Date(week.monday)
                                cellDate.setDate(week.monday.getDate() + dayIndex)
                                const cellKey = toDateKey(cellDate)
                                const isToday = cellKey === todayKey

                                return (
                                    <div
                                        key={cellKey}
                                        data-testid={`calendar-cell-${cellKey}`}
                                        className={`min-h-16 rounded-md border p-1 text-xs ${
                                            isToday
                                                ? "border-primary bg-primary/10"
                                                : "border-border"
                                        } ${
                                            daySessions ? "bg-accent/30" : ""
                                        }`}
                                    >
                                        <div className={`text-right text-[10px] mb-0.5 ${
                                            isToday ? "font-bold text-primary" : "text-muted-foreground"
                                        }`}>
                                            {cellDate.getDate()}
                                        </div>
                                        {daySessions && daySessions.map((session) => (
                                            <Link
                                                key={session.id}
                                                to={`/sessions/${session.id}/edit`}
                                                className="block hover:bg-accent rounded px-0.5 py-0.5 transition-colors"
                                                title={`${session.types.map(capitalize).join(", ")}${session.venue ? ` @ ${session.venue}` : ""}`}
                                            >
                                                {session.venue && (
                                                    <div className="text-[10px] text-muted-foreground truncate">
                                                        {session.venue}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-0.5">
                                                    {session.types.map((type) => (
                                                        <span
                                                            key={type}
                                                            className="inline-block rounded bg-secondary px-1 text-[10px] font-medium text-secondary-foreground"
                                                        >
                                                            {SESSION_TYPE_ABBREV[type] ?? type.charAt(0).toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </Link>
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Sessions</h2>
                <div className="flex items-center gap-2">
                    <Tabs value={view} onValueChange={(v) => handleViewChange(v as ViewMode)}>
                        <TabsList>
                            <TabsTrigger value="list" title="List view">
                                <List className="size-4" />
                            </TabsTrigger>
                            <TabsTrigger value="calendar" title="Calendar view">
                                <CalendarDays className="size-4" />
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button asChild>
                        <Link to="/sessions/new">Log Session</Link>
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
                <div className="space-y-6">
                    {Array.from(groupByWeek(sessions)).map(([weekKey, weekSessions]) => (
                        <div key={weekKey} className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {getWeekLabel(weekSessions[0].date)}
                            </h3>
                            <div className="space-y-2">
                                {weekSessions.map((session) => (
                                    <SessionRow key={session.id} session={session} />
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
