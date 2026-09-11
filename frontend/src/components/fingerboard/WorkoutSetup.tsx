import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Info, Volume2 } from "lucide-react"
import { fetchLoadRecommendationForMode } from "@/api/fingerboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import LoadStepper from "./LoadStepper"
import { CueScheduler } from "@/lib/fingerboard/cues"
import type { Grip, HandMode, Mode, ProtocolDefinition, ProtocolParams } from "@/lib/fingerboard/protocols"
import {
    EDGE_OPTIONS,
    GRIPS,
    GRIP_LABELS,
    HAND_MODES,
    HAND_MODE_LABELS,
    MODES,
    MODE_LABELS,
    handsForMode,
    totalLoadKg,
} from "@/lib/fingerboard/protocols"
import { DEFAULT_INCREMENT_KG, INCREMENT_OPTIONS, buildLadder } from "@/lib/fingerboard/ladder"
import type { WorkoutConfig } from "@/lib/fingerboard/types"
import type { RecommendationSource } from "@/api/types"

const BODYWEIGHT_KEY = "cledger-bodyweight-kg"
const INCREMENT_KEY = "cledger-plate-increment-kg"

interface WorkoutSetupProps {
    protocol: ProtocolDefinition
    onStart: (config: WorkoutConfig) => void
}

function readStoredBodyweight(): string {
    try {
        return localStorage.getItem(BODYWEIGHT_KEY) ?? ""
    } catch {
        return ""
    }
}

function readStoredIncrement(): number {
    try {
        const stored = Number(localStorage.getItem(INCREMENT_KEY))
        if (INCREMENT_OPTIONS.includes(stored as (typeof INCREMENT_OPTIONS)[number])) {
            return stored
        }
    } catch {
        // localStorage unavailable; fall back to the default plate step.
    }
    return DEFAULT_INCREMENT_KG
}

const SOURCE_EXPLANATION: Record<RecommendationSource, (basis: number | null) => string> = {
    measured_max: (basis) => `Prescribed from your measured max of ${basis}kg.`,
    last_session: (basis) => `Progressed from your last session at ${basis}kg.`,
    none: () => "No history for this grip, edge and hand yet — enter a load you can judge.",
}

function WorkoutSetup({ protocol, onStart }: WorkoutSetupProps) {
    const [grip, setGrip] = useState<Grip>("half_crimp")
    const [handMode, setHandMode] = useState<HandMode>(protocol.defaultHandMode)
    const [mode, setMode] = useState<Mode>(protocol.defaultMode)
    const [edgeMm, setEdgeMm] = useState<number>(20)
    const [bodyweight, setBodyweight] = useState<string>(readStoredBodyweight)
    const [loadOverride, setLoadOverride] = useState<number | null>(null)
    const [incrementKg, setIncrementKg] = useState<number>(readStoredIncrement)
    const [params, setParams] = useState<ProtocolParams>(protocol.defaults)
    const [showParams, setShowParams] = useState(false)
    const cuesRef = useRef<CueScheduler | null>(null)

    useEffect(() => {
        return () => {
            cuesRef.current?.dispose()
        }
    }, [])

    const { data: recommendation } = useQuery({
        queryKey: ["fingerboardRecommendation", protocol.id, grip, edgeMm, handMode],
        queryFn: () => fetchLoadRecommendationForMode(protocol.id, grip, edgeMm, handMode),
    })

    const bodyweightKg = bodyweight === "" ? null : Number(bodyweight)

    // The recommendation is a total load, so for hangs it has to be turned back
    // into added weight before it means anything. Derived rather than stored, so
    // it tracks the recommendation until the user overrides it.
    const suggestedLoad = useMemo(() => {
        if (recommendation?.recommendedKg == null) {
            return null
        }
        const suggested =
            mode === "hang"
                ? recommendation.recommendedKg - (bodyweightKg ?? 0)
                : recommendation.recommendedKg
        return Math.round(suggested * 10) / 10
    }, [recommendation, mode, bodyweightKg])

    const loadKg = loadOverride ?? suggestedLoad ?? 0
    const total = totalLoadKg(mode, bodyweightKg, loadKg)
    const needsBodyweight = mode === "hang" && bodyweightKg === null
    const canStart = loadKg > 0 && !needsBodyweight

    // Max lift ramps across attempts; everything else holds one working load.
    const ladder = useMemo(
        () => (protocol.interactive ? buildLadder(loadKg, params.sets, incrementKg) : []),
        [protocol.interactive, loadKg, params.sets, incrementKg]
    )

    const updateParam = (key: keyof ProtocolParams, value: string) => {
        const parsed = Number(value)
        if (Number.isNaN(parsed) || parsed < 0) {
            return
        }
        setParams((prev) => ({ ...prev, [key]: parsed }))
    }

    return (
        <div className="space-y-7">
            <div className="space-y-2.5">
                <Label>Grip</Label>
                <ToggleGroup
                    type="single"
                    value={grip}
                    onValueChange={(value) => {
                        if (value) {
                            setGrip(value as Grip)
                            setLoadOverride(null)
                        }
                    }}
                    className="flex flex-wrap justify-start gap-2"
                >
                    {GRIPS.map((option) => (
                        <ToggleGroupItem key={option} value={option} className="rounded-[10px] px-3.5">
                            {GRIP_LABELS[option]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            <div className="space-y-2.5">
                <Label>Style</Label>
                <ToggleGroup
                    type="single"
                    value={mode}
                    onValueChange={(value) => {
                        if (value) {
                            setMode(value as Mode)
                            setLoadOverride(null)
                        }
                    }}
                    className="flex justify-start gap-2"
                >
                    {MODES.map((option) => (
                        <ToggleGroupItem key={option} value={option} className="rounded-[10px] px-4">
                            {MODE_LABELS[option]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">
                    {mode === "pickup"
                        ? "Weight picked up from the edge — the load is what you lift."
                        : "Hanging from the edge — the load is your bodyweight plus any added weight."}
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2.5">
                    <Label htmlFor="edge">Edge depth</Label>
                    <Select
                        value={String(edgeMm)}
                        onValueChange={(value) => {
                            setEdgeMm(Number(value))
                            setLoadOverride(null)
                        }}
                    >
                        <SelectTrigger id="edge" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EDGE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}mm
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2.5">
                    <Label htmlFor="hand">Hand</Label>
                    <Select
                        value={handMode}
                        onValueChange={(value) => {
                            setHandMode(value as HandMode)
                            setLoadOverride(null)
                        }}
                    >
                        <SelectTrigger id="hand" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {HAND_MODES.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {HAND_MODE_LABELS[option]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {handMode === "alternate" ? (
                        <p className="text-xs text-muted-foreground">
                            Left then right inside each set, {params.handSwitchSeconds}s apart,
                            sharing one rest.
                        </p>
                    ) : null}
                </div>
            </div>

            {mode === "hang" ? (
                <div className="space-y-2.5">
                    <Label htmlFor="bodyweight">Bodyweight (kg)</Label>
                    <Input
                        id="bodyweight"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={bodyweight}
                        onChange={(event) => setBodyweight(event.target.value)}
                        placeholder="72"
                    />
                </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2.5">
                    <Label htmlFor="load">
                        {protocol.interactive ? "First attempt" : "Working load"}
                        {mode === "hang" ? " (added)" : ""}
                    </Label>
                    <LoadStepper
                        id="load"
                        value={loadKg}
                        onChange={setLoadOverride}
                        stepKg={incrementKg}
                    />
                </div>

                <div className="space-y-2.5">
                    <Label htmlFor="increment">Plate step</Label>
                    <Select
                        value={String(incrementKg)}
                        onValueChange={(value) => {
                            const next = Number(value)
                            setIncrementKg(next)
                            try {
                                localStorage.setItem(INCREMENT_KEY, String(next))
                            } catch {
                                // localStorage unavailable; the step just is not remembered.
                            }
                        }}
                    >
                        <SelectTrigger id="increment" className="w-full sm:w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INCREMENT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}kg
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-[12px] border border-border bg-card/50 p-4">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Load through the fingers</span>
                    <span className="font-display text-2xl tabular-nums">{total}kg</span>
                </div>
                {recommendation ? (
                    <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        {SOURCE_EXPLANATION[recommendation.source](recommendation.basisKg)}
                    </p>
                ) : null}
            </div>

            {ladder.length > 0 ? (
                <div className="space-y-2.5">
                    <Label>Planned attempts</Label>
                    <div className="flex flex-wrap gap-2">
                        {ladder.map((attempt, index) => (
                            <span
                                key={index}
                                className="rounded-[10px] border border-border px-3 py-1.5 text-sm tabular-nums"
                            >
                                <span className="text-muted-foreground">{index + 1}.</span>{" "}
                                {attempt}kg
                            </span>
                        ))}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Big jumps while you are well below your max, smaller ones near it. Each hand
                        follows its own ladder
                        {handsForMode(handMode).length > 1 ? ", starting from the same weight" : ""}.
                        Change a weight mid-workout and the rest re-plan from it; miss a lift and the
                        remaining attempts split the difference instead of climbing.
                    </p>
                </div>
            ) : null}

            <div>
                <button
                    type="button"
                    onClick={() => setShowParams((prev) => !prev)}
                    className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                    {showParams ? "Hide timing" : "Adjust timing"}
                </button>
                {showParams ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        {([
                            ["prepareSeconds", "Prepare (s)"],
                            ["workSeconds", "Work (s)"],
                            ["repRestSeconds", "Rep rest (s)"],
                            ["repsPerSet", "Reps per set"],
                            ["sets", protocol.interactive ? "Attempts" : "Sets"],
                            ["setRestSeconds", "Set rest (s)"],
                            ["handSwitchSeconds", "Hand switch (s)"],
                        ] as const).map(([key, label]) => (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key} className="text-xs">
                                    {label}
                                </Label>
                                <Input
                                    id={key}
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={params[key]}
                                    onChange={(event) => updateParam(key, event.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {needsBodyweight ? (
                <p className="text-sm text-amber-500">
                    Enter your bodyweight so hang loads can be recorded correctly.
                </p>
            ) : null}

            <button
                type="button"
                onClick={() => {
                    if (cuesRef.current === null) {
                        cuesRef.current = new CueScheduler()
                    }
                    void cuesRef.current.test()
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
                <Volume2 className="size-4" />
                Test sound
            </button>

            <Button
                size="lg"
                className="w-full"
                disabled={!canStart}
                onClick={() =>
                    onStart({
                        grip,
                        handMode,
                        mode,
                        edgeMm,
                        bodyweightKg,
                        loadKg,
                        incrementKg,
                        params,
                    })
                }
            >
                Start workout
            </Button>
        </div>
    )
}

export default WorkoutSetup
