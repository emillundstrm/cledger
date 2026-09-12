import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Minus, Plus, Volume2 } from "lucide-react"
import { fetchLoadRecommendations } from "@/api/fingerboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import BlockEditor from "./BlockEditor"
import { CueScheduler } from "@/lib/fingerboard/cues"
import type { HandMode, Mode, ProtocolDefinition, ProtocolParams } from "@/lib/fingerboard/protocols"
import {
    defaultPreset,
    HAND_MODES,
    HAND_MODE_LABELS,
    MODES,
    MODE_LABELS,
    totalLoadKg,
} from "@/lib/fingerboard/protocols"
import {
    DEFAULT_INCREMENT_KG,
    INCREMENT_OPTIONS,
    scaleForReference,
    scaledLoads,
} from "@/lib/fingerboard/ladder"
import { compileTimeline, totalSeconds } from "@/lib/fingerboard/timeline"
import type { WorkoutBlock, WorkoutConfig } from "@/lib/fingerboard/types"
import { totalSets } from "@/lib/fingerboard/types"

const BODYWEIGHT_KEY = "cledger-bodyweight-kg"
const INCREMENT_KEY = "cledger-plate-increment-kg"
const PRESET_KEY = "cledger-preset"

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

function readStoredPresetId(protocol: ProtocolDefinition): string {
    try {
        const stored = localStorage.getItem(`${PRESET_KEY}-${protocol.id}`)
        if (stored !== null && protocol.presets.some((preset) => preset.id === stored)) {
            return stored
        }
    } catch {
        // localStorage unavailable; fall back to the protocol's own default.
    }
    return defaultPreset(protocol).id
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

function WorkoutSetup({ protocol, onStart }: WorkoutSetupProps) {
    const [handMode, setHandMode] = useState<HandMode>(protocol.defaultHandMode)
    const [mode, setMode] = useState<Mode>(protocol.defaultMode)
    const [bodyweight, setBodyweight] = useState<string>(readStoredBodyweight)
    const [incrementKg, setIncrementKg] = useState<number>(readStoredIncrement)
    const [params, setParams] = useState<ProtocolParams>(protocol.defaults)
    const [showParams, setShowParams] = useState(false)
    const [presetId, setPresetId] = useState<string>(() => readStoredPresetId(protocol))
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(() =>
        (protocol.presets.find((p) => p.id === readStoredPresetId(protocol)) ??
            defaultPreset(protocol)
        ).blocks.map((block) => ({ ...block, loadKg: 0 }))
    )
    const [touchedLoads, setTouchedLoads] = useState<Set<number>>(new Set())
    // Scales every position at once, for "I feel strong today". A proportional
    // shift is what keeps the circuit's intensity relationships intact: an
    // absolute offset would be +8% on the heaviest position but +25% on the
    // lightest, which is the most vulnerable one.
    const [scale, setScale] = useState(1)
    const cuesRef = useRef<CueScheduler | null>(null)

    useEffect(() => {
        return () => {
            cuesRef.current?.dispose()
        }
    }, [])

    const bodyweightKg = bodyweight === "" ? null : Number(bodyweight)

    const { data: recommendations } = useQuery({
        queryKey: [
            "fingerboardRecommendations",
            protocol.id,
            handMode,
            blocks.map((b) => `${b.grip}:${b.edgeMm}`).join(","),
        ],
        queryFn: () => fetchLoadRecommendations(protocol.id, blocks, handMode),
    })

    // Prefilled per position, until the user moves that position's load.
    const effectiveBlocks = useMemo(
        () =>
            blocks.map((block, index) => {
                if (touchedLoads.has(index) || recommendations === undefined) {
                    return block
                }
                const recommended = recommendations[`${block.grip}:${block.edgeMm}`]?.recommendedKg
                if (recommended == null) {
                    return block
                }
                const suggested =
                    mode === "hang" ? recommended - (bodyweightKg ?? 0) : recommended
                return { ...block, loadKg: Math.round(suggested * 10) / 10 }
            }),
        [blocks, touchedLoads, recommendations, mode, bodyweightKg]
    )

    // The scale rides on top, so it survives editing an individual position and
    // stays visible as a percentage rather than being baked into the numbers.
    const adjustedBlocks = useMemo(() => {
        const loads = scaledLoads(
            effectiveBlocks.map((block) => block.loadKg),
            scale,
            incrementKg
        )
        return effectiveBlocks.map((block, index) => ({ ...block, loadKg: loads[index] }))
    }, [effectiveBlocks, scale, incrementKg])

    // Position one anchors the scale: nudging moves it by exactly one plate,
    // and everything else follows proportionally.
    const referenceBase = effectiveBlocks[0]?.loadKg ?? 0
    const referenceShown = adjustedBlocks[0]?.loadKg ?? 0
    const scalePct = Math.round((scale - 1) * 100)

    const nudgeOverall = (direction: 1 | -1) => {
        if (referenceBase <= 0) {
            return
        }
        const target = Math.max(incrementKg, referenceShown + direction * incrementKg)
        setScale(scaleForReference(referenceBase, target))
    }

    const handleBlocksChange = (next: WorkoutBlock[]) => {
        // A changed load is the user's; a changed grip hands it back to the
        // recommendation for the new position.
        const touched = new Set(touchedLoads)
        next.forEach((block, index) => {
            const before = adjustedBlocks[index]
            if (before === undefined) {
                return
            }
            if (block.loadKg !== before.loadKg) {
                touched.add(index)
                // Store it free of the scale, which is applied on top.
                next[index] = { ...block, loadKg: scale === 0 ? block.loadKg : block.loadKg / scale }
            }
            if (block.grip !== before.grip || block.edgeMm !== before.edgeMm) {
                touched.delete(index)
            }
        })
        setTouchedLoads(touched)
        setBlocks(next)
    }

    const sets = totalSets(adjustedBlocks)

    // Working both hands one at a time doubles the clock for the same per-hand
    // volume, which matters for Abralifts: its whole rationale is a session
    // short enough to sit inside the ~10 minute collagen-loading window.
    const estimatedSeconds = useMemo(
        () => totalSeconds(compileTimeline(params, handMode, adjustedBlocks)),
        [params, handMode, adjustedBlocks]
    )
    const overLoadingWindow = protocol.id === "abralifts" && estimatedSeconds > 10 * 60
    const needsBodyweight = mode === "hang" && bodyweightKg === null
    const canStart = sets > 0 && adjustedBlocks.every((b) => b.loadKg > 0) && !needsBodyweight

    const updateParam = (key: keyof ProtocolParams, value: string) => {
        const parsed = Number(value)
        if (Number.isNaN(parsed) || parsed < 0) {
            return
        }
        setParams((prev) => ({ ...prev, [key]: parsed }))
    }

    const choosePreset = (id: string) => {
        const preset = protocol.presets.find((p) => p.id === id)
        if (preset === undefined) {
            return
        }
        setPresetId(id)
        setBlocks(preset.blocks.map((block) => ({ ...block, loadKg: 0 })))
        setTouchedLoads(new Set())
        try {
            localStorage.setItem(`${PRESET_KEY}-${protocol.id}`, id)
        } catch {
            // localStorage unavailable; the choice just is not remembered.
        }
    }

    const noteFor = (block: WorkoutBlock): string | null => {
        const recommendation = recommendations?.[`${block.grip}:${block.edgeMm}`]
        if (recommendation === undefined) {
            return null
        }
        if (recommendation.source === "measured_max") {
            const pct = Math.round((recommendation.recommendedKg! / recommendation.basisKg!) * 100)
            return `${pct}% of your measured ${recommendation.basisKg}kg max.`
        }
        if (recommendation.source === "last_session") {
            return `Progressed from ${recommendation.basisKg}kg last time.`
        }
        return "No max measured for this position yet — set a load you can judge."
    }

    return (
        <div className="space-y-7">
            {protocol.presets.length > 1 ? (
                <div className="space-y-2.5">
                    <Label>Volume</Label>
                    <ToggleGroup
                        type="single"
                        value={presetId}
                        onValueChange={(value) => {
                            if (value) {
                                choosePreset(value)
                            }
                        }}
                        className="flex flex-wrap justify-start gap-2"
                    >
                        {protocol.presets.map((preset) => (
                            <ToggleGroupItem
                                key={preset.id}
                                value={preset.id}
                                className="rounded-[10px] px-4"
                            >
                                {preset.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            ) : null}

            <div className="space-y-2.5">
                <Label>Style</Label>
                <ToggleGroup
                    type="single"
                    value={mode}
                    onValueChange={(value) => {
                        if (value) {
                            setMode(value as Mode)
                            setTouchedLoads(new Set())
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
            </div>

            <div className="space-y-2.5">
                <Label htmlFor="hand">Hand</Label>
                <Select
                    value={handMode}
                    onValueChange={(value) => {
                        setHandMode(value as HandMode)
                        setTouchedLoads(new Set())
                    }}
                >
                    <SelectTrigger id="hand" className="w-full sm:w-64">
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
                        className="sm:w-40"
                    />
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border p-4">
                <div className="min-w-0">
                    <Label>Overall load</Label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {referenceBase <= 0
                            ? "Set once a position has a load."
                            : scalePct === 0
                              ? "Recommended for each position."
                              : `${scalePct > 0 ? "+" : ""}${scalePct}% on every position.`}
                    </p>
                </div>
                <div className="flex shrink-0 items-stretch overflow-hidden rounded-[12px] border border-border">
                    <button
                        type="button"
                        aria-label={`Lower overall load by ${incrementKg}kg`}
                        disabled={referenceBase <= 0}
                        onClick={() => nudgeOverall(-1)}
                        className="flex w-12 cursor-pointer items-center justify-center py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Minus className="size-5" />
                    </button>
                    <span className="flex min-w-16 items-center justify-center border-x border-border px-2 font-display text-xl tabular-nums">
                        {referenceShown}
                    </span>
                    <button
                        type="button"
                        aria-label={`Raise overall load by ${incrementKg}kg`}
                        disabled={referenceBase <= 0}
                        onClick={() => nudgeOverall(1)}
                        className="flex w-12 cursor-pointer items-center justify-center py-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Plus className="size-5" />
                    </button>
                </div>
            </div>

            <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                    <Label>{protocol.multiBlock ? "Positions" : "Position"}</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {sets} sets · ~{Math.round(estimatedSeconds / 60)} min
                    </span>
                </div>
                <BlockEditor
                    blocks={adjustedBlocks}
                    onChange={handleBlocksChange}
                    incrementKg={incrementKg}
                    allowMultiple={protocol.multiBlock}
                    loadLabel={mode === "hang" ? "Added weight" : "Weight to lift"}
                    recommendationFor={noteFor}
                />
            </div>

            {overLoadingWindow ? (
                <p className="rounded-[12px] border border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    This runs past the ~10 minute window the protocol is built around — loaded
                    tissue stops responding beyond roughly that long. The study's 20 reps fit in 10
                    minutes because both hands work at once; one hand at a time doubles the clock
                    for the same volume per hand. Halve the sets, or use both hands, to get back
                    inside it.
                </p>
            ) : null}

            {mode === "hang" && bodyweightKg !== null ? (
                <p className="text-xs text-muted-foreground">
                    Loads through the fingers:{" "}
                    {adjustedBlocks
                        .map((b) => `${totalLoadKg(mode, bodyweightKg, b.loadKg)}kg`)
                        .join(", ")}
                </p>
            ) : null}

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
                    <SelectTrigger id="increment" className="w-full sm:w-40">
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
                        blocks: adjustedBlocks,
                        handMode,
                        mode,
                        incrementKg,
                        bodyweightKg,
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
