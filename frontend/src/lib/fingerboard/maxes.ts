import type { FingerboardMax } from "@/api/types"
import type { Grip } from "./protocols"

export const STALE_AFTER_DAYS = 90

export function isStale(testedAt: string, now: Date = new Date(), days: number = STALE_AFTER_DAYS): boolean {
    const tested = new Date(testedAt).getTime()
    const ageDays = (now.getTime() - tested) / (1000 * 60 * 60 * 24)
    return ageDays > days
}

export interface Asymmetry {
    grip: Grip
    edgeMm: number
    leftKg: number
    rightKg: number
    /** Difference as a percentage of the stronger side. */
    differencePct: number
    strongerHand: "left" | "right"
}

/**
 * Pairs up single-hand maxima on the same grip and edge. A large left/right gap
 * is a useful early injury signal that whole-session logging cannot surface.
 */
export function asymmetries(maxes: FingerboardMax[]): Asymmetry[] {
    const byKey = new Map<string, { left?: number; right?: number; grip: Grip; edgeMm: number }>()

    for (const max of maxes) {
        if (max.hand === "both") {
            continue
        }
        const key = `${max.grip}:${max.edgeMm}`
        const entry = byKey.get(key) ?? { grip: max.grip, edgeMm: max.edgeMm }
        entry[max.hand] = max.maxLoadKg
        byKey.set(key, entry)
    }

    const result: Asymmetry[] = []
    for (const entry of byKey.values()) {
        if (entry.left === undefined || entry.right === undefined) {
            continue
        }
        const stronger = Math.max(entry.left, entry.right)
        const weaker = Math.min(entry.left, entry.right)
        if (stronger === 0) {
            continue
        }
        result.push({
            grip: entry.grip,
            edgeMm: entry.edgeMm,
            leftKg: entry.left,
            rightKg: entry.right,
            differencePct: Math.round(((stronger - weaker) / stronger) * 1000) / 10,
            strongerHand: entry.left >= entry.right ? "left" : "right",
        })
    }

    return result.sort((a, b) => b.differencePct - a.differencePct)
}
