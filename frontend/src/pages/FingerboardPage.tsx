import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { format } from "date-fns"
import { Check, ChevronDown, ChevronRight, Trash2, TriangleAlert, X } from "lucide-react"
import {
    deleteFingerboardWorkout,
    fetchFingerboardMaxes,
    fetchFingerboardWorkouts,
} from "@/api/fingerboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GRIP_LABELS, HAND_LABELS, PROTOCOLS, PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"
import { asymmetries, isStale } from "@/lib/fingerboard/maxes"
import { cn } from "@/lib/utils"

function FingerboardPage() {
    const [expanded, setExpanded] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const removeWorkout = useMutation({
        mutationFn: deleteFingerboardWorkout,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["fingerboardWorkouts"] }),
                queryClient.invalidateQueries({ queryKey: ["fingerboardMaxes"] }),
            ])
        },
    })

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
                            // Only completed sets count: a missed attempt is not a top load.
                            const held = workout.sets.filter((set) => set.completed)
                            const topLoad = held.reduce(
                                (max, set) => Math.max(max, set.totalLoadKg),
                                0
                            )
                            const isOpen = expanded === workout.id
                            return (
                                <li
                                    key={workout.id}
                                    className="overflow-hidden rounded-[12px] border border-border"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(isOpen ? null : workout.id)}
                                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/50"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <ChevronDown
                                                className={cn(
                                                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                                    isOpen ? "rotate-0" : "-rotate-90"
                                                )}
                                            />
                                            <span className="font-medium">
                                                {PROTOCOL_DEFINITIONS[workout.protocol]?.name ??
                                                    workout.protocol}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {format(new Date(workout.performedAt), "d MMM")}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-muted-foreground tabular-nums">
                                            {held.length}/{workout.sets.length} held
                                            {topLoad > 0 ? ` · best ${topLoad}kg` : ""}
                                        </span>
                                    </button>

                                    {isOpen && workout.sets.length === 0 ? (
                                        <div className="border-t border-border px-4 py-3">
                                            <p className="text-sm text-muted-foreground">
                                                No sets were recorded — a leftover from a save that
                                                failed part way through.
                                            </p>
                                        </div>
                                    ) : null}

                                    {isOpen && workout.sets.length > 0 ? (
                                        <div className="overflow-x-auto border-t border-border">
                                            <table className="w-full text-sm">
                                                <thead className="text-left text-muted-foreground">
                                                    <tr>
                                                        <th className="px-4 py-2 font-medium">Set</th>
                                                        <th className="px-4 py-2 font-medium">Grip</th>
                                                        <th className="px-4 py-2 font-medium">Edge</th>
                                                        <th className="px-4 py-2 font-medium">Hand</th>
                                                        <th className="px-4 py-2 text-right font-medium">
                                                            Load
                                                        </th>
                                                        <th className="px-4 py-2 text-right font-medium">
                                                            Result
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {workout.sets.map((set) => (
                                                        <tr
                                                            key={set.id}
                                                            className="border-t border-border/60"
                                                        >
                                                            <td className="px-4 py-2 tabular-nums">
                                                                {set.setIndex}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                {GRIP_LABELS[set.grip] ?? set.grip}
                                                            </td>
                                                            <td className="px-4 py-2 tabular-nums">
                                                                {set.edgeMm}mm
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                {HAND_LABELS[set.hand] ?? set.hand}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-medium tabular-nums">
                                                                {set.totalLoadKg}kg
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                {set.completed ? (
                                                                    <span className="inline-flex items-center gap-1 text-primary">
                                                                        <Check className="size-3.5" />
                                                                        Held
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                        <X className="size-3.5" />
                                                                        Missed
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : null}

                                    {isOpen ? (
                                        <div className="flex justify-end border-t border-border px-4 py-3">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Delete workout
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Delete this workout?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Its sets go too, and any measured max
                                                            that came from them is recalculated. The
                                                            logged session is left alone — delete
                                                            that separately if you want it gone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                removeWorkout.mutate(workout.id)
                                                            }
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ) : null}
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
