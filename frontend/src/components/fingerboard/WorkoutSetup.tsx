import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Volume2 } from "lucide-react"
import { fetchLastFingerboardWorkout, fetchLoadRecommendations } from "@/api/fingerboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Container } from "@/components/system/Container"
import { FormError, FormField } from "@/components/system/Form"
import { SegmentedControl } from "@/components/system/SegmentedControl"
import BlockEditor from "./BlockEditor"
import { ListFrame, ListRow } from "@/components/system/List"
import { CueScheduler } from "@/lib/fingerboard/cues"
import type { HandMode, Mode, ProtocolDefinition, ProtocolParams } from "@/lib/fingerboard/protocols"
import { RadioGroup } from "@/components/ui/radio-group"
import LoadStepper from "./LoadStepper"
import OptionCard from "@/components/system/OptionCard"
import {
    DEFAULT_EDGE_MM,
    defaultPreset,
    EDGE_OPTIONS,
    GRIP_ANCHOR_RATIO,
    GRIP_LABELS,
    HAND_MODES,
    HAND_MODE_LABELS,
    MODES,
    MODE_LABELS,
    matchingPreset,
    totalLoadKg,
} from "@/lib/fingerboard/protocols"
import {
    DEFAULT_INCREMENT_KG,
    INCREMENT_OPTIONS,
    resolveLoads,
} from "@/lib/fingerboard/ladder"
import { compileTimeline, totalSeconds } from "@/lib/fingerboard/timeline"
import { formatKg, formatMm } from "@/lib/fingerboard/format"
import { cn } from "@/lib/utils"
import type { WorkoutBlock, WorkoutConfig } from "@/lib/fingerboard/types"
import { totalSets } from "@/lib/fingerboard/types"

const BODYWEIGHT_KEY = "cledger-bodyweight-kg"
const INCREMENT_KEY = "cledger-plate-increment-kg"
const PRESET_KEY = "cledger-preset"
const LOAD_MODE_KEY = "cledger-load-mode"
// Hand mode and timings as last started, per protocol
const RUN_KEY = "cledger-workout-run"

type LoadMode = "anchor" | "individual"

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

// Remembered when a workout starts with it, so the next one opens with the
// weight that actually went into total_load_kg, not a half-typed value.
function storeBodyweight(value: string) {
    try {
        localStorage.setItem(BODYWEIGHT_KEY, value)
    } catch {
        // localStorage unavailable; bodyweight just isn't remembered
    }
}

interface StoredRun {
    handMode: HandMode
    params: ProtocolParams
}

function readStoredRun(protocol: ProtocolDefinition): StoredRun {
    const fallback = { handMode: protocol.defaultHandMode, params: protocol.defaults }
    try {
        const raw = localStorage.getItem(`${RUN_KEY}-${protocol.id}`)
        if (raw === null) {
            return fallback
        }
        const stored = JSON.parse(raw) as Partial<StoredRun>
        return {
            handMode: HAND_MODES.includes(stored.handMode as HandMode)
                ? (stored.handMode as HandMode)
                : fallback.handMode,
            // Merged over the defaults, so a timing added later still has a value
            params: { ...protocol.defaults, ...stored.params },
        }
    } catch {
        return fallback
    }
}

function storeRun(protocol: ProtocolDefinition, run: StoredRun) {
    try {
        localStorage.setItem(`${RUN_KEY}-${protocol.id}`, JSON.stringify(run))
    } catch {
        // localStorage unavailable; the next workout starts from the defaults
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

function readStoredLoadMode(): LoadMode {
    try {
        const stored = localStorage.getItem(LOAD_MODE_KEY)
        if (stored === "anchor" || stored === "individual") {
            return stored
        }
    } catch {
        // localStorage unavailable; one dial is the friendlier default.
    }
    return "anchor"
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
    // A weekly repeat starts as it was last run: hand mode and timings as last
    // started, lift or hang as the last workout was done.
    const [storedRun] = useState(() => readStoredRun(protocol))
    const [handMode, setHandMode] = useState<HandMode>(storedRun.handMode)
    const [modeOverride, setMode] = useState<Mode | null>(null)
    const [bodyweight, setBodyweight] = useState<string>(readStoredBodyweight)
    const [incrementKg, setIncrementKg] = useState<number>(readStoredIncrement)
    const [params, setParams] = useState<ProtocolParams>(storedRun.params)
    const [showSettings, setShowSettings] = useState(false)
    const [presetId, setPresetId] = useState<string | null>(null)
    const [blocks, setBlocks] = useState<WorkoutBlock[] | null>(null)
    const [touchedLoads, setTouchedLoads] = useState<Set<number>>(new Set())
    const [loadMode, setLoadMode] = useState<LoadMode>(readStoredLoadMode)
    // In anchor mode the first position drives the rest; null until it has been
    // seeded from a measured max or set by hand.
    const [anchorOverride, setAnchorOverride] = useState<number | null>(null)
    // One edge for the session, for the same reason as one weight: the whole
    // circuit is normally done on the same rung.
    const [sessionEdgeOverride, setSessionEdgeOverride] = useState<number | null>(null)
    const cuesRef = useRef<CueScheduler | null>(null)

    useEffect(() => {
        return () => {
            cuesRef.current?.dispose()
        }
    }, [])

    const bodyweightKg = bodyweight === "" ? null : Number(bodyweight)

    // What you did last time is the default: it needs no measured max, and it
    // is the one load that is certainly achievable.
    const { data: lastWorkout } = useQuery({
        queryKey: ["lastFingerboardWorkout", protocol.id],
        queryFn: () => fetchLastFingerboardWorkout(protocol.id),
    })
    const mode: Mode = modeOverride ?? lastWorkout?.[0]?.mode ?? protocol.defaultMode
    // A lift's load is the weight lifted and a hang's is weight added on top of
    // the body, so last time's load only carries over within the same mode.
    const lastPositionFor = useCallback(
        (block: WorkoutBlock) =>
            lastWorkout?.find((position) => position.grip === block.grip && position.mode === mode),
        [lastWorkout, mode]
    )

    // Which preset the shape is *taken* from, when there is no last workout.
    const shapePresetId = presetId ?? readStoredPresetId(protocol)

    // Shape comes from last time unless a preset has been picked deliberately.
    const shapeBlocks = useMemo((): WorkoutBlock[] => {
        if (blocks !== null) {
            return blocks
        }
        if (presetId === null && lastWorkout !== undefined && lastWorkout.length > 0) {
            return lastWorkout.map((position) => ({
                grip: position.grip,
                edgeMm: position.edgeMm,
                sets: position.sets,
                loadKg: position.loadKg,
            }))
        }
        return (
            protocol.presets.find((p) => p.id === shapePresetId) ?? defaultPreset(protocol)
        ).blocks.map((block) => ({ ...block, loadKg: 0 }))
    }, [blocks, presetId, lastWorkout, protocol, shapePresetId])

    // What the toggle shows is whatever is actually loaded, which is empty for
    // a shape matching no preset. Highlighting a remembered choice instead let
    // a full circuit sit under a lit "Half", and re-picking Half was a no-op
    // because the control already believed it was selected.
    const activePresetId = matchingPreset(protocol, shapeBlocks)?.id ?? ""

    const sessionEdgeMm = sessionEdgeOverride ?? lastWorkout?.[0]?.edgeMm ?? DEFAULT_EDGE_MM

    const { data: recommendations } = useQuery({
        queryKey: [
            "fingerboardRecommendations",
            protocol.id,
            handMode,
            shapeBlocks.map((b) => `${b.grip}:${b.edgeMm}`).join(","),
        ],
        queryFn: () => fetchLoadRecommendations(protocol.id, shapeBlocks, handMode),
    })

    const knownLoads = useMemo(
        () =>
            shapeBlocks.map((block, index): number | null => {
                if (touchedLoads.has(index)) {
                    return block.loadKg
                }
                const fromLast = lastPositionFor(block)?.loadKg
                if (fromLast != null && fromLast > 0) {
                    return fromLast
                }
                const recommended = recommendations?.[`${block.grip}:${block.edgeMm}`]
                    ?.recommendedKg
                if (recommended != null) {
                    return mode === "hang" ? recommended - (bodyweightKg ?? 0) : recommended
                }
                return null
            }),
        [shapeBlocks, touchedLoads, lastPositionFor, recommendations, mode, bodyweightKg]
    )

    const resolved = useMemo(
        () =>
            resolveLoads(
                shapeBlocks.map((block) => GRIP_ANCHOR_RATIO[block.grip]),
                knownLoads,
                loadMode === "anchor" ? anchorOverride : null,
                incrementKg
            ),
        [shapeBlocks, knownLoads, loadMode, anchorOverride, incrementKg]
    )

    const adjustedBlocks = useMemo(
        () =>
            shapeBlocks.map((block, index) => ({
                ...block,
                edgeMm: loadMode === "anchor" ? sessionEdgeMm : block.edgeMm,
                loadKg: resolved[index],
            })),
        [shapeBlocks, resolved, loadMode, sessionEdgeMm]
    )

    const anchorLoad = adjustedBlocks[0]?.loadKg ?? 0
    const usingLastWorkout =
        presetId === null && lastWorkout !== undefined && lastWorkout.length > 0
    // A weekly repeat opens as last week's plan and a Start button; the full
    // form is one tap away under "Ändra passet".
    const [editing, setEditing] = useState(false)
    const compact = usingLastWorkout && !editing

    const chooseLoadMode = (next: LoadMode) => {
        // Carry the loads across so switching never resets work already done.
        if (next === "individual") {
            setBlocks(adjustedBlocks.map((block) => ({ ...block })))
            setTouchedLoads(new Set(adjustedBlocks.map((_, i) => i)))
        } else {
            setAnchorOverride(adjustedBlocks[0]?.loadKg ?? 0)
            setSessionEdgeOverride(adjustedBlocks[0]?.edgeMm ?? DEFAULT_EDGE_MM)
        }
        setLoadMode(next)
        try {
            localStorage.setItem(LOAD_MODE_KEY, next)
        } catch {
            // localStorage unavailable; the choice just is not remembered.
        }
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
    // Why the workout can't start yet, said when starting is tried rather than
    // by a disabled button that gives no reason.
    const startProblem = needsBodyweight
        ? "Fyll i din kroppsvikt först."
        : sets <= 0
          ? "Lägg till minst ett set."
          : // A hang's load is added weight, so 0 kg is a plain bodyweight hang;
            // a lift with nothing on it is not a lift
            adjustedBlocks.some((b) => (mode === "hang" ? b.loadKg < 0 : b.loadKg <= 0))
            ? "Ställ in en vikt över 0 kg för varje position."
            : null
    const [startAttempted, setStartAttempted] = useState(false)

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
        if (lastPositionFor(block) !== undefined) {
            return "Samma som förra gången."
        }
        const recommendation = recommendations?.[`${block.grip}:${block.edgeMm}`]
        if (recommendation?.source === "measured_max" && recommendation.basisKg != null) {
            const pct = Math.round((recommendation.recommendedKg! / recommendation.basisKg) * 100)
            return `${pct} % av ditt uppmätta max på ${formatKg(recommendation.basisKg)}.`
        }
        return null
    }

    // Not a <form>: Enter in a field must not start a timed workout.
    return (
        <div className="space-y-6">
            {compact ? (
                <section aria-labelledby="plan-heading" className="space-y-3">
                    <h2 id="plan-heading" className="font-display text-xl">
                        Som förra gången
                    </h2>
                    <ListFrame aria-label="Positioner">
                        {adjustedBlocks.map((block, index) => (
                            <ListRow key={index} interactive={false} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <span className="font-medium">
                                    {GRIP_LABELS[block.grip]} · {formatMm(block.edgeMm)}
                                </span>
                                <span className="text-sm text-muted-foreground tabular-nums">
                                    {block.sets} set · {mode === "hang" ? "+" : ""}
                                    {formatKg(block.loadKg)}
                                </span>
                            </ListRow>
                        ))}
                    </ListFrame>
                    <p className="text-sm text-muted-foreground tabular-nums">
                        {MODE_LABELS[mode]} · {HAND_MODE_LABELS[handMode]} · {sets} set · ~
                        {Math.round(estimatedSeconds / 60)} min
                    </p>
                    {needsBodyweight ? (
                    <FormField label="Kroppsvikt (kg)" htmlFor="bodyweight">
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
                    </FormField>
                    ) : null}
                </section>
            ) : (
                <>
                    {protocol.presets.length > 1 ? (
                        <FormField label="Volym">
                            <SegmentedControl
                                aria-label="Volym"
                                value={activePresetId}
                                onChange={(value) => {
                                    // Re-picking the loaded preset would throw away
                                    // adjusted loads for nothing.
                                    if (value !== activePresetId) {
                                        choosePreset(value)
                                    }
                                }}
                                options={protocol.presets.map((preset) => ({
                                    value: preset.id,
                                    label: preset.label,
                                }))}
                            />
                        </FormField>
                    ) : null}

                    <FormField label="Stil">
                        <SegmentedControl
                            aria-label="Stil"
                            value={mode}
                            onChange={(value) => {
                                if (value !== mode) {
                                    setMode(value)
                                    setTouchedLoads(new Set())
                                }
                            }}
                            options={MODES.map((option) => ({ value: option, label: MODE_LABELS[option] }))}
                        />
                    </FormField>

                    <FormField
                        label="Hand"
                        htmlFor="hand"
                        hintId="hand-hint"
                        hint={
                            handMode === "alternate"
                                ? `Vänster och sedan höger i varje set, ${params.handSwitchSeconds} s isär, med en gemensam vila.`
                                : undefined
                        }
                    >
                        <Select
                            value={handMode}
                            onValueChange={(value) => {
                                setHandMode(value as HandMode)
                                setTouchedLoads(new Set())
                            }}
                        >
                            <SelectTrigger
                                id="hand"
                                aria-describedby={handMode === "alternate" ? "hand-hint" : undefined}
                                className="w-full sm:w-64"
                            >
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
                    </FormField>

                    {mode === "hang" ? (
                        <FormField label="Kroppsvikt (kg)" htmlFor="bodyweight">
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
                        </FormField>
                    ) : null}

                    <FormField label="Belastning">
                        <RadioGroup
                            aria-label="Belastning"
                            value={loadMode}
                            onValueChange={(value) => chooseLoadMode(value as LoadMode)}
                            className="gap-2"
                        >
                            <OptionCard
                                id="load-anchor"
                                value="anchor"
                                selected={loadMode === "anchor"}
                                title="En vikt för hela passet"
                                description={`Ställ in ${GRIP_LABELS[adjustedBlocks[0]?.grip ?? "half_crimp"].toLowerCase()}, så följer alla andra positioner i proportion.`}
                            />
                            <OptionCard
                                id="load-individual"
                                value="individual"
                                selected={loadMode === "individual"}
                                title="En vikt per position"
                                description="Ställ in varje position för sig, för första gången eller för finjustering."
                            />
                        </RadioGroup>
                    </FormField>

                    {loadMode === "anchor" ? (
                        <>
                            <FormField label="Listdjup" htmlFor="session-edge">
                                <Select
                                    value={String(sessionEdgeMm)}
                                    onValueChange={(value) => setSessionEdgeOverride(Number(value))}
                                >
                                    <SelectTrigger id="session-edge" className="w-full sm:w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EDGE_OPTIONS.map((edge) => (
                                            <SelectItem key={edge} value={String(edge)}>
                                                {formatMm(edge)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>

                            <FormField
                                label={`${GRIP_LABELS[adjustedBlocks[0]?.grip ?? "half_crimp"]}${mode === "hang" ? " (extravikt)" : ""}`}
                                htmlFor="anchor-load"
                                hint={
                                    anchorLoad <= 0
                                        ? "Ställ in den här en gång så följer resten av cirkeln."
                                        : usingLastWorkout
                                          ? "Belastningen från ditt förra pass. Justerar du den här skalas alla om."
                                          : "Resten av cirkeln skalas från den här."
                                }
                            >
                                <LoadStepper
                                    id="anchor-load"
                                    value={anchorLoad}
                                    stepKg={incrementKg}
                                    onChange={setAnchorOverride}
                                />
                            </FormField>
                        </>
                    ) : null}

                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <Label>{protocol.multiBlock ? "Positioner" : "Position"}</Label>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {sets} set · ~{Math.round(estimatedSeconds / 60)} min
                            </span>
                        </div>
                        <BlockEditor
                            editableLoads={loadMode === "individual"}
                            editableEdges={loadMode === "individual"}
                            blocks={adjustedBlocks}
                            onChange={handleBlocksChange}
                            incrementKg={incrementKg}
                            allowMultiple={protocol.multiBlock}
                            loadLabel={mode === "hang" ? "Extravikt" : "Vikt att lyfta"}
                            recommendationFor={noteFor}
                        />
                    </div>

                    {overLoadingWindow ? (
                        <Container tone="warn" className="text-xs leading-relaxed">
                            Det här drar över det ungefär 10 minuter långa fönster som protokollet bygger
                            på – belastad vävnad slutar svara efter ungefär så lång tid. Studiens 20 rep
                            ryms på 10 minuter eftersom båda händerna jobbar samtidigt; en hand i taget
                            dubblerar tiden för samma volym per hand. Halvera seten, eller använd två
                            händer, för att hamna innanför igen.
                        </Container>
                    ) : null}

                    {mode === "hang" && bodyweightKg !== null ? (
                        <p className="text-xs text-muted-foreground">
                            Belastning genom fingrarna:{" "}
                            {adjustedBlocks
                                .map((b) => formatKg(totalLoadKg(mode, bodyweightKg, b.loadKg)))
                                .join(", ")}
                        </p>
                    ) : null}

                    {/* Equipment, timings and the sound check are set once and rarely
                        touched, so they wait behind one toggle (DESIGN.md: Forms). */}
                    <div className="space-y-6">
                        <button
                            type="button"
                            aria-expanded={showSettings}
                            aria-controls="workout-settings"
                            onClick={() => setShowSettings((prev) => !prev)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                        >
                            Viktsteg, tider, ljud
                            <ChevronDown
                                aria-hidden="true"
                                className={cn("size-4 transition-transform duration-200", showSettings ? "rotate-180" : "rotate-0")}
                            />
                        </button>
                        {showSettings ? (
                            <div id="workout-settings" className="space-y-6">
                                <FormField label="Viktsteg" htmlFor="increment">
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
                                                    {formatKg(option)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {([
                                        ["prepareSeconds", "Förberedelse (s)"],
                                        ["workSeconds", "Arbete (s)"],
                                        ["repRestSeconds", "Vila mellan rep (s)"],
                                        ["repsPerSet", "Rep per set"],
                                        ["setRestSeconds", "Vila mellan set (s)"],
                                        ["handSwitchSeconds", "Handbyte (s)"],
                                    ] as const).map(([key, label]) => (
                                        <FormField key={key} label={label} htmlFor={key}>
                                            <Input
                                                id={key}
                                                type="number"
                                                inputMode="numeric"
                                                min="0"
                                                value={params[key]}
                                                onChange={(event) => updateParam(key, event.target.value)}
                                            />
                                        </FormField>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (cuesRef.current === null) {
                                            cuesRef.current = new CueScheduler()
                                        }
                                        void cuesRef.current.test()
                                    }}
                                >
                                    <Volume2 className="size-4" />
                                    Testa ljudet
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </>
            )}

            {startAttempted && startProblem !== null ? <FormError>{startProblem}</FormError> : null}

            <Button
                size="lg"
                className="w-full"
                onClick={() => {
                    setStartAttempted(true)
                    if (startProblem !== null) {
                        return
                    }
                    if (bodyweightKg !== null) {
                        storeBodyweight(bodyweight)
                    }
                    storeRun(protocol, { handMode, params })
                    onStart({
                        blocks: adjustedBlocks,
                        handMode,
                        mode,
                        incrementKg,
                        bodyweightKg,
                        params,
                    })
                }}
            >
                Starta passet
            </Button>

            {compact ? (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                >
                    Ändra passet
                    <ChevronDown aria-hidden="true" className="size-4" />
                </button>
            ) : null}
        </div>
    )
}

export default WorkoutSetup
