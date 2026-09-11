import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { format } from "date-fns"
import { ChevronRight, TriangleAlert } from "lucide-react"
import { fetchFingerboardMaxes, fetchFingerboardWorkouts } from "@/api/fingerboard"
import { Badge } from "@/components/ui/badge"
import { GRIP_LABELS, HAND_LABELS, PROTOCOLS, PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"
import { asymmetries, isStale } from "@/lib/fingerboard/maxes"
import { cn } from "@/lib/utils"

function FingerboardPage() {
    const { data: maxes = [], isLoading: maxesLoading } = useQuery({
        queryKey: ["fingerboardMaxes"],
        queryFn: fetchFingerboardMaxes,
    })

    const { data: workouts = [] } = useQuery({
        queryKey: ["fingerboardWorkouts"],
        queryFn: fetchFingerboardWorkouts,
    })

    const pairs = asymmetries(maxes)

    return (
        <div className="space-y-9">
            <div>
                <h1 className="font-display text-3xl tracking-tight">Fingerboard</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Pick a protocol. The app runs the timer and logs the session when you finish.
                </p>
            </div>

            <section className="grid gap-3 sm:grid-cols-2">
                {PROTOCOLS.map((id) => {
                    const protocol = PROTOCOL_DEFINITIONS[id]
                    return (
                        <Link
                            key={id}
                            to={`/fingerboard/${id}`}
                            viewTransition
                            className="group rounded-[14px] border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:border-primary/50 active:scale-[0.99]"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-display text-xl tracking-tight">{protocol.name}</h2>
                                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {protocol.description}
                            </p>
                        </Link>
                    )
                })}
            </section>

            <section className="space-y-3">
                <h2 className="font-display text-xl tracking-tight">Measured maxima</h2>
                {maxesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : maxes.length === 0 ? (
                    <p className="rounded-[14px] border border-dashed border-border p-5 text-sm text-muted-foreground">
                        No maxima yet. Run a Max Lift test and every other protocol's load gets
                        prescribed from it instead of guessed.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-[14px] border border-border">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">Grip</th>
                                    <th className="px-4 py-2.5 font-medium">Edge</th>
                                    <th className="px-4 py-2.5 font-medium">Hand</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Max</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Tested</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maxes.map((max) => {
                                    const stale = isStale(max.testedAt)
                                    return (
                                        <tr
                                            key={`${max.grip}-${max.edgeMm}-${max.hand}`}
                                            className="border-b border-border last:border-0"
                                        >
                                            <td className="px-4 py-2.5">{GRIP_LABELS[max.grip]}</td>
                                            <td className="px-4 py-2.5">{max.edgeMm}mm</td>
                                            <td className="px-4 py-2.5">{HAND_LABELS[max.hand]}</td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                {max.maxLoadKg}kg
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {format(new Date(max.testedAt), "d MMM yyyy")}
                                                    {stale ? (
                                                        <Badge variant="outline" className="text-[11px]">
                                                            stale
                                                        </Badge>
                                                    ) : null}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {pairs.length > 0 ? (
                    <div className="space-y-2">
                        {pairs.map((pair) => (
                            <div
                                key={`${pair.grip}-${pair.edgeMm}`}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-[12px] border px-4 py-2.5 text-sm",
                                    pair.differencePct >= 10
                                        ? "border-amber-500/40 bg-amber-500/5"
                                        : "border-border"
                                )}
                            >
                                {pair.differencePct >= 10 ? (
                                    <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                                ) : null}
                                <span>
                                    {GRIP_LABELS[pair.grip]} {pair.edgeMm}mm —{" "}
                                    <span className="font-medium tabular-nums">{pair.differencePct}%</span>{" "}
                                    asymmetry ({pair.leftKg}kg left vs {pair.rightKg}kg right)
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <section className="space-y-3">
                <h2 className="font-display text-xl tracking-tight">Recent workouts</h2>
                {workouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {workouts.slice(0, 10).map((workout) => {
                            const topLoad = workout.sets.reduce(
                                (max, set) => Math.max(max, set.totalLoadKg),
                                0
                            )
                            return (
                                <li
                                    key={workout.id}
                                    className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-4 py-3 text-sm"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className="font-medium">
                                            {PROTOCOL_DEFINITIONS[workout.protocol].name}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {format(new Date(workout.performedAt), "d MMM")}
                                        </span>
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {workout.sets.length} sets · top {topLoad}kg
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}

export default FingerboardPage
