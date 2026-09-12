import { describe, it, expect } from "vitest"
import { PROTOCOL_DEFINITIONS } from "./protocols"
import {
    compileTimeline,
    completedWorkReps,
    performedWork,
    positionAt,
    stepOffsets,
    totalSeconds,
} from "./timeline"

const repeaters = PROTOCOL_DEFINITIONS.repeaters.defaults
const maxLift = PROTOCOL_DEFINITIONS.max_lift.defaults

/** Sets live on blocks now, so tests state them explicitly. */
const blocks = (...counts: number[]) => counts.map((sets) => ({ sets }))
const FIVE_SETS = blocks(5)

describe("compileTimeline", () => {
    it("builds the standard repeaters structure", () => {
        const steps = compileTimeline(repeaters, "both", FIVE_SETS)

        // prepare + 5 sets of (6 work + 5 rep rests) + 4 set rests
        expect(steps).toHaveLength(1 + 5 * 11 + 4)
        expect(steps[0].kind).toBe("prepare")
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(30)
        expect(steps.filter((s) => s.kind === "rep_rest")).toHaveLength(25)
        expect(steps.filter((s) => s.kind === "set_rest")).toHaveLength(4)
    })

    it("totals the expected duration for repeaters", () => {
        // 10 prepare + 5 x (6x7 work + 5x3 rest) + 4 x 180 set rest
        expect(totalSeconds(compileTimeline(repeaters, "both", FIVE_SETS))).toBe(10 + 5 * 57 + 720)
    })

    it("omits rep rests when there is a single rep per set", () => {
        const steps = compileTimeline(maxLift, "both", FIVE_SETS)

        expect(steps.filter((s) => s.kind === "rep_rest")).toHaveLength(0)
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(5)
        expect(totalSeconds(steps)).toBe(10 + 5 * 5 + 4 * 180)
    })

    it("never puts a rest after the final set", () => {
        const steps = compileTimeline(repeaters, "both", FIVE_SETS)
        expect(steps[steps.length - 1].kind).toBe("work")
    })

    it("omits the prepare step when prepare is zero", () => {
        const steps = compileTimeline({ ...repeaters, prepareSeconds: 0 }, "both", FIVE_SETS)
        expect(steps[0].kind).toBe("work")
    })

    it("numbers sets and reps from one", () => {
        const steps = compileTimeline({ ...repeaters, repsPerSet: 2 }, "both", blocks(2))
        const work = steps.filter((s) => s.kind === "work")

        expect(work.map((s) => [s.setIndex, s.repIndex])).toEqual([
            [1, 1],
            [1, 2],
            [2, 1],
            [2, 2],
        ])
    })
})

describe("positionAt", () => {
    const steps = compileTimeline(
        {
            prepareSeconds: 10,
            workSeconds: 7,
            repRestSeconds: 3,
            repsPerSet: 2,
            setRestSeconds: 180,
            handSwitchSeconds: 10,
        },
        "both",
        blocks(1)
    )
    const offsets = stepOffsets(steps)

    it("resolves the first step at zero", () => {
        expect(positionAt(steps, offsets, 0)).toMatchObject({ stepIndex: 0, remaining: 10 })
    })

    it("moves to the next step exactly on the boundary", () => {
        expect(positionAt(steps, offsets, 10)).toMatchObject({ stepIndex: 1, remaining: 7 })
    })

    it("reports remaining time part-way through a step", () => {
        expect(positionAt(steps, offsets, 13.5).remaining).toBeCloseTo(3.5)
    })

    it("finishes past the end of the timeline", () => {
        expect(positionAt(steps, offsets, 9999).finished).toBe(true)
    })

    it("survives a large jump forward, as after time in the background", () => {
        // 10 prepare + 7 work + 3 rest = 20, so 22s lands 2s into the second work step.
        expect(positionAt(steps, offsets, 22)).toMatchObject({ stepIndex: 3, remaining: 5 })
    })
})

describe("completedWorkReps", () => {
    const steps = compileTimeline(
        {
            prepareSeconds: 10,
            workSeconds: 7,
            repRestSeconds: 3,
            repsPerSet: 2,
            setRestSeconds: 180,
            handSwitchSeconds: 10,
        },
        "both",
        blocks(1)
    )
    const offsets = stepOffsets(steps)

    it("counts only work steps that ran to completion", () => {
        expect(completedWorkReps(steps, offsets, 0)).toBe(0)
        expect(completedWorkReps(steps, offsets, 16)).toBe(0)
        expect(completedWorkReps(steps, offsets, 17)).toBe(1)
        expect(completedWorkReps(steps, offsets, 27)).toBe(2)
    })
})

describe("alternating hands", () => {
    it("works left then right inside one set, sharing a single rest", () => {
        const steps = compileTimeline(maxLift, "alternate", blocks(2))

        expect(steps.map((s) => [s.kind, s.hand, s.seconds])).toEqual([
            ["prepare", "left", 10],
            ["work", "left", 5],
            ["hand_switch", "right", 10],
            ["work", "right", 5],
            ["set_rest", "left", 180],
            ["work", "left", 5],
            ["hand_switch", "right", 10],
            ["work", "right", 5],
        ])
    })

    it("rests once per set rather than once per hand", () => {
        const steps = compileTimeline(maxLift, "alternate", FIVE_SETS)

        expect(steps.filter((s) => s.kind === "set_rest")).toHaveLength(4)
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(10)
    })

    it("is far quicker than testing each hand as its own workout", () => {
        // Alternating: 10 + 5 x (5 + 10 + 5) + 4 x 180 = 830s
        expect(totalSeconds(compileTimeline(maxLift, "alternate", FIVE_SETS))).toBe(830)
        // Two separate single-hand workouts would cost nearly twice that.
        expect(totalSeconds(compileTimeline(maxLift, "left", FIVE_SETS)) * 2).toBe(1510)
    })

    it("does not switch hands in single-hand or two-handed modes", () => {
        for (const mode of ["both", "left", "right"] as const) {
            const steps = compileTimeline(maxLift, mode, FIVE_SETS)
            expect(steps.filter((s) => s.kind === "hand_switch")).toHaveLength(0)
            expect(steps.filter((s) => s.kind === "work")).toHaveLength(5)
        }
    })

    it("tags every work step with the hand actually under load", () => {
        const work = compileTimeline(maxLift, "alternate", FIVE_SETS).filter((s) => s.kind === "work")
        expect(work.map((s) => s.hand)).toEqual(["left", "right", "left", "right", "left", "right", "left", "right", "left", "right"])
    })

    it("points a hand switch at the hand being switched to", () => {
        const [firstSwitch] = compileTimeline(maxLift, "alternate", FIVE_SETS).filter(
            (s) => s.kind === "hand_switch"
        )
        expect(firstSwitch.hand).toBe("right")
    })

    it("alternates repeaters too, keeping all reps on one hand before switching", () => {
        const steps = compileTimeline({ ...repeaters, repsPerSet: 2 }, "alternate", blocks(1)).filter((s) => s.kind === "work" || s.kind === "hand_switch")

        expect(steps.map((s) => `${s.kind}:${s.hand}`)).toEqual([
            "work:left",
            "work:left",
            "hand_switch:right",
            "work:right",
            "work:right",
        ])
    })

    it("omits the switch gap when it is configured to zero", () => {
        const steps = compileTimeline({ ...maxLift, handSwitchSeconds: 0 }, "alternate", FIVE_SETS)
        expect(steps.filter((s) => s.kind === "hand_switch")).toHaveLength(0)
    })
})

describe("performedWork", () => {
    const params = maxLift

    it("counts only work that ran to completion", () => {
        const steps = compileTimeline(params, "both", blocks(3))
        const offsets = stepOffsets(steps)

        expect(performedWork(steps, offsets, 0)).toEqual([])
        // 10s prepare + 5s work = the first attempt is done at 15s.
        expect(performedWork(steps, offsets, 15)).toEqual([{ setIndex: 1, hand: "both" }])
    })

    it("does not count a set that was skipped past", () => {
        const steps = compileTimeline(params, "both", blocks(3))
        const offsets = stepOffsets(steps)
        const workIndices = steps
            .map((step, i) => (step.kind === "work" ? i : -1))
            .filter((i) => i >= 0)

        // Ran the whole timeline, but skipped the final attempt.
        const skipped = new Set([workIndices[2]])
        const performed = performedWork(steps, offsets, totalSeconds(steps), skipped)

        expect(performed.map((k) => k.setIndex)).toEqual([1, 2])
    })

    it("reports each hand separately when alternating", () => {
        const steps = compileTimeline(params, "alternate", blocks(1))
        const offsets = stepOffsets(steps)
        const performed = performedWork(steps, offsets, totalSeconds(steps))

        expect(performed).toEqual([
            { setIndex: 1, hand: "left" },
            { setIndex: 1, hand: "right" },
        ])
    })

    it("collapses a set's reps into one entry", () => {
        const steps = compileTimeline({ ...repeaters, repsPerSet: 6 }, "both", blocks(1))
        const offsets = stepOffsets(steps)

        expect(performedWork(steps, offsets, totalSeconds(steps))).toHaveLength(1)
    })
})

describe("grip position circuits", () => {
    it("runs each position for its own number of sets, in order", () => {
        // The published Abralifts shape: 3 + 3 + 1 + 1 + 1 + 1 = 10 sets.
        const steps = compileTimeline(
            PROTOCOL_DEFINITIONS.abralifts.defaults,
            "both",
            blocks(3, 3, 1, 1, 1, 1)
        )
        const work = steps.filter((s) => s.kind === "work")

        expect(work).toHaveLength(10)
        expect(work.map((s) => s.blockIndex)).toEqual([0, 0, 0, 1, 1, 1, 2, 3, 4, 5])
    })

    it("numbers sets continuously across positions", () => {
        const work = compileTimeline(
            PROTOCOL_DEFINITIONS.abralifts.defaults,
            "both",
            blocks(3, 2)
        ).filter((s) => s.kind === "work")

        expect(work.map((s) => s.setIndex)).toEqual([1, 2, 3, 4, 5])
    })

    it("rests between positions just as it does within one", () => {
        const steps = compileTimeline(
            PROTOCOL_DEFINITIONS.abralifts.defaults,
            "both",
            blocks(1, 1)
        )
        expect(steps.filter((s) => s.kind === "set_rest")).toHaveLength(1)
    })

    it("does not rest after the final set of the final position", () => {
        const steps = compileTimeline(
            PROTOCOL_DEFINITIONS.abralifts.defaults,
            "both",
            blocks(2, 2)
        )
        expect(steps[steps.length - 1].kind).toBe("work")
    })

    it("works both hands at every position when alternating", () => {
        const work = compileTimeline(
            PROTOCOL_DEFINITIONS.abralifts.defaults,
            "alternate",
            blocks(1, 1)
        ).filter((s) => s.kind === "work")

        expect(work.map((s) => `${s.blockIndex}:${s.hand}`)).toEqual([
            "0:left",
            "0:right",
            "1:left",
            "1:right",
        ])
    })

    it("returns nothing when no position has any sets", () => {
        expect(compileTimeline(PROTOCOL_DEFINITIONS.abralifts.defaults, "both", [])).toEqual([])
    })
})

describe("Abralifts session length", () => {
    const abralifts = PROTOCOL_DEFINITIONS.abralifts

    it("runs one minute per set when alternating hands", () => {
        const steps = compileTimeline(abralifts.defaults, "alternate", blocks(3))
        // Three sets of 60s, less the rest the final set does not take, plus prepare.
        expect(totalSeconds(steps)).toBe(10 + 3 * 60 - 30)
    })

    it("runs past the ten minute loading window on the full default, one hand at a time", () => {
        // 20 sets x 60s, less the final rest, plus prepare — about 20 minutes.
        // The study fits 20 reps in 10 minutes by working both hands at once;
        // alternating doubles the clock for the same volume per hand, which is
        // why setup warns about it rather than silently cutting the volume.
        const steps = compileTimeline(
            abralifts.defaults,
            "alternate",
            abralifts.defaultBlocks.map((b) => ({ sets: b.sets }))
        )
        expect(totalSeconds(steps)).toBe(10 + 20 * 60 - 30)
        expect(totalSeconds(steps)).toBeGreaterThan(10 * 60)
    })

    it("fits inside the window once the sets are halved", () => {
        const steps = compileTimeline(abralifts.defaults, "alternate", blocks(3, 3, 1, 1, 1, 1))
        expect(totalSeconds(steps)).toBeLessThanOrEqual(10 * 60)
    })
})
