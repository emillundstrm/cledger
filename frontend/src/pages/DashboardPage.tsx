import { useState, type ReactNode } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchAnalytics } from "@/api/analytics"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Container, ContainerLabel } from "@/components/system/Container"
import { PageHeader } from "@/components/system/PageHeader"
import { SegmentedControl, type SegmentedOption } from "@/components/system/SegmentedControl"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
    isMonthlyPeriod,
    PERFORMANCE_LABELS,
    PERIOD_OPTIONS,
    performanceLabel,
    SESSION_TYPE_LABELS,
    SESSION_TYPES,
    type Analytics,
    type Period,
    type SessionPerformanceLog,
    type SessionTypeVolume,
    type WeeklyTrainingLoad,
} from "@/api/types"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns"
import { LOCALE } from "@/lib/locale"

type Metric = "count" | "minutes"

const METRIC_OPTIONS: SegmentedOption<Metric>[] = [
    { value: "count", label: "Pass" },
    { value: "minutes", label: "Minuter" },
]

const volumeConfig: ChartConfig = {
    boulder: { label: SESSION_TYPE_LABELS.boulder, color: "var(--t-boulder)" },
    routes: { label: SESSION_TYPE_LABELS.routes, color: "var(--t-routes)" },
    board: { label: SESSION_TYPE_LABELS.board, color: "var(--t-board)" },
    hangboard: { label: SESSION_TYPE_LABELS.hangboard, color: "var(--t-hangboard)" },
    strength: { label: SESSION_TYPE_LABELS.strength, color: "var(--t-strength)" },
    running: { label: SESSION_TYPE_LABELS.running, color: "var(--t-running)" },
    rehab: { label: SESSION_TYPE_LABELS.rehab, color: "var(--t-rehab)" },
    other: { label: SESSION_TYPE_LABELS.other, color: "var(--t-other)" },
}

const trainingLoadConfig: ChartConfig = {
    load: {
        label: "Belastning",
        color: "var(--chart-2)",
    },
}

// Kept in sync between the grouped-bar YAxis width and the ribbon's left inset so
// the ribbon's bucket cells line up exactly above the bars they summarize.
function yAxisWidthFor(metric: Metric): number {
    return metric === "minutes" ? 40 : 26
}

const PERFORMANCE_LEGEND: { label: string; color: string }[] = [
    { label: PERFORMANCE_LABELS.weak, color: "var(--bad)" },
    { label: PERFORMANCE_LABELS.normal, color: "var(--chart-3)" },
    { label: PERFORMANCE_LABELS.strong, color: "var(--good)" },
]

/** The ribbon in words, for assistive tech: its colours alone carry no text. */
function ribbonSummary(log: SessionPerformanceLog[]): string {
    const count = (value: string) => log.filter((s) => s.performance === value).length
    const latest = log[log.length - 1].rollingScore.toLocaleString(LOCALE, {
        signDisplay: "exceptZero",
        maximumFractionDigits: 2,
    })
    return `Prestation per klätterpass: ${log.length} pass, ${count("weak")} svaga, ${count("normal")} normala, ${count("strong")} starka. Snitt senaste 14 dagarna: ${latest}`
}

// A rolling score of ±0.5 (say, two strong sessions out of four) already reads as
// fully good or bad; normal sits in the middle.
function scoreColor(score: number): string {
    const pct = Math.round(Math.min(Math.abs(score) * 2, 1) * 100)
    const pole = score < 0 ? "var(--bad)" : "var(--good)"
    return `color-mix(in oklab, ${pole} ${pct}%, var(--chart-3))`
}

function ribbonColor(performance: string): string {
    if (performance === "weak") {
        return "var(--bad)"
    }
    if (performance === "strong") {
        return "var(--good)"
    }
    return "var(--chart-3)"
}

function formatBucketLabel(bucketStart: string, period: Period): string {
    const date = new Date(bucketStart + "T00:00:00")
    if (isMonthlyPeriod(period)) {
        const withYear = period === "1y" || period === "all"
        return date.toLocaleDateString(LOCALE, {
            month: "short",
            year: withYear ? "2-digit" : undefined,
        })
    }
    return date.toLocaleDateString(LOCALE, { month: "short", day: "numeric" })
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
    const [period, setPeriod] = useState<Period>("8w")
    const [metric, setMetric] = useState<Metric>("count")

    const { data: analytics, isLoading, isError, refetch } = useQuery({
        queryKey: ["analytics", period],
        queryFn: () => fetchAnalytics(period),
        placeholderData: keepPreviousData,
    })

    return (
        <div className="space-y-7">
            <PageHeader
                title="Översikt"
                actions={
                    <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                        <SelectTrigger className="w-[160px]" aria-label="Tidsperiod">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PERIOD_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            />

            {isLoading && <LoadingState>Laddar statistik…</LoadingState>}

            {isError && (
                <ErrorState onRetry={() => void refetch()}>Kunde inte ladda statistik.</ErrorState>
            )}

            {analytics && (
                <div className="space-y-3.5">
                    <div className="grid gap-3.5 sm:grid-cols-3">
                        <Container label="Pass denna vecka">
                            <div className="font-display text-4xl leading-none">
                                {analytics.sessionsThisWeek}
                            </div>
                        </Container>

                        <Container label="Hårda pass (7 dagar)">
                            <div className="font-display text-4xl leading-none">
                                {analytics.hardSessionsLast7Days}
                            </div>
                        </Container>

                        <Container label="Belastning (denna vecka)">
                            <div className="flex items-center gap-3">
                                <div className="font-display text-4xl leading-none">
                                    {analytics.currentWeekTrainingLoad}
                                </div>
                                <LoadTrendIndicator weeks={analytics.weeklyTrainingLoad} />
                            </div>
                        </Container>
                    </div>

                    <Container label="Skador (senaste 30 dagarna)">
                        {analytics.painFlagsLast30Days.length === 0 ? (
                            <EmptyState>Inga skador rapporterade.</EmptyState>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {analytics.painFlagsLast30Days.map((pf) => (
                                    <span
                                        key={pf.location}
                                        className="pill-injury rounded-full px-3.5 py-1 text-[13px] font-semibold"
                                    >
                                        <span>{capitalize(pf.location)}:</span> {pf.count}
                                        {pf.weightedCount > pf.count && (
                                            <span className="ml-1 font-normal opacity-70" title="Antal viktat efter allvarlighetsgrad">
                                                (viktat: {pf.weightedCount})
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Container>

                    <Container className="min-w-0">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <ContainerLabel className="mb-0">Aktivitet och prestation</ContainerLabel>
                            <SegmentedControl
                                size="sm"
                                value={metric}
                                onChange={setMetric}
                                options={METRIC_OPTIONS}
                                aria-label="Mått för volym"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <ActivityPerformance analytics={analytics} period={period} metric={metric} />
                        </div>
                    </Container>

                    <ChartCard label="Belastning">
                        <TrainingLoadChart weeks={analytics.weeklyTrainingLoad} period={period} />
                    </ChartCard>
                </div>
            )}
        </div>
    )
}

function ChartCard({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) {
    return (
        <Container label={label} className="min-w-0">
            <div className="overflow-x-auto">{children}</div>
        </Container>
    )
}

type VolumeRow = Record<string, number | string>

// Ribbon (per-session performance, bucketed to match the bars) stacked directly
// above grouped volume bars. Both use the same bucket spine and the same left
// inset (the YAxis width), so bucket N of the ribbon sits exactly above bucket N
// of the bars — one shared x-axis for correlating performance against activity.
function ActivityPerformance({
    analytics,
    period,
    metric,
}: {
    analytics: Analytics
    period: Period
    metric: Metric
}) {
    const spine = analytics.weeklyTrainingLoad
    const yAxisWidth = yAxisWidthFor(metric)

    const volumeByBucket = new Map<string, Map<string, SessionTypeVolume>>()
    const activeTypes = new Set<string>()
    for (const v of analytics.sessionTypeVolume) {
        const inner = volumeByBucket.get(v.weekStart) ?? new Map<string, SessionTypeVolume>()
        inner.set(v.type, v)
        volumeByBucket.set(v.weekStart, inner)
        const value = metric === "count" ? v.sessionCount : v.totalMinutes
        if (value > 0) {
            activeTypes.add(v.type)
        }
    }
    const types = SESSION_TYPES.filter((t) => activeTypes.has(t))

    const data: VolumeRow[] = spine.map((bucket) => {
        const inner = volumeByBucket.get(bucket.weekStart)
        const row: VolumeRow = { week: formatBucketLabel(bucket.weekStart, period) }
        for (const type of types) {
            const vol = inner?.get(type)
            row[type] = vol ? (metric === "count" ? vol.sessionCount : vol.totalMinutes) : 0
        }
        return row
    })

    // Place each session by day across the ribbon. Buckets render at equal width, so a
    // date's position is its bucket's index plus how far into the bucket it falls; this
    // keeps bucket N of the ribbon above bucket N of the bars for months too.
    const bucketEnds = spine.map((bucket, i) => {
        if (i + 1 < spine.length) {
            return spine[i + 1].weekStart
        }
        const start = parseISO(bucket.weekStart)
        return format(isMonthlyPeriod(period) ? addMonths(start, 1) : addDays(start, 7), "yyyy-MM-dd")
    })
    const log = analytics.sessionPerformanceLog
    const placed = log.flatMap((session) => {
        let idx = -1
        for (let i = 0; i < spine.length; i++) {
            if (spine[i].weekStart <= session.date) {
                idx = i
            } else {
                break
            }
        }
        if (idx < 0) {
            return []
        }
        const start = parseISO(spine[idx].weekStart)
        const days = differenceInCalendarDays(parseISO(bucketEnds[idx]), start)
        const offset = differenceInCalendarDays(parseISO(session.date), start) + 0.5
        const sameDay = log.filter((s) => s.date === session.date)
        return [{
            session,
            x: ((idx + offset / days) / spine.length) * 100,
            stackIndex: sameDay.indexOf(session),
            stackSize: sameDay.length,
        }]
    })
    // The band fades out where there is no score: before the first session, after the
    // last, and across gaps longer than the 14-day window.
    const fade = 1
    const stops: string[] = []
    placed.forEach((p, i) => {
        const prev = placed[i - 1]
        if (!prev || differenceInCalendarDays(parseISO(p.session.date), parseISO(prev.session.date)) > 14) {
            if (prev) {
                stops.push(`transparent ${(prev.x + fade).toFixed(2)}%`)
            }
            stops.push(`transparent ${(p.x - fade).toFixed(2)}%`)
        }
        stops.push(`${scoreColor(p.session.rollingScore)} ${p.x.toFixed(2)}%`)
    })
    if (placed.length > 0) {
        stops.push(`transparent ${(placed[placed.length - 1].x + fade).toFixed(2)}%`)
    }
    const dotSize = isMonthlyPeriod(period) ? 7 : 10

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-[0.12em]">Prestation · klättring</span>
                {PERFORMANCE_LEGEND.map((item) => (
                    <span key={item.label} className="flex items-center gap-1">
                        <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                    </span>
                ))}
                <span>Bakgrund: snitt 14 dagar</span>
            </div>

            {placed.length === 0 ? (
                <EmptyState>Inga klätterpass under perioden.</EmptyState>
            ) : (
                <div
                    role="img"
                    aria-label={ribbonSummary(log)}
                    className="relative h-7"
                    style={{ marginLeft: yAxisWidth }}
                >
                    <div className="absolute inset-0 rounded-md bg-muted/40" />
                    <div
                        className="absolute inset-0 rounded-md opacity-45"
                        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
                    />
                    {placed.map((p, i) => (
                        <div
                            key={`${p.session.date}-${i}`}
                            title={`${p.session.date} · ${performanceLabel(p.session.performance)}`}
                            className="absolute rounded-full"
                            style={{
                                width: dotSize,
                                height: dotSize,
                                left: `${p.x}%`,
                                top: `calc(50% + ${(p.stackIndex - (p.stackSize - 1) / 2) * (dotSize + 1)}px)`,
                                transform: "translate(-50%, -50%)",
                                backgroundColor: ribbonColor(p.session.performance),
                                boxShadow: "0 0 0 1.5px var(--card)",
                            }}
                        />
                    ))}
                </div>
            )}

            {types.length === 0 ? (
                <EmptyState>Inga pass under perioden.</EmptyState>
            ) : (
                <ChartContainer config={volumeConfig} className="h-[220px] w-full min-w-0">
                    <BarChart
                        data={data}
                        accessibilityLayer
                        barCategoryGap="20%"
                        margin={{ top: 5, right: 0, bottom: 5, left: 0 }}
                    >
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
                            width={yAxisWidth}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {types.map((type) => (
                            <Bar
                                key={type}
                                dataKey={type}
                                name={SESSION_TYPE_LABELS[type]}
                                fill={`var(--color-${type})`}
                                radius={[3, 3, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ChartContainer>
            )}
        </div>
    )
}

function TrainingLoadChart({ weeks, period }: { weeks: WeeklyTrainingLoad[]; period: Period }) {
    const chartData = weeks.map((w) => ({
        week: formatBucketLabel(w.weekStart, period),
        load: w.load,
    }))

    return (
        <ChartContainer config={trainingLoadConfig} className="h-[200px] w-full min-w-0">
            <BarChart data={chartData} accessibilityLayer>
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
                    width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                    dataKey="load"
                    fill="var(--color-load)"
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
            <span className="flex items-center gap-1 text-sm text-(--hot) trend-pulse" title="Belastningen ökar">
                <TrendingUp aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Belastningen ökar</span>
            </span>
        )
    }
    if (trend === "decreasing") {
        return (
            <span className="flex items-center gap-1 text-sm text-(--cold)" title="Belastningen minskar">
                <TrendingDown aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Belastningen minskar</span>
            </span>
        )
    }
    return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground" title="Belastningen är stabil">
            <Minus aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Belastningen är stabil</span>
        </span>
    )
}

export default DashboardPage
