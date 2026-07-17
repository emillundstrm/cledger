import type { ReactNode } from "react"
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

const rpeConfig: ChartConfig = {
    average: {
        label: "Avg RPE",
        color: "var(--chart-4)",
    },
}

const trainingLoadConfig: ChartConfig = {
    load: {
        label: "Load",
        color: "var(--chart-3)",
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

function StatCard({
    label,
    delayMs,
    children,
}: {
    label: string
    delayMs: number
    children: ReactNode
}) {
    return (
        <Card
            className="anim-fade-up gap-3 rounded-2xl py-5 transition-colors hover:border-muted-foreground/40"
            style={{ animationDelay: `${delayMs}ms` }}
        >
            <CardHeader className="pb-0">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function DashboardPage() {
    const { data: analytics, isLoading, isError } = useQuery({
        queryKey: ["analytics"],
        queryFn: fetchAnalytics,
    })

    return (
        <div className="space-y-4">
            <h2 className="anim-fade-up mb-7 font-display text-4xl">Dashboard</h2>

            {isLoading && (
                <p className="text-muted-foreground">Loading analytics...</p>
            )}

            {isError && (
                <p className="text-destructive">Failed to load analytics.</p>
            )}

            {analytics && (
                <>
                    <div className="grid gap-3.5 sm:grid-cols-3">
                        <StatCard label="Sessions This Week" delayMs={0}>
                            <div className="font-display text-4xl leading-none">
                                {analytics.sessionsThisWeek}
                            </div>
                        </StatCard>

                        <StatCard label="Hard Sessions (7 days)" delayMs={80}>
                            <div className="font-display text-4xl leading-none">
                                {analytics.hardSessionsLast7Days}
                            </div>
                        </StatCard>

                        <StatCard label="Training Load (This Week)" delayMs={160}>
                            <div className="flex items-center gap-3">
                                <div className="font-display text-4xl leading-none">
                                    {analytics.currentWeekTrainingLoad}
                                </div>
                                <LoadTrendIndicator weeks={analytics.weeklyTrainingLoad} />
                            </div>
                        </StatCard>
                    </div>

                    <Card
                        className="anim-fade-up gap-3 rounded-2xl py-5"
                        style={{ animationDelay: "200ms" }}
                    >
                        <CardHeader className="pb-0">
                            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Injuries (Last 30 Days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analytics.painFlagsLast30Days.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No injuries reported.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {analytics.painFlagsLast30Days.map((pf) => (
                                        <span
                                            key={pf.location}
                                            className="pill-injury rounded-full px-3.5 py-1 text-[13px] font-semibold"
                                        >
                                            <span>{capitalize(pf.location)}:</span> {pf.count}
                                            {pf.weightedCount > pf.count && (
                                                <span className="ml-1 font-normal opacity-70" title="Severity-weighted count">
                                                    (wt: {pf.weightedCount})
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                        <ChartCard label="Weekly Sessions (Last 8 Weeks)" delayMs={250}>
                            {analytics.weeklySessionCounts.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No session data yet.</p>
                            ) : (
                                <WeeklySessionsChart weeks={analytics.weeklySessionCounts} />
                            )}
                        </ChartCard>

                        <ChartCard label="Weekly Training Load (Last 8 Weeks)" delayMs={340}>
                            {analytics.weeklyTrainingLoad.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No training load data yet.</p>
                            ) : (
                                <WeeklyTrainingLoadChart weeks={analytics.weeklyTrainingLoad} />
                            )}
                        </ChartCard>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                        <ChartCard label="Performance Trend (Last 8 Weeks)" delayMs={430}>
                            {analytics.performanceTrend.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No trend data yet.</p>
                            ) : (
                                <TrendLineChart
                                    weeks={analytics.performanceTrend}
                                    config={performanceConfig}
                                />
                            )}
                        </ChartCard>

                        <ChartCard label="Average RPE (Last 8 Weeks)" delayMs={520}>
                            {analytics.rpeTrend.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No trend data yet.</p>
                            ) : (
                                <TrendLineChart
                                    weeks={analytics.rpeTrend}
                                    config={rpeConfig}
                                    yDomain={[1, 10]}
                                    yTicks={[2, 4, 6, 8, 10]}
                                />
                            )}
                        </ChartCard>
                    </div>
                </>
            )}
        </div>
    )
}

function ChartCard({
    label,
    delayMs,
    children,
}: {
    label: string
    delayMs: number
    children: ReactNode
}) {
    return (
        <Card
            className="anim-fade-up min-w-0 gap-4 rounded-2xl py-5"
            style={{ animationDelay: `${delayMs}ms` }}
        >
            <CardHeader className="pb-0">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">{children}</CardContent>
        </Card>
    )
}

function BarGradient({ id, color }: { id: string; color: string }) {
    return (
        <defs>
            <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={color} />
                <stop
                    offset="100%"
                    stopColor={`color-mix(in oklab, ${color} 75%, white)`}
                />
            </linearGradient>
        </defs>
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
                <BarGradient id="fill-count" color="var(--color-count)" />
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
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
                    fill="url(#fill-count)"
                    radius={[7, 7, 2, 2]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function TrendLineChart({ weeks, config, yDomain, yTicks }: { weeks: WeeklyTrend[]; config: ChartConfig; yDomain?: [number, number]; yTicks?: number[] }) {
    const chartData = weeks.map((w) => ({
        week: formatWeekLabel(w.weekStart),
        average: w.average,
    }))

    return (
        <ChartContainer config={config} className="h-[200px] w-full min-w-0">
            <LineChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
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
                    domain={yDomain ?? [1, 3]}
                    ticks={yTicks ?? [1, 2, 3]}
                    tickMargin={4}
                    width={24}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                    dataKey="average"
                    type="monotone"
                    stroke="var(--color-average)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    dot={{ r: 4.5, strokeWidth: 2.5, fill: "var(--card)" }}
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
                <BarGradient id="fill-load" color="var(--color-load)" />
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
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
                    fill="url(#fill-load)"
                    radius={[7, 7, 2, 2]}
                />
            </BarChart>
        </ChartContainer>
    )
}

function LoadTrendIndicator({ weeks }: { weeks: WeeklyTrainingLoad[] }) {
    const trend = getLoadTrend(weeks)
    if (trend === "increasing") {
        return (
            <span className="flex items-center gap-1 text-sm text-(--hot) trend-pulse" title="Load increasing">
                <TrendingUp className="h-4 w-4" />
            </span>
        )
    }
    if (trend === "decreasing") {
        return (
            <span className="flex items-center gap-1 text-sm text-(--cold)" title="Load decreasing">
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
