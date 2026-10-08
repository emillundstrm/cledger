import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import WorkoutRunner from "./WorkoutRunner"
import { PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"
import { compileTimeline } from "@/lib/fingerboard/timeline"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"

const protocol = PROTOCOL_DEFINITIONS.repeaters

const config: WorkoutConfig = {
    blocks: [{ grip: "half_crimp", edgeMm: 20, sets: 2, loadKg: 0 }],
    handMode: "both",
    mode: "hang",
    incrementKg: 1,
    bodyweightKg: 70,
    params: protocol.defaults,
}

const sets: RecordedSet[] = [
    { setIndex: 1, blockIndex: 0, hand: "both", loadKg: 0, completed: true, rpe: null },
    { setIndex: 2, blockIndex: 0, hand: "both", loadKg: 0, completed: true, rpe: null },
]

function renderRunner() {
    return render(
        <WorkoutRunner
            protocol={protocol}
            config={config}
            steps={compileTimeline(config.params, config.handMode, config.blocks)}
            recordedSets={sets}
            onRecordSet={vi.fn()}
            onFinish={vi.fn()}
            onAbandon={vi.fn()}
            onDiscard={vi.fn()}
        />
    )
}

describe("WorkoutRunner", () => {
    it("pauses while deciding whether to stop, and resumes on keep going", async () => {
        const user = userEvent.setup()
        renderRunner()

        await user.click(screen.getByRole("button", { name: "Starta" }))
        expect(screen.getByRole("button", { name: "Pausa" })).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Avsluta" }))
        expect(screen.getByText(/Klockan är pausad/)).toBeInTheDocument()
        // The runner behind the dialog is hidden from queries, so look past that
        expect(screen.getByRole("button", { name: "Fortsätt", hidden: true })).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Fortsätt köra" }))
        expect(screen.getByRole("button", { name: "Pausa" })).toBeInTheDocument()
    })

    it("pauses and resumes with Space", async () => {
        const user = userEvent.setup()
        renderRunner()
        await user.click(screen.getByRole("button", { name: "Starta" }))
        ;(document.activeElement as HTMLElement | null)?.blur()

        await user.keyboard(" ")
        expect(screen.getByRole("button", { name: "Fortsätt" })).toBeInTheDocument()
        ;(document.activeElement as HTMLElement | null)?.blur()
        await user.keyboard(" ")
        expect(screen.getByRole("button", { name: "Pausa" })).toBeInTheDocument()
    })

    it("keeps skipping apart from pausing", async () => {
        const user = userEvent.setup()
        renderRunner()
        await user.click(screen.getByRole("button", { name: "Starta" }))

        const pause = screen.getByRole("button", { name: "Pausa" })
        const skip = screen.getByRole("button", { name: "Hoppa över" })
        expect(pause.parentElement).not.toBe(skip.parentElement)
    })

    it("takes over the page while running and gives it back after", async () => {
        const user = userEvent.setup()
        const { unmount } = renderRunner()
        const root = document.createElement("div")
        root.id = "root"
        document.body.appendChild(root)

        await user.click(screen.getByRole("button", { name: "Starta" }))
        expect(document.documentElement).toHaveAttribute("data-immersive")
        expect(root).toHaveAttribute("inert")

        unmount()
        expect(document.documentElement).not.toHaveAttribute("data-immersive")
        expect(root).not.toHaveAttribute("inert")
        root.remove()
    })
})
