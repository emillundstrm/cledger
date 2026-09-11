import type { Grip, Hand, ProtocolParams } from "./protocols"

export interface WorkoutConfig {
    grip: Grip
    hand: Hand
    edgeMm: number
    bodyweightKg: number | null
    /** Hang: added weight (negative for assistance). Pickup: weight lifted. */
    loadKg: number
    params: ProtocolParams
}

export interface RecordedSet {
    /** 1-based, matching the step timeline. */
    setIndex: number
    /** Hang: added weight. Pickup: weight lifted. */
    loadKg: number
    completed: boolean
    rpe: number | null
}
