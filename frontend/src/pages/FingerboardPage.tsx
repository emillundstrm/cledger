import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Trash2, TriangleAlert, X } from "lucide-react"
import {
    deleteFingerboardWorkout,
    fetchFingerboardMaxes,
    fetchFingerboardWorkouts,
} from "@/api/fingerboard"
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
import { Container } from "@/components/system/Container"
import { ListFrame, ListRow, RowButton, RowChevron, RowControls, RowLink } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
import { GRIP_LABELS, HAND_LABELS, PROTOCOLS, PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"
import { formatDate, formatKg, formatMm, formatNumber } from "@/lib/fingerboard/format"
import { asymmetries, isStale } from "@/lib/fingerboard/maxes"

// How many recent workouts show at first, and how many more each "Visa fler" adds.
const WORKOUT_PAGE = 10

function FingerboardPage() {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [workoutLimit, setWorkoutLimit] = useState(WORKOUT_PAGE)
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

    const maxesQuery = useQuery({
        queryKey: ["fingerboardMaxes"],
        queryFn: fetchFingerboardMaxes,
    })
    const maxes = maxesQuery.data ?? []

    const workoutsQuery = useQuery({
        queryKey: ["fingerboardWorkouts"],
        queryFn: fetchFingerboardWorkouts,
    })
    const workouts = workoutsQuery.data ?? []

    const pairs = asymmetries(maxes)

    return (
        <div className="space-y-7">
            <PageHeader
                title="Fingerträning"
                subtitle="Välj ett protokoll. Appen sköter timern och loggar passet när du är klar."
            />

            <ListFrame aria-label="Protokoll">
                {PROTOCOLS.map((id) => {
                    const protocol = PROTOCOL_DEFINITIONS[id]
                    return (
                        <ListRow key={id} className="flex items-center gap-3">
                            <RowLink to={`/fingerboard/${id}`} viewTransition className="min-w-0 flex-1">
                                <span className="block font-medium">{protocol.name}</span>
                                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                                    {protocol.description}
                                </span>
                            </RowLink>
                            <RowChevron />
                        </ListRow>
                    )
                })}
            </ListFrame>

            <section className="space-y-3">
                <h2 className="font-display text-xl">Uppmätta maxvärden</h2>
                {maxesQuery.isPending ? (
                    <LoadingState>Laddar maxvärden…</LoadingState>
                ) : maxesQuery.isError ? (
                    <ErrorState onRetry={() => void maxesQuery.refetch()}>
                        Kunde inte hämta maxvärdena.
                    </ErrorState>
                ) : maxes.length === 0 ? (
                    <EmptyState>
                        Inga maxvärden än. Kör ett Max Lift-test så räknas alla andra protokolls
                        belastning fram från det i stället för att gissas.
                    </EmptyState>
                ) : (
                    <Container className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border text-left text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-2.5 font-medium">Grepp</th>
                                    <th className="px-5 py-2.5 font-medium">List</th>
                                    <th className="px-5 py-2.5 font-medium">Hand</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Max</th>
                                    <th className="px-5 py-2.5 text-right font-medium">Testat</th>
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
                                            <td className="px-5 py-2.5">{GRIP_LABELS[max.grip]}</td>
                                            <td className="px-5 py-2.5">{formatMm(max.edgeMm)}</td>
                                            <td className="px-5 py-2.5">{HAND_LABELS[max.hand]}</td>
                                            <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                                                {formatKg(max.maxLoadKg)}
                                            </td>
                                            <td className="px-5 py-2.5 text-right text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {formatDate(max.testedAt)}
                                                    {stale ? (
                                                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                                                            gammalt
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </Container>
                )}

                {pairs.length > 0 ? (
                    <ListFrame aria-label="Asymmetri mellan händerna">
                        {pairs.map((pair) => {
                            const warn = pair.differencePct >= 10
                            return (
                                <ListRow
                                    key={`${pair.grip}-${pair.edgeMm}`}
                                    interactive={false}
                                    className="flex items-center gap-2.5 text-sm"
                                >
                                    {warn ? (
                                        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warn" />
                                    ) : null}
                                    <span>
                                        {GRIP_LABELS[pair.grip]} {formatMm(pair.edgeMm)} –{" "}
                                        <span
                                            className={
                                                warn
                                                    ? "pill-warn rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
                                                    : "font-medium tabular-nums"
                                            }
                                        >
                                            {formatNumber(pair.differencePct)} %
                                        </span>{" "}
                                        asymmetri ({formatKg(pair.leftKg)} vänster mot {formatKg(pair.rightKg)}{" "}
                                        höger)
                                    </span>
                                </ListRow>
                            )
                        })}
                    </ListFrame>
                ) : null}
            </section>

            <section className="space-y-3">
                <h2 className="font-display text-xl">Senaste passen</h2>
                {workoutsQuery.isPending ? (
                    <LoadingState>Laddar pass…</LoadingState>
                ) : workoutsQuery.isError ? (
                    <ErrorState onRetry={() => void workoutsQuery.refetch()}>
                        Kunde inte hämta passen.
                    </ErrorState>
                ) : workouts.length === 0 ? (
                    <EmptyState>Inget loggat än.</EmptyState>
                ) : (
                    <>
                        <ListFrame aria-label="Senaste passen">
                            {workouts.slice(0, workoutLimit).map((workout) => {
                                // Only completed sets count: a missed attempt is not a top load.
                                const held = workout.sets.filter((set) => set.completed)
                                const topLoad = held.reduce(
                                    (max, set) => Math.max(max, set.totalLoadKg),
                                    0
                                )
                                const isOpen = expanded === workout.id
                                return (
                                    <ListRow key={workout.id}>
                                        <RowButton
                                            expanded={isOpen}
                                            onClick={() => setExpanded(isOpen ? null : workout.id)}
                                            className="flex w-full items-center gap-3 text-sm"
                                        >
                                            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5">
                                                <span className="font-medium">
                                                    {PROTOCOL_DEFINITIONS[workout.protocol]?.name ??
                                                        workout.protocol}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {formatDate(workout.performedAt, false)}
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-muted-foreground tabular-nums">
                                                {held.length}/{workout.sets.length} klarade
                                                {topLoad > 0 ? ` · bäst ${formatKg(topLoad)}` : ""}
                                            </span>
                                            <RowChevron expanded={isOpen} />
                                        </RowButton>

                                        {isOpen ? (
                                            <RowControls className="mt-3 divide-y divide-border border-t border-border">
                                                {workout.sets.length === 0 ? (
                                                    <p className="py-3 text-sm text-muted-foreground">
                                                        Inga set sparades – en rest från en sparning som
                                                        misslyckades halvvägs.
                                                    </p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="text-left text-muted-foreground">
                                                                <tr>
                                                                    <th className="py-2 pr-4 font-medium">Set</th>
                                                                    <th className="py-2 pr-4 font-medium">Grepp</th>
                                                                    <th className="py-2 pr-4 font-medium">List</th>
                                                                    <th className="py-2 pr-4 font-medium">Hand</th>
                                                                    <th className="py-2 pr-4 text-right font-medium">
                                                                        Belastning
                                                                    </th>
                                                                    <th className="py-2 text-right font-medium">
                                                                        Resultat
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {workout.sets.map((set) => (
                                                                    <tr
                                                                        key={set.id}
                                                                        className="border-t border-border/60"
                                                                    >
                                                                        <td className="py-2 pr-4 tabular-nums">
                                                                            {set.setIndex}
                                                                        </td>
                                                                        <td className="py-2 pr-4">
                                                                            {GRIP_LABELS[set.grip] ?? set.grip}
                                                                        </td>
                                                                        <td className="py-2 pr-4 tabular-nums">
                                                                            {formatMm(set.edgeMm)}
                                                                        </td>
                                                                        <td className="py-2 pr-4">
                                                                            {HAND_LABELS[set.hand] ?? set.hand}
                                                                        </td>
                                                                        <td className="py-2 pr-4 text-right font-medium tabular-nums">
                                                                            {formatKg(set.totalLoadKg)}
                                                                        </td>
                                                                        <td className="py-2 text-right">
                                                                            {set.completed ? (
                                                                                <span className="inline-flex items-center gap-1 text-good">
                                                                                    <Check aria-hidden="true" className="size-3.5" />
                                                                                    Klarade
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                                                    <X aria-hidden="true" className="size-3.5" />
                                                                                    Missade
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                <div className="flex justify-end pt-3">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive-outline" size="sm">
                                                                <Trash2 className="size-4" />
                                                                Ta bort passet
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    Ta bort passet?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Seten försvinner också, och uppmätta
                                                                    maxvärden som kom från dem räknas om. Det
                                                                    loggade passet i träningsloggen lämnas
                                                                    orört – ta bort det separat om du vill.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Behåll det</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        removeWorkout.mutate(workout.id)
                                                                    }
                                                                >
                                                                    Ta bort
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </RowControls>
                                        ) : null}
                                    </ListRow>
                                )
                            })}
                        </ListFrame>
                        {workouts.length > workoutLimit ? (
                            <Button
                                variant="ghost"
                                onClick={() => setWorkoutLimit((limit) => limit + WORKOUT_PAGE)}
                            >
                                Visa fler
                            </Button>
                        ) : null}
                    </>
                )}
            </section>
        </div>
    )
}

export default FingerboardPage
