export const GRIPS = ["half_crimp", "open", "full_crimp", "three_finger_drag"] as const
export type Grip = (typeof GRIPS)[number]

export const HANDS = ["both", "left", "right"] as const
export type Hand = (typeof HANDS)[number]

export const MODES = ["hang", "pickup"] as const
export type Mode = (typeof MODES)[number]

export const PROTOCOLS = ["max_lift", "repeaters"] as const
export type Protocol = (typeof PROTOCOLS)[number]

export const GRIP_LABELS: Record<Grip, string> = {
    half_crimp: "Half crimp",
    open: "Open hand",
    full_crimp: "Full crimp",
    three_finger_drag: "Three finger drag",
}

export const HAND_LABELS: Record<Hand, string> = {
    both: "Both hands",
    left: "Left hand",
    right: "Right hand",
}

export const EDGE_OPTIONS = [6, 8, 10, 12, 15, 20, 25, 30] as const

export interface ProtocolParams {
    prepareSeconds: number
    workSeconds: number
    repRestSeconds: number
    repsPerSet: number
    sets: number
    setRestSeconds: number
}

export interface ProtocolDefinition {
    id: Protocol
    name: string
    description: string
    /** Hangs are loaded relative to bodyweight; pickups are absolute. */
    mode: Mode
    /**
     * Interactive protocols have the user record the load achieved after every
     * work step, because the next attempt depends on the previous result.
     */
    interactive: boolean
    defaults: ProtocolParams
}

export const PROTOCOL_DEFINITIONS: Record<Protocol, ProtocolDefinition> = {
    max_lift: {
        id: "max_lift",
        name: "Max Lift",
        description:
            "Pick up progressively heavier weight from an edge to find your true maximum. This is the calibration that every other protocol's load is derived from.",
        mode: "pickup",
        interactive: true,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 5,
            repRestSeconds: 0,
            repsPerSet: 1,
            sets: 5,
            setRestSeconds: 180,
        },
    },
    repeaters: {
        id: "repeaters",
        name: "Repeaters",
        description:
            "7 seconds on, 3 seconds off, six times per set. Builds strength endurance at a submaximal load.",
        mode: "hang",
        interactive: false,
        defaults: {
            prepareSeconds: 10,
            workSeconds: 7,
            repRestSeconds: 3,
            repsPerSet: 6,
            sets: 5,
            setRestSeconds: 180,
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
