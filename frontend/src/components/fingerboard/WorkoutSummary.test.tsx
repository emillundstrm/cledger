import { render, screen, within } from "@testing-library/react"
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
const onDiscard = vi.fn()
const onChangeSet = vi.fn()

function renderSummary(todaysSessions: Session[]) {
    render(
        <WorkoutSummary
            protocol={protocol}
            config={config}
            sets={sets}
            elapsedSeconds={600}
            todaysSessions={todaysSessions}
            onChangeSet={onChangeSet}
            onSave={onSave}
            onDiscard={onDiscard}
            isSaving={false}
        />
    )
}

describe("WorkoutSummary", () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    it("asks before discarding the workout", async () => {
        const user = userEvent.setup()
        renderSummary([])

        await user.click(screen.getByRole("button", { name: "Släng" }))
        expect(onDiscard).not.toHaveBeenCalled()
        expect(screen.getByText("Släng passet?")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Släng passet" }))
        expect(onDiscard).toHaveBeenCalledOnce()
    })

    it("records a missed set with the same held/missed control as the runner", async () => {
        const user = userEvent.setup()
        renderSummary([])

        const outcome = screen.getByRole("radiogroup", { name: "Set 2, resultat" })
        expect(within(outcome).getByRole("radio", { name: "Klarade" })).toBeChecked()

        await user.click(within(outcome).getByRole("radio", { name: "Missade" }))
        expect(onChangeSet).toHaveBeenCalledWith(2, "both", { completed: false })
    })

    it("asks about the last set before calling a new max on a lift", async () => {
        const user = userEvent.setup()
        render(
            <WorkoutSummary
                protocol={PROTOCOL_DEFINITIONS.max_lift}
                config={{ ...config, mode: "pickup" }}
                sets={[
                    { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 40, completed: true, rpe: null },
                    { setIndex: 2, blockIndex: 0, hand: "both", loadKg: 44, completed: true, rpe: null },
                    { setIndex: 3, blockIndex: 0, hand: "both", loadKg: 46, completed: false, rpe: null },
                ]}
                elapsedSeconds={600}
                todaysSessions={[]}
                previousMaxes={[
                    { grip: "half_crimp", edgeMm: 20, hand: "both", maxLoadKg: 42, testedAt: "2026-09-01T10:00:00Z" },
                ]}
                onChangeSet={vi.fn()}
                onSave={vi.fn()}
                onDiscard={vi.fn()}
                isSaving={false}
            />
        )

        // The last attempt was never asked about in the runner, so no claim yet
        expect(screen.getByRole("heading", { name: "Passet är klart" })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Nytt max" })).not.toBeInTheDocument()

        const lastSet = screen.getByRole("radiogroup", { name: "Sista setet, resultat" })
        await user.click(within(lastSet).getByRole("radio", { name: "Missade" }))

        expect(screen.getByRole("heading", { name: "Nytt max" })).toBeInTheDocument()
        // The missed 46 kg doesn't count; 44 beats the old 42
        expect(screen.getByText(/\+2 kg/)).toBeInTheDocument()
    })

    it("keeps the notes summary in step with the sets until it is edited", async () => {
        const user = userEvent.setup()
        const props = {
            protocol,
            config,
            elapsedSeconds: 600,
            todaysSessions: [],
            onChangeSet: vi.fn(),
            onSave: vi.fn(),
            onDiscard: vi.fn(),
            isSaving: false,
        }
        const { rerender } = render(<WorkoutSummary {...props} sets={sets} />)
        expect((screen.getByLabelText("Anteckningar") as HTMLTextAreaElement).value).toContain("2/2 set klarade")

        const missedSecond = [sets[0], { ...sets[1], completed: false }]
        rerender(<WorkoutSummary {...props} sets={missedSecond} />)
        expect((screen.getByLabelText("Anteckningar") as HTMLTextAreaElement).value).toContain("1/2 set klarade")

        await user.clear(screen.getByLabelText("Anteckningar"))
        await user.type(screen.getByLabelText("Anteckningar"), "Tunga fingrar idag.")
        rerender(<WorkoutSummary {...props} sets={sets} />)
        expect(screen.getByLabelText("Anteckningar")).toHaveValue("Tunga fingrar idag.")
    })

    it("says when a workout was stopped early", () => {
        render(
            <WorkoutSummary
                protocol={protocol}
                config={config}
                sets={sets}
                elapsedSeconds={300}
                todaysSessions={[]}
                abandoned
                onChangeSet={vi.fn()}
                onSave={vi.fn()}
                onDiscard={vi.fn()}
                isSaving={false}
            />
        )

        expect(screen.getByRole("heading", { name: "Passet avbröts" })).toBeInTheDocument()
    })

    it("counts an alternating set once, not once per hand", () => {
        // Two hands inside one set is still one set. Counting the rows made a
        // 2 set workout report as 4, the same doubling that fed back into the
        // next workout's default volume.
        render(
            <WorkoutSummary
                protocol={protocol}
                config={{ ...config, handMode: "alternate" }}
                sets={[
                    { setIndex: 1, blockIndex: 0, hand: "left", loadKg: 10, completed: true, rpe: null },
                    { setIndex: 1, blockIndex: 0, hand: "right", loadKg: 10, completed: true, rpe: null },
                    { setIndex: 2, blockIndex: 0, hand: "left", loadKg: 10, completed: true, rpe: null },
                    { setIndex: 2, blockIndex: 0, hand: "right", loadKg: 10, completed: true, rpe: null },
                ]}
                elapsedSeconds={600}
                todaysSessions={[]}
                onChangeSet={vi.fn()}
                onSave={vi.fn()}
                onDiscard={vi.fn()}
                isSaving={false}
            />
        )

        expect(screen.getByText(/2 av 2 set klarade/)).toBeInTheDocument()
    })

    it("logs a session of its own when nothing exists for today", async () => {
        const user = userEvent.setup()
        renderSummary([])

        expect(screen.queryByText("Logga till")).not.toBeInTheDocument()
        expect(screen.getByText("Passets RPE")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Spara passet" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: null, rpe: 7 })
        )
    })

    it("joins today's session by default, without asking for RPE or feeling", async () => {
        const user = userEvent.setup()
        renderSummary([sessionToday()])

        expect(screen.getByText("Boulder · 90 min · RPE 8")).toBeInTheDocument()
        expect(screen.queryByText("Passets RPE")).not.toBeInTheDocument()
        expect(screen.queryByText("Prestation")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Lägg till i passet" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: "session-1" })
        )
    })

    it("still allows logging a separate session", async () => {
        const user = userEvent.setup()
        renderSummary([sessionToday()])

        await user.click(screen.getByRole("radio", { name: "Logga som ett eget pass" }))

        expect(screen.getByText("Passets RPE")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Spara passet" }))

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ attachToSessionId: null })
        )
    })

    it("selects today's session as an option card", () => {
        renderSummary([sessionToday()])

        expect(screen.getByRole("radio", { name: /Lägg till i dagens pass/ })).toBeChecked()
        expect(screen.getByRole("radio", { name: "Logga som ett eget pass" })).not.toBeChecked()
    })

    it("shows a failed save next to the buttons", () => {
        render(
            <WorkoutSummary
                protocol={protocol}
                config={config}
                sets={sets}
                elapsedSeconds={600}
                todaysSessions={[]}
                onChangeSet={vi.fn()}
                onSave={vi.fn()}
                onDiscard={vi.fn()}
                isSaving={false}
                saveError="Kunde inte spara passet. Försök igen."
            />
        )

        expect(screen.getByRole("alert")).toHaveTextContent("Kunde inte spara passet")
    })
})
