import { useQuery } from "@tanstack/react-query"
import { fetchAnalytics } from "@/api/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { WeeklyTrainingLoad, WeeklyTrend } from "@/api/types"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

function formatWeekLabel(weekStart: string): string {
    const date = new Date(weekStart + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

const weeklySessionsConfig: ChartConfig = {
    count: {
        label: "Sessions",
        color: "var(--chart-1)",
    },
}

const performanceConfig: ChartConfig = {
    average: {
        label: "Performance",
        color: "var(--chart-2)",
    },
}

const productivityConfig: ChartConfig = {
    average: {
        label: "Productivity",
        color: "var(--chart-3)",
    },
}

const trainingLoadConfig: ChartConfig = {
    load: {
        label: "Load",
        color: "var(--chart-4)",
    },
}

function getLoadTrend(weeks: WeeklyTrainingLoad[]): "increasing" | "decreasing" | "stable" {
    if (weeks.length < 2) {
        return "stable"
    }
    const currentLoad = weeks[weeks.length - 1].load
    const previousLoad = weeks[weeks.length - 2].load
    if (previousLoad === 0 && currentLoad === 0) {
        return "stable"
    }
    if (previousLoad === 0) {
        return "increasing"
    }
    const changePercent = ((currentLoad - previousLoad) / previousLoad) * 100
    if (changePercent > 10) {
        return "increasing"
    }
    if (changePercent < -10) {
        return "decreasing"
    }
    return "stable"
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
                                    Training Load (This Week)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <div className="text-3xl font-bold">
                                        {analytics.currentWeekTrainingLoad}
                                    </div>
                                    <LoadTrendIndicator weeks={analytics.weeklyTrainingLoad} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Injuries (Last 30 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analytics.painFlagsLast30Days.length === 0 ? (
                                <p className="text-muted-foreground">No injuries reported.</p>
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

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Weekly Sessions (Last 8 Weeks)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {analytics.weeklySessionCounts.length === 0 ? (
                                    <p className="text-muted-foreground">No session data yet.</p>
                                ) : (
                                    <WeeklySessionsChart weeks={analytics.weeklySessionCounts} />
                                )}
                            </CardContent>
                        </Card>

                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Weekly Training Load (Last 8 Weeks)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {analytics.weeklyTrainingLoad.length === 0 ? (
                                    <p className="text-muted-foreground">No training load data yet.</p>
                                ) : (
                                    <WeeklyTrainingLoadChart weeks={analytics.weeklyTrainingLoad} />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Performance Trend (Last 8 Weeks)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {analytics.performanceTrend.length === 0 ? (
                                    <p className="text-muted-foreground">No trend data yet.</p>
                                ) : (
                                    <TrendLineChart
                                        weeks={analytics.performanceTrend}
                                        config={performanceConfig}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card className="min-w-0">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Productivity Trend (Last 8 Weeks)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                {analytics.productivityTrend.length === 0 ? (
                                    <p className="text-muted-foreground">No trend data yet.</p>
                                ) : (
                                    <TrendLineChart
                                        weeks={analytics.productivityTrend}
                                        config={productivityConfig}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

function WeeklySessionsChart({ weeks }: { weeks: { weekStart: string; count: number }[] }) {
    const chartData = weeks.map((w) => ({
        week: formatWeekLabel(w.weekStart),
        count: w.count,
    }))

    return (
        <ChartContainer config={weeklySessionsConfig} className="h-[200px] w-full min-w-0">
            <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickMargin={4}
                    width={24}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function TrendLineChart({ weeks, config }: { weeks: WeeklyTrend[]; config: ChartConfig }) {
    const chartData = weeks.map((w) => ({
        week: formatWeekLabel(w.weekStart),
        average: w.average,
    }))

    return (
        <ChartContainer config={config} className="h-[200px] w-full min-w-0">
            <LineChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[1, 3]}
                    ticks={[1, 2, 3]}
                    tickMargin={4}
                    width={24}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                    dataKey="average"
                    type="monotone"
                    stroke="var(--color-average)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                />
            </LineChart>
        </ChartContainer>
    )
}

function WeeklyTrainingLoadChart({ weeks }: { weeks: WeeklyTrainingLoad[] }) {
    const chartData = weeks.map((w) => ({
        week: formatWeekLabel(w.weekStart),
        load: w.load,
    }))

    return (
        <ChartContainer config={trainingLoadConfig} className="h-[200px] w-full min-w-0">
            <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickMargin={4}
                    width={36}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                    dataKey="load"
                    fill="var(--color-load)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function LoadTrendIndicator({ weeks }: { weeks: WeeklyTrainingLoad[] }) {
    const trend = getLoadTrend(weeks)
    if (trend === "increasing") {
        return (
            <span className="flex items-center gap-1 text-sm text-orange-500" title="Load increasing">
                <TrendingUp className="h-4 w-4" />
            </span>
        )
    }
    if (trend === "decreasing") {
        return (
            <span className="flex items-center gap-1 text-sm text-blue-500" title="Load decreasing">
                <TrendingDown className="h-4 w-4" />
            </span>
        )
    }
    return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground" title="Load stable">
            <Minus className="h-4 w-4" />
        </span>
    )
}

export default DashboardPage
