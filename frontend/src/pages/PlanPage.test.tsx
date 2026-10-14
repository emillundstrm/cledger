import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PlanPage from "@/pages/PlanPage"
import type { CurrentPlanWeek, TrainingPlan } from "@/api/types"

vi.mock("@/api/plans", () => ({
    fetchCurrentPlanWeek: vi.fn(),
    fetchTrainingPlan: vi.fn(),
}))

import { fetchCurrentPlanWeek, fetchTrainingPlan } from "@/api/plans"

const plan: TrainingPlan = {
    id: "p",
    title: "Höstblock",
    goal: "Starkare fingrar inför vintern",
    notes: null,
    startDate: "2026-10-12",
    archived: false,
    weeks: [
        { week: 1, startDate: "2026-10-12", phase: "strength", focus: "Maxhäng", targetCount: 2, plannedCount: 3, doneCount: 1 },
        { week: 2, startDate: "2026-10-19", phase: "recovery", focus: null, targetCount: null, plannedCount: 2, doneCount: 0 },
    ],
    sessions: [
        {
            id: "t1", title: "Moonboard", category: "strength", description: "Maxförsök på 40°",
            sessionTypes: ["board"], fingerboardPreset: null, sortOrder: 0, archived: false,
            entries: [
                { id: "moon", week: 1, count: 2, note: null, doneCount: 1 },
                { id: "moon2", week: 2, count: 1, note: null, doneCount: 0 },
            ],
        },
        {
            id: "t2", title: "Löpning", category: "endurance", description: null,
            sessionTypes: ["other"], fingerboardPreset: null, sortOrder: 1, archived: false,
            entries: [{ id: "run", week: 1, count: 1, note: null, doneCount: 0 }],
        },
        {
            id: "t3", title: "Gammalt pass", category: "other", description: null,
            sessionTypes: [], fingerboardPreset: null, sortOrder: 2, archived: true,
            entries: [{ id: "old", week: 2, count: 1, note: null, doneCount: 0 }],
        },
    ],
}

const week: CurrentPlanWeek = {
    planId: "p",
    planTitle: "Höstblock",
    week: 1,
    weekCount: 2,
    startDate: "2026-10-12",
    endDate: "2026-10-18",
    phase: "strength",
    focus: "Maxhäng",
    targetCount: 2,
    plannedCount: 3,
    doneCount: 1,
    items: [
        {
            entryId: "moon", planSessionId: "t1", title: "Moonboard", category: "strength",
            description: "Maxförsök på 40°", sessionTypes: ["board"], fingerboardPreset: null,
            note: null, slot: 1, sessionId: "s1", sessionDate: "2026-10-13",
        },
        {
            entryId: "moon", planSessionId: "t1", title: "Moonboard", category: "strength",
            description: "Maxförsök på 40°", sessionTypes: ["board"], fingerboardPreset: null,
            note: "Fler försök", slot: 2, sessionId: null, sessionDate: null,
        },
        {
            entryId: "run", planSessionId: "t2", title: "Löpning", category: "endurance",
            description: null, sessionTypes: ["other"], fingerboardPreset: null,
            note: null, slot: 1, sessionId: null, sessionDate: null,
        },
    ],
}

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/plan"]}>
                <PlanPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchTrainingPlan).mockResolvedValue(plan)
    vi.mocked(fetchCurrentPlanWeek).mockResolvedValue(week)
})

describe("PlanPage", () => {
    it("shows this week's progress against its target", async () => {
        renderPage()
        expect(await screen.findByRole("heading", { name: "Höstblock" })).toBeInTheDocument()
        expect(screen.getByText("av 2 · 3 planerade")).toBeInTheDocument()
        expect(screen.getByText("1 kvar")).toBeInTheDocument()
    })

    it("expands an item to show its details, with a button to log it", async () => {
        const user = userEvent.setup()
        renderPage()
        const rows = await screen.findAllByRole("button", { name: /Moonboard/ })
        expect(rows[1]).toHaveAttribute("aria-expanded", "false")
        expect(screen.queryByRole("link", { name: "Logga det här passet" })).not.toBeInTheDocument()

        await user.click(rows[1])
        expect(rows[1]).toHaveAttribute("aria-expanded", "true")
        expect(screen.getByText("Maxförsök på 40°")).toBeInTheDocument()
        expect(screen.getByText("Den här veckan:")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Logga det här passet" })).toHaveAttribute("href", "/sessions/new?plan=moon")
    })

    it("links an expanded done item to the session that crossed it off", async () => {
        const user = userEvent.setup()
        renderPage()
        const rows = await screen.findAllByRole("button", { name: /Moonboard/ })
        await user.click(rows[0])
        expect(screen.getByRole("link", { name: "Visa passet" })).toHaveAttribute("href", "/sessions/s1/edit")
    })

    it("lists the plan's weeks with their phases", async () => {
        renderPage()
        const weeks = await screen.findByRole("list", { name: "Planens veckor" })
        expect(weeks).toHaveTextContent("Återhämtning")
        expect(weeks).toHaveTextContent("1 av 2")
    })

    it("expands a week to the sessions in it, without archived ones", async () => {
        vi.mocked(fetchTrainingPlan).mockResolvedValue({ ...plan, startDate: "2000-01-03" })
        const user = userEvent.setup()
        renderPage()
        const weeks = await screen.findByRole("list", { name: "Planens veckor" })
        const [week1, week2] = within(weeks).getAllByRole("button")
        expect(week1).toHaveAttribute("aria-expanded", "false")

        await user.click(week1)
        expect(weeks).toHaveTextContent("Maxhäng")
        expect(weeks).toHaveTextContent("Mål: minst 2 av 3")
        expect(weeks).toHaveTextContent("Moonboard1 av 2")
        expect(weeks).not.toHaveTextContent("Maxförsök på 40°")

        await user.click(week2)
        expect(weeks).not.toHaveTextContent("Gammalt pass")
    })

    it("opens week 1 before the plan has started", async () => {
        vi.mocked(fetchTrainingPlan).mockResolvedValue({ ...plan, startDate: "2999-01-04" })
        vi.mocked(fetchCurrentPlanWeek).mockResolvedValue(null)
        renderPage()
        const weeks = await screen.findByRole("list", { name: "Planens veckor" })
        const [week1, week2] = within(weeks).getAllByRole("button")
        expect(week1).toHaveAttribute("aria-expanded", "true")
        expect(week2).toHaveAttribute("aria-expanded", "false")
        expect(weeks).toHaveTextContent("Moonboard×2")
    })

    it("lists the plan's sessions with their weeks, archived ones last", async () => {
        const user = userEvent.setup()
        renderPage()
        const list = await screen.findByRole("list", { name: "Planens pass" })
        const rows = within(list).getAllByRole("button")
        expect(rows.map((r) => r.textContent)).toEqual([
            "MoonboardStyrkav. 1–2",
            "LöpningUthållighetv. 1",
            "Gammalt passÖvrigtArkiverat",
        ])
        await user.click(rows[0])
        expect(within(list).getByRole("link", { name: "Redigera" })).toHaveAttribute("href", "/plan/sessions/t1")
        expect(screen.getByRole("link", { name: "Nytt pass" })).toHaveAttribute("href", "/plan/sessions/new")
    })

    it("links this week to its editor", async () => {
        renderPage()
        expect(await screen.findByRole("link", { name: "Ändra veckan" })).toHaveAttribute("href", "/plan/weeks/1")
    })

    it("says so when there is no active plan", async () => {
        vi.mocked(fetchTrainingPlan).mockResolvedValue(null)
        vi.mocked(fetchCurrentPlanWeek).mockResolvedValue(null)
        renderPage()
        expect(await screen.findByText(/Ingen aktiv träningsplan/)).toBeInTheDocument()
    })
})
