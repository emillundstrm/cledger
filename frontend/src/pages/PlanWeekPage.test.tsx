import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PlanWeekPage from "@/pages/PlanWeekPage"
import type { TrainingPlan } from "@/api/types"

vi.mock("@/api/plans", () => ({
    fetchTrainingPlan: vi.fn(),
    updateTrainingPlan: vi.fn(),
}))

import { fetchTrainingPlan, updateTrainingPlan } from "@/api/plans"

const plan: TrainingPlan = {
    id: "p", title: "Höstblock", goal: null, notes: null, startDate: "2026-10-12", archived: false,
    weeks: [
        { week: 1, startDate: "2026-10-12", phase: "strength", focus: "Maxhäng", targetCount: 2, plannedCount: 3, doneCount: 1 },
    ],
    sessions: [
        {
            id: "t1", title: "Moonboard", category: "strength", description: null, sessionTypes: ["board"],
            fingerboardPreset: null, sortOrder: 0, archived: false,
            entries: [{ id: "moon", week: 1, count: 2, note: null, doneCount: 1 }],
        },
        {
            id: "t2", title: "Löpning", category: "endurance", description: null, sessionTypes: ["running"],
            fingerboardPreset: null, sortOrder: 1, archived: false, entries: [],
        },
    ],
}

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/plan/weeks/1"]}>
                <Routes>
                    <Route path="/plan/weeks/:week" element={<PlanWeekPage />} />
                    <Route path="/plan" element={<p>Planen</p>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchTrainingPlan).mockResolvedValue(plan)
    vi.mocked(updateTrainingPlan).mockResolvedValue()
})

describe("PlanWeekPage", () => {
    it("lists every session with its count in the week", async () => {
        renderPage()
        expect(await screen.findByRole("group", { name: "Moonboard" })).toHaveTextContent("2")
        expect(screen.getByRole("group", { name: "Löpning" })).toHaveTextContent("0")
        expect(screen.getByText("Styrka · 1 gjort")).toBeInTheDocument()
    })

    it("cannot count a session below what is already done", async () => {
        const user = userEvent.setup()
        renderPage()
        const fewer = await screen.findByRole("button", { name: "Färre Moonboard" })
        await user.click(fewer)
        expect(fewer).toBeDisabled()
        expect(screen.getByRole("group", { name: "Moonboard" })).toHaveTextContent("1")
    })

    it("saves the week and the changed sessions in one patch", async () => {
        const user = userEvent.setup()
        renderPage()
        await user.click(await screen.findByRole("button", { name: "Fler Löpning" }))
        await user.click(screen.getByRole("button", { name: "Lägg till notering för Löpning" }))
        await user.type(screen.getByLabelText("Notering för Löpning den här veckan"), "Lugnt")
        await user.click(screen.getByRole("button", { name: "Återhämtning" }))
        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(updateTrainingPlan).toHaveBeenCalledWith("p", {
            weeks: [{ week: 1, phase: "recovery", targetCount: 2, focus: "Maxhäng" }],
            sessions: [{ id: "t2", entries: [{ week: 1, count: 1, note: "Lugnt" }] }],
        })
        expect(await screen.findByText("Planen")).toBeInTheDocument()
    })

    it("refuses a target above the planned sessions", async () => {
        const user = userEvent.setup()
        renderPage()
        const target = await screen.findByLabelText("Mål")
        await user.clear(target)
        await user.type(target, "5")
        await user.click(screen.getByRole("button", { name: "Spara" }))

        expect(updateTrainingPlan).not.toHaveBeenCalled()
        expect(target).toHaveAccessibleDescription("Målet kan inte vara fler än de planerade passen.")
    })
})
