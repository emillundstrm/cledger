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
    pickup: "Lift",
    hang: "Hang",
}

export const PROTOCOLS = ["max_lift", "repeaters", "abralifts", "density_hangs"] as const
export type Protocol = (typeof PROTOCOLS)[number]

export const GRIP_LABELS: Record<Grip, string> = {
    half_crimp: "Half crimp",
    open: "Open hand",
    full_crimp: "Full crimp",
    three_finger_drag: "Three finger drag",
    front_three: "Front three",
    back_three: "Back three",
    middle_two_pocket: "Middle two pocket",
    front_two_pocket: "Front two pocket",
    middle_two_crimp: "Middle two crimp",
    front_two_crimp: "Front two crimp",
}

export const HAND_LABELS: Record<Hand, string> = {
    both: "Both hands",
    left: "Left hand",
    right: "Right hand",
}

export const HAND_MODE_LABELS: Record<HandMode, string> = {
    both: "Both hands",
    left: "Left only",
    right: "Right only",
    alternate: "Each hand",
}

/** The concrete hands worked in one set, in order. */
export function handsForMode(mode: HandMode): Hand[] {
    if (mode === "alternate") {
        return ["left", "right"]
    }
    return [mode]
}

export const EDGE_OPTIONS = [6, 8, 10, 12, 15, 20, 25, 30] as const

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
     * Grip positions worked, in order. Most protocols hold one position
     * throughout; Abralifts is a circuit across several.
     */
    defaultBlocks: DefaultBlock[]
    /** Whether the user can add and remove positions. */
    multiBlock: boolean
    defaults: ProtocolParams
}

export const PROTOCOL_DEFINITIONS: Record<Protocol, ProtocolDefinition> = {
    max_lift: {
        id: "max_lift",
        name: "Max Lift",
        description:
            "Pick up progressively heavier weight from an edge to find your true maximum. This is the calibration that every other protocol's load is derived from.",
        defaultMode: "pickup",
        interactive: true,
        // Testing each hand inside one set keeps a max-lift session to a single
        // rest interval per set rather than one per side.
        defaultHandMode: "alternate",
        defaultBlocks: [{ grip: "half_crimp", edgeMm: 20, sets: 5 }],
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
            "7 seconds on, 3 seconds off, six times per set. Builds strength endurance at a submaximal load.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "both",
        defaultBlocks: [{ grip: "half_crimp", edgeMm: 20, sets: 5 }],
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
            "Emil Abrahamsson's submaximal protocol, as run in the study behind it: 10 seconds on at around 40% of max — light strain, never hard — across six grip positions. Short and frequent by design, twice a day six hours apart, because it targets collagen synthesis rather than strength.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "alternate",
        // The six exercises and rep counts used in the study: 6 + 6 + 2 x 4 = 20.
        defaultBlocks: [
            { grip: "half_crimp", edgeMm: 14, sets: 6 },
            { grip: "front_three", edgeMm: 20, sets: 6 },
            { grip: "front_two_pocket", edgeMm: 20, sets: 2 },
            { grip: "middle_two_pocket", edgeMm: 20, sets: 2 },
            { grip: "front_two_crimp", edgeMm: 20, sets: 2 },
            { grip: "middle_two_crimp", edgeMm: 20, sets: 2 },
        ],
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
            "Long, moderate holds near failure — 30 seconds at roughly 65% of max, a couple per set, with several minutes between sets. Builds tendon density and cross-sectional area rather than peak force.",
        defaultMode: "pickup",
        interactive: false,
        defaultHandMode: "alternate",
        defaultBlocks: [{ grip: "half_crimp", edgeMm: 20, sets: 4 }],
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
