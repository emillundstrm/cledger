import { describe, it, expect } from "vitest"
import { PROTOCOL_DEFINITIONS } from "./protocols"
import { compileTimeline, completedWorkReps, positionAt, stepOffsets, totalSeconds } from "./timeline"

const repeaters = PROTOCOL_DEFINITIONS.repeaters.defaults
const maxLift = PROTOCOL_DEFINITIONS.max_lift.defaults

describe("compileTimeline", () => {
    it("builds the standard repeaters structure", () => {
        const steps = compileTimeline(repeaters)

        // prepare + 5 sets of (6 work + 5 rep rests) + 4 set rests
        expect(steps).toHaveLength(1 + 5 * 11 + 4)
        expect(steps[0].kind).toBe("prepare")
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(30)
        expect(steps.filter((s) => s.kind === "rep_rest")).toHaveLength(25)
        expect(steps.filter((s) => s.kind === "set_rest")).toHaveLength(4)
    })

    it("totals the expected duration for repeaters", () => {
        // 10 prepare + 5 x (6x7 work + 5x3 rest) + 4 x 180 set rest
        expect(totalSeconds(compileTimeline(repeaters))).toBe(10 + 5 * 57 + 720)
    })

    it("omits rep rests when there is a single rep per set", () => {
        const steps = compileTimeline(maxLift)

        expect(steps.filter((s) => s.kind === "rep_rest")).toHaveLength(0)
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(5)
        expect(totalSeconds(steps)).toBe(10 + 5 * 5 + 4 * 180)
    })

    it("never puts a rest after the final set", () => {
        const steps = compileTimeline(repeaters)
        expect(steps[steps.length - 1].kind).toBe("work")
    })

    it("omits the prepare step when prepare is zero", () => {
        const steps = compileTimeline({ ...repeaters, prepareSeconds: 0 })
        expect(steps[0].kind).toBe("work")
    })

    it("numbers sets and reps from one", () => {
        const steps = compileTimeline({ ...repeaters, sets: 2, repsPerSet: 2 })
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
    const steps = compileTimeline({
        prepareSeconds: 10,
        workSeconds: 7,
        repRestSeconds: 3,
        repsPerSet: 2,
        sets: 1,
        setRestSeconds: 180,
    })
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
    const steps = compileTimeline({
        prepareSeconds: 10,
        workSeconds: 7,
        repRestSeconds: 3,
        repsPerSet: 2,
        sets: 1,
        setRestSeconds: 180,
    })
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
        const steps = compileTimeline({ ...maxLift, sets: 2 }, "alternate")

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
        const steps = compileTimeline(maxLift, "alternate")

        expect(steps.filter((s) => s.kind === "set_rest")).toHaveLength(maxLift.sets - 1)
        expect(steps.filter((s) => s.kind === "work")).toHaveLength(maxLift.sets * 2)
    })

    it("is far quicker than testing each hand as its own workout", () => {
        // Alternating: 10 + 5 x (5 + 10 + 5) + 4 x 180 = 830s
        expect(totalSeconds(compileTimeline(maxLift, "alternate"))).toBe(830)
        // Two separate single-hand workouts would cost nearly twice that.
        expect(totalSeconds(compileTimeline(maxLift, "left")) * 2).toBe(1510)
    })

    it("does not switch hands in single-hand or two-handed modes", () => {
        for (const mode of ["both", "left", "right"] as const) {
            const steps = compileTimeline(maxLift, mode)
            expect(steps.filter((s) => s.kind === "hand_switch")).toHaveLength(0)
            expect(steps.filter((s) => s.kind === "work")).toHaveLength(maxLift.sets)
        }
    })

    it("tags every work step with the hand actually under load", () => {
        const work = compileTimeline(maxLift, "alternate").filter((s) => s.kind === "work")
        expect(work.map((s) => s.hand)).toEqual(["left", "right", "left", "right", "left", "right", "left", "right", "left", "right"])
    })

    it("points a hand switch at the hand being switched to", () => {
        const [firstSwitch] = compileTimeline(maxLift, "alternate").filter(
            (s) => s.kind === "hand_switch"
        )
        expect(firstSwitch.hand).toBe("right")
    })

    it("alternates repeaters too, keeping all reps on one hand before switching", () => {
        const steps = compileTimeline(
            { ...repeaters, sets: 1, repsPerSet: 2 },
            "alternate"
        ).filter((s) => s.kind === "work" || s.kind === "hand_switch")

        expect(steps.map((s) => `${s.kind}:${s.hand}`)).toEqual([
            "work:left",
            "work:left",
            "hand_switch:right",
            "work:right",
            "work:right",
        ])
    })

    it("omits the switch gap when it is configured to zero", () => {
        const steps = compileTimeline({ ...maxLift, handSwitchSeconds: 0 }, "alternate")
        expect(steps.filter((s) => s.kind === "hand_switch")).toHaveLength(0)
    })
})
