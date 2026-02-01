import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchSessions } from "@/api/sessions"
import type { Session } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

function intensityColor(value: string): string {
    switch (value) {
        case "hard":
            return "bg-orange-600/20 text-orange-700 dark:text-orange-400"
        case "easy":
            return "bg-amber-500/20 text-amber-700 dark:text-amber-400"
        default:
            return "bg-secondary text-secondary-foreground"
    }
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

function productivityColor(value: string): string {
    switch (value) {
        case "high":
            return "bg-green-600/20 text-green-700 dark:text-green-400"
        case "low":
            return "bg-red-500/20 text-red-700 dark:text-red-400"
        default:
            return "bg-secondary text-secondary-foreground"
    }
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
                                <Badge key={injury.id} variant="destructive">
                                    {capitalize(injury.location)}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-1.5 text-sm">
                        <Badge className={intensityColor(session.intensity)} title="Intensity">
                            {capitalize(session.intensity)}
                        </Badge>
                        <Badge className={performanceColor(session.performance)} title="Performance">
                            {capitalize(session.performance)}
                        </Badge>
                        <Badge className={productivityColor(session.productivity)} title="Productivity">
                            {capitalize(session.productivity)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

function SessionsPage() {
    const { data: sessions, isLoading, isError } = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
                <Button asChild>
                    <Link to="/sessions/new">Log Session</Link>
                </Button>
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

            {sessions && sessions.length > 0 && (
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
        </div>
    )
}

export default SessionsPage
