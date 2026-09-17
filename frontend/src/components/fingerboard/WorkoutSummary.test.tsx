import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import WorkoutSummary from "./WorkoutSummary"
import type { Session } from "@/api/types"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"
import { PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"

const protocol = PROTOCOL_DEFINITIONS.repeaters

const config: WorkoutConfig = {
    blocks: [{ grip: "half_crimp", edgeMm: 20, sets: 2, loadKg: 10 }],
    handMode: "both",
    mode: "hang",
    incrementKg: 1,
    bodyweightKg: 70,
    params: protocol.defaults,
}

const sets: RecordedSet[] = [
    { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 10, completed: true, rpe: null },
    { setIndex: 2, blockIndex: 0, hand: "both", loadKg: 10, completed: true, rpe: null },
]

function sessionToday(overrides: Partial<Session> = {}): Session {
    return {
        id: "session-1",
        date: "2026-09-17",
        types: ["boulder"],
        intensity: 8,
        performance: "strong",
        durationMinutes: 90,
        notes: null,
        maxGrade: null,
        venue: null,
        injuries: [],
        createdAt: "2026-09-17T09:00:00Z",
        updatedAt: "2026-09-17T09:00:00Z",
        ...overrides,
    }
}

const onSave = vi.fn()

function renderSummary(todaysSessions: Session[]) {
    render(
        <WorkoutSummary
            protocol={protocol}
            config={config}
            sets={sets}
            elapsedSeconds={600}
            todaysSessions={todaysSessions}
            onChangeSet={vi.fn()}
            onSave={onSave}
            onDiscard={vi.fn()}
            isSaving={false}
        />
    )
}

describe("WorkoutSummary", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("logs a session of its own when nothing exists for today", async () => {
        const user = userEvent.setup()
        renderSummary([])

        expect(screen.queryByText("Log to")).not.toBeInTheDocument()
        expect(screen.getByText("Session RPE")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Save session" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: null, rpe: 7 })
        )
    })

    it("joins today's session by default, without asking for RPE or feeling", async () => {
        const user = userEvent.setup()
        renderSummary([sessionToday()])

        expect(screen.getByText("Boulder · 90 min · RPE 8")).toBeInTheDocument()
        expect(screen.queryByText("Session RPE")).not.toBeInTheDocument()
        expect(screen.queryByText("Performance")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Add to session" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: "session-1" })
        )
    })

    it("still allows logging a separate session", async () => {
        const user = userEvent.setup()
        renderSummary([sessionToday()])

        await user.click(screen.getByRole("button", { name: "Log as a separate session" }))

        expect(screen.getByText("Session RPE")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Save session" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: null })
        )
    })
})
