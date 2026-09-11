import { useCallback, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { saveFingerboardWorkout } from "@/api/fingerboard"
import type { FingerboardSetRequest, FingerboardWorkoutRequest, SessionRequest } from "@/api/types"
import WorkoutSetup from "@/components/fingerboard/WorkoutSetup"
import WorkoutRunner from "@/components/fingerboard/WorkoutRunner"
import WorkoutSummary from "@/components/fingerboard/WorkoutSummary"
import type { SummaryResult } from "@/components/fingerboard/WorkoutSummary"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"
import type { Protocol } from "@/lib/fingerboard/protocols"
import { PROTOCOLS, PROTOCOL_DEFINITIONS, totalLoadKg } from "@/lib/fingerboard/protocols"
import { compileTimeline } from "@/lib/fingerboard/timeline"

type Phase = "setup" | "run" | "summary"

/** Successive max-lift attempts step up until one fails. */
const MAX_LIFT_INCREMENT_KG = 2.5

function isProtocol(value: string | undefined): value is Protocol {
    return value !== undefined && (PROTOCOLS as readonly string[]).includes(value)
}

function FingerboardWorkoutPage() {
    const { protocol: protocolId } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [phase, setPhase] = useState<Phase>("setup")
    const [config, setConfig] = useState<WorkoutConfig | null>(null)
    const [recordedSets, setRecordedSets] = useState<RecordedSet[]>([])
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [abandoned, setAbandoned] = useState(false)

    const steps = useMemo(
        () => (config === null ? [] : compileTimeline(config.params)),
        [config]
    )

    const mutation = useMutation({
        mutationFn: ({ workout, session }: { workout: FingerboardWorkoutRequest; session: SessionRequest }) =>
            saveFingerboardWorkout(workout, session),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["sessions"] }),
                queryClient.invalidateQueries({ queryKey: ["analytics"] }),
                queryClient.invalidateQueries({ queryKey: ["fingerboardMaxes"] }),
                queryClient.invalidateQueries({ queryKey: ["fingerboardWorkouts"] }),
            ])
            navigate("/fingerboard")
        },
    })

    const handleRecordSet = useCallback(
        (setIndex: number, changes: Partial<RecordedSet>) => {
            setRecordedSets((prev) =>
                prev.map((set) => {
                    if (set.setIndex === setIndex) {
                        return { ...set, ...changes }
                    }
                    // A successful max-lift attempt suggests a heavier next one.
                    if (
                        protocolId === "max_lift" &&
                        changes.completed === true &&
                        set.setIndex === setIndex + 1
                    ) {
                        const current = prev.find((s) => s.setIndex === setIndex)
                        if (current !== undefined) {
                            return { ...set, loadKg: current.loadKg + MAX_LIFT_INCREMENT_KG }
                        }
                    }
                    return set
                })
            )
        },
        [protocolId]
    )

    if (!isProtocol(protocolId)) {
        return <Navigate to="/fingerboard" replace />
    }

    const protocol = PROTOCOL_DEFINITIONS[protocolId]

    const handleStart = (started: WorkoutConfig) => {
        setConfig(started)
        setRecordedSets(
            Array.from({ length: started.params.sets }, (_, index) => ({
                setIndex: index + 1,
                loadKg: started.loadKg,
                completed: true,
                rpe: null,
            }))
        )
        setPhase("run")
    }

    const handleFinish = (elapsed: number) => {
        setElapsedSeconds(elapsed)
        setPhase("summary")
    }

    const handleAbandon = (elapsed: number, setsReached: number) => {
        setElapsedSeconds(elapsed)
        setRecordedSets((prev) => prev.slice(0, Math.max(1, setsReached)))
        setAbandoned(true)
        setPhase("summary")
    }

    const handleSave = (result: SummaryResult) => {
        if (config === null) {
            return
        }

        const sets: FingerboardSetRequest[] = result.sets.map((set) => ({
            setIndex: set.setIndex,
            grip: config.grip,
            edgeMm: config.edgeMm,
            hand: config.hand,
            mode: protocol.mode,
            addedKg: protocol.mode === "hang" ? set.loadKg : null,
            liftedKg: protocol.mode === "pickup" ? set.loadKg : null,
            totalLoadKg: totalLoadKg(protocol.mode, config.bodyweightKg, set.loadKg),
            workSeconds: config.params.workSeconds,
            completed: set.completed,
            rpe: set.rpe,
        }))

        const workout: FingerboardWorkoutRequest = {
            protocol: protocol.id,
            bodyweightKg: config.bodyweightKg,
            params: config.params,
            durationSeconds: Math.round(elapsedSeconds),
            completed: !abandoned,
            notes: result.notes,
            sets,
        }

        const session: SessionRequest = {
            date: format(new Date(), "yyyy-MM-dd"),
            types: ["hangboard"],
            intensity: result.rpe,
            performance: result.performance,
            durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
            notes: result.notes,
            maxGrade: null,
            venue: null,
            injuries: [],
        }

        mutation.mutate({ workout, session })
    }

    return (
        <div className="mx-auto max-w-2xl space-y-7">
            <div className="flex items-center gap-3">
                <Link
                    to="/fingerboard"
                    viewTransition
                    className="flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Back"
                >
                    <ArrowLeft className="size-5" />
                </Link>
                <h1 className="font-display text-2xl tracking-tight">{protocol.name}</h1>
            </div>

            {phase === "setup" ? <WorkoutSetup protocol={protocol} onStart={handleStart} /> : null}

            {phase === "run" && config !== null ? (
                <WorkoutRunner
                    protocol={protocol}
                    config={config}
                    steps={steps}
                    recordedSets={recordedSets}
                    onRecordSet={handleRecordSet}
                    onFinish={handleFinish}
                    onAbandon={handleAbandon}
                    onDiscard={() => navigate("/fingerboard")}
                />
            ) : null}

            {phase === "summary" && config !== null ? (
                <WorkoutSummary
                    protocol={protocol}
                    config={config}
                    sets={recordedSets}
                    elapsedSeconds={elapsedSeconds}
                    onChangeSet={handleRecordSet}
                    onSave={handleSave}
                    onDiscard={() => navigate("/fingerboard")}
                    isSaving={mutation.isPending}
                />
            ) : null}

            {mutation.isError ? (
                <p className="text-sm text-destructive">
                    Could not save the workout. Check your connection and try again.
                </p>
            ) : null}
        </div>
    )
}

export default FingerboardWorkoutPage
