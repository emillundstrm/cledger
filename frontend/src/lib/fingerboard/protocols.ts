export const GRIPS = [
    "half_crimp",
    "open",
    "full_crimp",
    "three_finger_drag",
    "front_three",
    "back_three",
    "middle_two_pocket",
    "front_two_pocket",
    "middle_two_crimp",
    "front_two_crimp",
] as const
export type Grip = (typeof GRIPS)[number]

export const HANDS = ["both", "left", "right"] as const
export type Hand = (typeof HANDS)[number]

/**
 * How a set is distributed across hands. "both" is a genuine two-handed effort;
 * "alternate" tests each hand inside one set, separated by a short switch gap,
 * so a single rest interval covers both sides instead of one each.
 */
export const HAND_MODES = ["both", "left", "right", "alternate"] as const
export type HandMode = (typeof HAND_MODES)[number]

export const MODES = ["pickup", "hang"] as const
export type Mode = (typeof MODES)[number]

export const MODE_LABELS: Record<Mode, string> = {
    pickup: "Lyft",
    hang: "Häng",
}

export const PROTOCOLS = ["max_lift", "repeaters", "abralifts", "density_hangs"] as const
export type Protocol = (typeof PROTOCOLS)[number]

export const GRIP_LABELS: Record<Grip, string> = {
    half_crimp: "Halvcrimp",
    open: "Öppen hand",
    full_crimp: "Fullcrimp",
    three_finger_drag: "Tre fingrar, drag",
    front_three: "Främre tre",
    back_three: "Bakre tre",
    middle_two_pocket: "Mittre två, hål",
    front_two_pocket: "Främre två, hål",
    middle_two_crimp: "Mittre två, crimp",
    front_two_crimp: "Främre två, crimp",
}

export const HAND_LABELS: Record<Hand, string> = {
    both: "Två händer",
    left: "Vänster hand",
    right: "Höger hand",
}

export const HAND_MODE_LABELS: Record<HandMode, string> = {
    both: "Två händer",
    left: "Bara vänster",
    right: "Bara höger",
    alternate: "Växelvis",
}

/** The concrete hands worked in one set, in order. */
export function handsForMode(mode: HandMode): Hand[] {
    if (mode === "alternate") {
        return ["left", "right"]
    }
    return [mode]
}

/**
 * Load for each grip position relative to a four-finger half crimp. Lets a
 * single dial drive a whole circuit before any position has a measured max,
 * which otherwise leaves every position sitting at zero on a first run.
 *
 * These reproduce the measured-max circuit: from a 30kg half crimp max the
 * per-grip percentages give 12, 9, 6, 6, 4, 4 — and so do these ratios from a
 * 12kg anchor.
 */
export const GRIP_ANCHOR_RATIO: Record<Grip, number> = {
    half_crimp: 1,
    full_crimp: 1,
    open: 0.75,
    three_finger_drag: 0.75,
    front_three: 0.75,
    back_three: 0.75,
    middle_two_pocket: 0.5,
    front_two_pocket: 0.5,
    middle_two_crimp: 0.35,
    front_two_crimp: 0.35,
}

export const EDGE_OPTIONS = [10, 12, 14, 16, 18, 20, 22] as const

export const DEFAULT_EDGE_MM = 16

export interface ProtocolParams {
    prepareSeconds: number
    workSeconds: number
    repRestSeconds: number
    repsPerSet: number
    setRestSeconds: number
    /** Gap between hands within a set, when alternating. */
    handSwitchSeconds: number
}

export interface DefaultBlock {
    grip: Grip
    edgeMm: number
    sets: number
}

/** A named volume variant of the same protocol. */
export interface ProtocolPreset {
    id: string
    label: string
    blocks: DefaultBlock[]
}

export interface ProtocolDefinition {
    id: Protocol
    name: string
    description: string
    /**
     * Hangs are loaded relative to bodyweight; lifts are absolute. Chosen per
     * workout, so either protocol can be run whichever way.
     */
    defaultMode: Mode
    /**
     * Interactive protocols have the user record the load achieved after every
     * work step, because the next attempt depends on the previous result.
     */
    interactive: boolean
    defaultHandMode: HandMode
    /**
     * Volume variants. The first is the shape; `defaultPresetId` picks which
     * one starts selected. Most protocols have exactly one.
     */
    presets: ProtocolPreset[]
    defaultPresetId?: string
    /** Whether the user can add and remove positions. */
    multiBlock: boolean
    defaults: ProtocolParams
}

export const PROTOCOL_DEFINITIONS: Record<Protocol, ProtocolDefinition> = {
    max_lift: {
        id: "max_lift",
        name: "Max Lift",
        description:
            "Lyft allt tyngre vikt från en list för att hitta ditt verkliga max. Det är kalibreringen som alla andra protokolls belastning räknas fram från.",
        defaultMode: "pickup",
        interactive: true,
        // Testing each hand inside one set keeps a max-lift session to a single
        // rest interval per set rather than one per side.
        defaultHandMode: "alternate",
        presets: [
            {
                id: "standard",
                label: "Standard",
                blocks: [{ grip: "half_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 5 }],
            },
        ],
        multiBlock: false,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 5,
            repRestSeconds: 0,
            repsPerSet: 1,
            setRestSeconds: 180,
            handSwitchSeconds: 10,
        },
    },
    repeaters: {
        id: "repeaters",
        name: "Repeaters",
        description:
            "7 sekunder på, 3 sekunder av, sex gånger per set. Bygger styrkeuthållighet på submaximal belastning.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "both",
        presets: [
            {
                id: "standard",
                label: "Standard",
                blocks: [{ grip: "half_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 5 }],
            },
        ],
        multiBlock: false,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 7,
            repRestSeconds: 3,
            repsPerSet: 6,
            setRestSeconds: 180,
            handSwitchSeconds: 10,
        },
    },
    abralifts: {
        id: "abralifts",
        name: "Abralifts",
        description:
            "Emil Abrahamssons submaximala protokoll, som i studien bakom det: 10 sekunder på runt 40 % av max – lätt ansträngning, aldrig tungt – i sex greppositioner. Kort och ofta med flit, två gånger om dagen med sex timmars mellanrum, eftersom målet är kollagensyntes snarare än styrka.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "alternate",
        presets: [
            {
                // The six exercises and rep counts used in the study: 6 + 6 + 2 x 4 = 20.
                id: "full",
                label: "Hel · 20 set",
                blocks: [
                    { grip: "half_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 6 },
                    { grip: "front_three", edgeMm: DEFAULT_EDGE_MM, sets: 6 },
                    { grip: "front_two_pocket", edgeMm: DEFAULT_EDGE_MM, sets: 2 },
                    { grip: "middle_two_pocket", edgeMm: DEFAULT_EDGE_MM, sets: 2 },
                    { grip: "front_two_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 2 },
                    { grip: "middle_two_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 2 },
                ],
            },
            {
                // Half the volume, and the only variant that fits the ~10 minute
                // loading window when hands alternate.
                id: "half",
                label: "Halv · 10 set",
                blocks: [
                    { grip: "half_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 3 },
                    { grip: "front_three", edgeMm: DEFAULT_EDGE_MM, sets: 3 },
                    { grip: "front_two_pocket", edgeMm: DEFAULT_EDGE_MM, sets: 1 },
                    { grip: "middle_two_pocket", edgeMm: DEFAULT_EDGE_MM, sets: 1 },
                    { grip: "front_two_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 1 },
                    { grip: "middle_two_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 1 },
                ],
            },
        ],
        defaultPresetId: "half",
        multiBlock: true,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 10,
            repRestSeconds: 0,
            repsPerSet: 1,
            // Alternating hands, a set is 10s + 10s switch + 10s + 30s rest —
            // exactly one minute, matching the study's short-rest cadence.
            setRestSeconds: 30,
            handSwitchSeconds: 10,
        },
    },
    density_hangs: {
        id: "density_hangs",
        name: "Density Hangs",
        description:
            "Långa, måttliga häng nära failure – 30 sekunder på ungefär 65 % av max, ett par per set, med flera minuters vila mellan seten. Bygger senornas täthet och tvärsnittsarea snarare än toppkraft.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "alternate",
        presets: [
            {
                id: "standard",
                label: "Standard",
                blocks: [{ grip: "half_crimp", edgeMm: DEFAULT_EDGE_MM, sets: 4 }],
            },
        ],
        multiBlock: true,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 30,
            repRestSeconds: 60,
            repsPerSet: 2,
            setRestSeconds: 240,
            handSwitchSeconds: 10,
        },
    },
}

/**
 * Absolute force through the fingers, in kg — the unified load model.
 * A hang is bodyweight plus added weight (negative added weight is assistance);
 * a pickup is simply the weight lifted.
 */
export function totalLoadKg(mode: Mode, bodyweightKg: number | null, loadKg: number): number {
    if (mode === "pickup") {
        return loadKg
    }
    return Math.round(((bodyweightKg ?? 0) + loadKg) * 10) / 10
}

export function defaultPreset(protocol: ProtocolDefinition): ProtocolPreset {
    const chosen = protocol.presets.find((preset) => preset.id === protocol.defaultPresetId)
    return chosen ?? protocol.presets[0]
}

/**
 * The preset a set of blocks corresponds to, or null for a shape that is not
 * one of them. The volume control has to follow the blocks rather than the
 * last choice made: the shape usually comes from the previous workout, and
 * showing "Half" over a full circuit made the control lie about what would run.
 */
export function matchingPreset(
    protocol: ProtocolDefinition,
    blocks: { grip: Grip; sets: number }[]
): ProtocolPreset | null {
    const match = protocol.presets.find(
        (preset) =>
            preset.blocks.length === blocks.length &&
            preset.blocks.every(
                (block, index) =>
                    block.grip === blocks[index].grip && block.sets === blocks[index].sets
            )
    )
    return match ?? null
}
