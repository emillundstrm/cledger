import type { Grip, Hand, HandMode, Mode, ProtocolParams } from "./protocols"

export interface WorkoutConfig {
    grip: Grip
    handMode: HandMode
    mode: Mode
    /** Smallest plate available, used for ladder rounding. */
    incrementKg: number
    edgeMm: number
    bodyweightKg: number | null
    /** Hang: added weight (negative for assistance). Pickup: weight lifted. */
    loadKg: number
    params: ProtocolParams
}

export interface RecordedSet {
    /** 1-based, matching the step timeline. */
    setIndex: number
    /** Which hand this attempt was on; alternating sets produce one per hand. */
    hand: Hand
    /** Hang: added weight. Pickup: weight lifted. */
    loadKg: number
    completed: boolean
    rpe: number | null
}
