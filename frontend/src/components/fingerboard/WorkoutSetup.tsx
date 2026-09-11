import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Info, Volume2 } from "lucide-react"
import { fetchLoadRecommendationForMode } from "@/api/fingerboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Grip, HandMode, ProtocolDefinition, ProtocolParams } from "@/lib/fingerboard/protocols"
import type { WorkoutConfig } from "@/lib/fingerboard/types"
import { CueScheduler } from "@/lib/fingerboard/cues"
import { EDGE_OPTIONS, GRIPS, GRIP_LABELS, HAND_MODES, HAND_MODE_LABELS, totalLoadKg } from "@/lib/fingerboard/protocols"
import type { RecommendationSource } from "@/api/types"

const BODYWEIGHT_KEY = "cledger-bodyweight-kg"

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

const SOURCE_EXPLANATION: Record<RecommendationSource, (basis: number | null) => string> = {
    measured_max: (basis) => `Prescribed from your measured max of ${basis}kg.`,
    last_session: (basis) => `Progressed from your last session at ${basis}kg.`,
    none: () => "No history for this grip, edge and hand yet — enter a load you can judge.",
}

function WorkoutSetup({ protocol, onStart }: WorkoutSetupProps) {
    const [grip, setGrip] = useState<Grip>("half_crimp")
    const [handMode, setHandMode] = useState<HandMode>(protocol.defaultHandMode)
    const [edgeMm, setEdgeMm] = useState<number>(20)
    const [bodyweight, setBodyweight] = useState<string>(readStoredBodyweight)
    const [loadOverride, setLoadOverride] = useState<string | null>(null)
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
    // into added weight before it means anything in the input. Derived rather
    // than stored, so it tracks the recommendation until the user overrides it.
    const suggestedLoad = useMemo(() => {
        if (recommendation?.recommendedKg == null) {
            return ""
        }
        const suggested =
            protocol.mode === "hang"
                ? recommendation.recommendedKg - (bodyweightKg ?? 0)
                : recommendation.recommendedKg
        return String(Math.round(suggested * 10) / 10)
    }, [recommendation, protocol.mode, bodyweightKg])

    const load = loadOverride ?? suggestedLoad

    useEffect(() => {
        try {
            if (bodyweight !== "") {
                localStorage.setItem(BODYWEIGHT_KEY, bodyweight)
            }
        } catch {
            // localStorage unavailable; bodyweight just is not remembered.
        }
    }, [bodyweight])

    const loadKg = load === "" ? 0 : Number(load)
    const total = totalLoadKg(protocol.mode, bodyweightKg, loadKg)
    const needsBodyweight = protocol.mode === "hang" && bodyweightKg === null
    const canStart = load !== "" && !Number.isNaN(loadKg) && !needsBodyweight

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
                            Left then right inside each set, {params.handSwitchSeconds}s apart, sharing
                            one rest.
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {protocol.mode === "hang" ? (
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

                <div className="space-y-2.5">
                    <Label htmlFor="load">
                        {protocol.mode === "hang" ? "Added weight (kg)" : "Starting weight (kg)"}
                    </Label>
                    <Input
                        id="load"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        value={load}
                        onChange={(event) => setLoadOverride(event.target.value)}
                        placeholder={protocol.mode === "hang" ? "Negative for assistance" : "40"}
                    />
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
                            ["sets", "Sets"],
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
                    onStart({ grip, handMode, edgeMm, bodyweightKg, loadKg, params })
                }
            >
                Start workout
            </Button>
        </div>
    )
}

export default WorkoutSetup
