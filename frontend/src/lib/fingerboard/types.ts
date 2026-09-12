import type { Grip, Hand, HandMode, Mode, ProtocolParams } from "./protocols"

/** One grip position within a workout, with its own sets and load. */
export interface WorkoutBlock {
    grip: Grip
    edgeMm: number
    sets: number
    /** Hang: added weight (negative for assistance). Pickup: weight lifted. */
    loadKg: number
}

export interface WorkoutConfig {
    /** Worked in order. Most protocols have one; Abralifts is a circuit. */
    blocks: WorkoutBlock[]
    handMode: HandMode
    mode: Mode
    /** Smallest plate available, used for stepping and ladder rounding. */
    incrementKg: number
    bodyweightKg: number | null
    params: ProtocolParams
}

export function totalSets(blocks: WorkoutBlock[]): number {
    return blocks.reduce((sum, block) => sum + block.sets, 0)
}

export interface RecordedSet {
    /** 1-based across the whole workout, matching the step timeline. */
    setIndex: number
    /** Which position this set belongs to. */
    blockIndex: number
    /** Which hand this attempt was on; alternating sets produce one per hand. */
    hand: Hand
    /** Hang: added weight. Pickup: weight lifted. */
    loadKg: number
    completed: boolean
    rpe: number | null
}
