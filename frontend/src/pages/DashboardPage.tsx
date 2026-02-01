import { useQuery } from "@tanstack/react-query"
import { fetchAnalytics } from "@/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatWeekLabel(weekStart: string): string {
    const date = new Date(weekStart + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function DashboardPage() {
    const { data: analytics, isLoading, isError } = useQuery({
        queryKey: ["analytics"],
        queryFn: fetchAnalytics,
    })

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

            {isLoading && (
                <p className="text-muted-foreground">Loading analytics...</p>
            )}

            {isError && (
                <p className="text-destructive">Failed to load analytics.</p>
            )}

            {analytics && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Sessions This Week
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {analytics.sessionsThisWeek}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Hard Sessions (7 days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {analytics.hardSessionsLast7Days}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Days Since Rest
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {analytics.daysSinceLastRestDay}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pain Flags (Last 30 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analytics.painFlagsLast30Days.length === 0 ? (
                                <p className="text-muted-foreground">No pain flags reported.</p>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {analytics.painFlagsLast30Days.map((pf) => (
                                        <span key={pf.location} className="text-sm">
                                            <span className="font-medium">{capitalize(pf.location)}:</span>{" "}
                                            {pf.count}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Weekly Sessions (Last 8 Weeks)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analytics.weeklySessionCounts.length === 0 ? (
                                <p className="text-muted-foreground">No session data yet.</p>
                            ) : (
                                <WeeklyChart weeks={analytics.weeklySessionCounts} />
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

function WeeklyChart({ weeks }: { weeks: { weekStart: string; count: number }[] }) {
    const maxCount = Math.max(...weeks.map((w) => w.count), 1)

    return (
        <div className="flex items-end gap-2 h-40">
            {weeks.map((week) => (
                <div
                    key={week.weekStart}
                    className="flex flex-1 flex-col items-center gap-1"
                >
                    <span className="text-xs font-medium">{week.count}</span>
                    <div
                        className="w-full rounded-t bg-primary"
                        style={{
                            height: `${(week.count / maxCount) * 100}%`,
                            minHeight: week.count > 0 ? "4px" : "0px",
                        }}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatWeekLabel(week.weekStart)}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default DashboardPage
