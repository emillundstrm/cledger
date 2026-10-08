import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import WorkoutSetup from "./WorkoutSetup"
import { PROTOCOL_DEFINITIONS } from "@/lib/fingerboard/protocols"

vi.mock("@/api/fingerboard", () => ({
    fetchLastFingerboardWorkout: vi.fn(),
    fetchLoadRecommendations: vi.fn(),
}))

import { fetchLastFingerboardWorkout, fetchLoadRecommendations } from "@/api/fingerboard"

const onStart = vi.fn()

function renderSetup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <WorkoutSetup protocol={PROTOCOL_DEFINITIONS.repeaters} onStart={onStart} />
        </QueryClientProvider>
    )
}

describe("WorkoutSetup", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        localStorage.clear()
        vi.mocked(fetchLastFingerboardWorkout).mockResolvedValue([])
        vi.mocked(fetchLoadRecommendations).mockResolvedValue({})
    })

    it("remembers the bodyweight a hang workout started with", async () => {
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole("radio", { name: "Häng" }))
        await user.type(screen.getByLabelText("Kroppsvikt (kg)"), "71.5")
        // With no history there is no suggested load, so set one
        await user.click(screen.getAllByRole("button", { name: /^Öka med/ })[0])
        await user.click(screen.getByRole("button", { name: "Starta passet" }))

        expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ bodyweightKg: 71.5 }))
        expect(localStorage.getItem("cledger-bodyweight-kg")).toBe("71.5")
    })

    it("starts a bodyweight hang with no added weight", async () => {
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole("radio", { name: "Häng" }))
        await user.type(screen.getByLabelText("Kroppsvikt (kg)"), "70")
        await user.click(screen.getByRole("button", { name: "Starta passet" }))

        expect(onStart).toHaveBeenCalledOnce()
        const config = onStart.mock.calls[0][0]
        expect(config.blocks.every((block: { loadKg: number }) => block.loadKg === 0)).toBe(true)
    })

    it("still needs weight on the bar for a lift", async () => {
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole("radio", { name: "Lyft" }))
        await user.click(screen.getByRole("button", { name: "Starta passet" }))

        expect(onStart).not.toHaveBeenCalled()
        expect(screen.getByRole("alert")).toHaveTextContent("Ställ in en vikt över 0 kg")
    })

    it("keeps plate step, timings and the sound check behind one toggle", async () => {
        const user = userEvent.setup()
        renderSetup()
        expect(screen.queryByLabelText("Viktsteg")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Testa ljudet" })).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Viktsteg, tider, ljud" }))

        expect(screen.getByLabelText("Viktsteg")).toBeInTheDocument()
        expect(screen.getByLabelText("Arbete (s)")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Testa ljudet" })).toBeInTheDocument()
    })

    it("starts as the last workout was done, and keeps its load to that mode", async () => {
        const user = userEvent.setup()
        vi.mocked(fetchLastFingerboardWorkout).mockResolvedValue([
            { grip: "half_crimp", edgeMm: 20, sets: 6, loadKg: 5, mode: "hang" },
        ])
        renderSetup()

        await vi.waitFor(() => expect(screen.getByRole("radio", { name: "Häng" })).toBeChecked())
        await user.type(screen.getByLabelText("Kroppsvikt (kg)"), "70")
        await user.click(screen.getByRole("button", { name: "Starta passet" }))
        expect(onStart).toHaveBeenLastCalledWith(
            expect.objectContaining({ mode: "hang", blocks: [expect.objectContaining({ loadKg: 5 })] })
        )

        // +5 kg on a hang says nothing about what to lift
        onStart.mockClear()
        await user.click(screen.getByRole("radio", { name: "Lyft" }))
        await user.click(screen.getByRole("button", { name: "Starta passet" }))
        expect(onStart).not.toHaveBeenCalled()
        expect(screen.getByRole("alert")).toHaveTextContent("Ställ in en vikt över 0 kg")
    })

    it("remembers hand mode and timings from the last start", async () => {
        const user = userEvent.setup()
        localStorage.setItem(
            "cledger-workout-run-repeaters",
            JSON.stringify({ handMode: "alternate", params: { workSeconds: 8 } })
        )
        renderSetup()

        expect(screen.getByLabelText("Hand")).toHaveTextContent("Växelvis")
        await user.click(screen.getByRole("button", { name: "Viktsteg, tider, ljud" }))
        expect(screen.getByLabelText("Arbete (s)")).toHaveValue(8)
    })

    it("opens with the remembered bodyweight", async () => {
        localStorage.setItem("cledger-bodyweight-kg", "70")
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole("radio", { name: "Häng" }))

        expect(screen.getByLabelText("Kroppsvikt (kg)")).toHaveValue(70)
    })
})
