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

    it("opens with the remembered bodyweight", async () => {
        localStorage.setItem("cledger-bodyweight-kg", "70")
        const user = userEvent.setup()
        renderSetup()

        await user.click(screen.getByRole("radio", { name: "Häng" }))

        expect(screen.getByLabelText("Kroppsvikt (kg)")).toHaveValue(70)
    })
})
