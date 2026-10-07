import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import DashboardPage from "@/pages/DashboardPage"
import type { Analytics } from "@/api/types"

vi.mock("@/api/analytics", () => ({
    fetchAnalytics: vi.fn(),
}))

import { fetchAnalytics } from "@/api/analytics"

const mockFetchAnalytics = vi.mocked(fetchAnalytics)

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function renderDashboardPage() {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/dashboard"]}>
                <DashboardPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

const mockAnalytics: Analytics = {
    sessionsThisWeek: 3,
    hardSessionsLast7Days: 1,
    currentWeekTrainingLoad: 450,
    painFlagsLast30Days: [
        { location: "finger", count: 3, weightedCount: 7 },
        { location: "elbow", count: 1, weightedCount: 1 },
    ],
    sessionTypeVolume: [
        { weekStart: "2026-01-19", type: "boulder", sessionCount: 3, totalMinutes: 240 },
        { weekStart: "2026-01-19", type: "hangboard", sessionCount: 1, totalMinutes: 45 },
        { weekStart: "2026-01-26", type: "boulder", sessionCount: 2, totalMinutes: 150 },
        { weekStart: "2026-01-26", type: "routes", sessionCount: 1, totalMinutes: 90 },
    ],
    sessionPerformanceLog: [
        { date: "2026-01-20", performance: "strong" },
        { date: "2026-01-22", performance: "normal" },
        { date: "2026-01-27", performance: "weak" },
    ],
    weeklyTrainingLoad: [
        { weekStart: "2025-12-08", load: 180 },
        { weekStart: "2025-12-15", load: 360 },
        { weekStart: "2025-12-22", load: 90 },
        { weekStart: "2025-12-29", load: 270 },
        { weekStart: "2026-01-05", load: 540 },
        { weekStart: "2026-01-12", load: 180 },
        { weekStart: "2026-01-19", load: 360 },
        { weekStart: "2026-01-26", load: 450 },
    ],
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe("DashboardPage", () => {
    it("renders the Översikt heading", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(screen.getByRole("heading", { level: 1, name: "Översikt" })).toBeInTheDocument()
    })

    it("shows loading state initially", () => {
        mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
        renderDashboardPage()
        expect(screen.getByText("Laddar statistik…")).toBeInTheDocument()
    })

    it("shows error message when fetch fails", async () => {
        mockFetchAnalytics.mockRejectedValue(new Error("Network error"))
        renderDashboardPage()
        expect(
            await screen.findByText("Kunde inte ladda statistik.")
        ).toBeInTheDocument()
    })

    it("retries a failed fetch", async () => {
        const user = userEvent.setup()
        mockFetchAnalytics.mockRejectedValueOnce(new Error("Network error"))
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await user.click(await screen.findByRole("button", { name: "Försök igen" }))
        expect(await screen.findByText("Pass denna vecka")).toBeInTheDocument()
        expect(screen.queryByText("Kunde inte ladda statistik.")).not.toBeInTheDocument()
    })

    it("renders the time span selector defaulting to 8 veckor", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(screen.getByLabelText("Tidsperiod")).toHaveTextContent("8 veckor")
    })

    it("displays stat cards with correct values", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Pass denna vecka")).toBeInTheDocument()
        expect(screen.getByText("Hårda pass (7 dagar)")).toBeInTheDocument()
        expect(screen.getByText("Belastning (denna vecka)")).toBeInTheDocument()

        // Stat values appear in text-4xl divs
        const statValues = screen.getAllByText(/^\d+$/).filter(
            (el) => el.className.includes("text-4xl")
        )
        expect(statValues).toHaveLength(3)
        expect(statValues[0]).toHaveTextContent("3")
        expect(statValues[1]).toHaveTextContent("1")
        expect(statValues[2]).toHaveTextContent("450")
    })

    it("does not display Days Since Rest metric", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Pass denna vecka")
        expect(screen.queryByText(/sedan vila|Days Since Rest/i)).not.toBeInTheDocument()
    })

    it("does not display the removed Average RPE chart", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Pass denna vecka")
        expect(screen.queryByText(/RPE/)).not.toBeInTheDocument()
    })

    it("displays pain flags summary", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Skador (senaste 30 dagarna)")).toBeInTheDocument()
        expect(screen.getByText("Finger:")).toBeInTheDocument()
        expect(screen.getByText("Elbow:")).toBeInTheDocument()
    })

    it("displays severity-weighted counts when higher than raw count", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Skador (senaste 30 dagarna)")

        // Finger: count=3, weightedCount=7 → should show weighted
        expect(screen.getByTitle("Antal viktat efter allvarlighetsgrad")).toBeInTheDocument()
        expect(screen.getByText("(viktat: 7)")).toBeInTheDocument()
    })

    it("does not display weighted count when equal to raw count", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Skador (senaste 30 dagarna)")

        // Elbow: count=1, weightedCount=1 → no weighted display
        const elbowText = screen.getByText("Elbow:").parentElement!
        expect(elbowText.querySelector("[title='Antal viktat efter allvarlighetsgrad']")).toBeNull()
    })

    it("shows no pain flags message when empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            painFlagsLast30Days: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("Inga skador rapporterade.")
        ).toBeInTheDocument()
    })

    it("renders the activity & performance card with a volume metric toggle", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(
            await screen.findByText("Aktivitet och prestation")
        ).toBeInTheDocument()
        const metric = screen.getByRole("radiogroup", { name: "Mått för volym" })
        expect(metric).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Pass" })).toHaveAttribute("aria-checked", "true")
        expect(screen.getByRole("radio", { name: "Minuter" })).toHaveAttribute("aria-checked", "false")
    })

    it("switches the volume metric to minutes", async () => {
        const user = userEvent.setup()
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await user.click(await screen.findByRole("radio", { name: "Minuter" }))
        expect(screen.getByRole("radio", { name: "Minuter" })).toHaveAttribute("aria-checked", "true")
        expect(screen.getByRole("radio", { name: "Pass" })).toHaveAttribute("aria-checked", "false")
    })

    it("renders the per-session performance ribbon with a weak/normal/strong legend", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Aktivitet och prestation")
        expect(screen.getByText("Prestation")).toBeInTheDocument()
        expect(screen.getByText("Svag")).toBeInTheDocument()
        expect(screen.getByText("Normal")).toBeInTheDocument()
        expect(screen.getByText("Stark")).toBeInTheDocument()
    })

    it("shows an empty-ribbon message when there are no sessions in the period", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            sessionPerformanceLog: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("Inga pass under perioden.")
        ).toBeInTheDocument()
    })

    it("renders the training load chart", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Belastning")).toBeInTheDocument()
    })

    it("renders exactly two chart containers (combined + training load)", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Aktivitet och prestation")
        const chartContainers = document.querySelectorAll("[data-slot='chart']")
        expect(chartContainers.length).toBe(2)
    })

    it("shows increasing trend indicator when load increases", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 100 },
                { weekStart: "2026-01-26", load: 200 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Belastningen ökar")).toBeInTheDocument()
    })

    it("shows decreasing trend indicator when load decreases", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 200 },
                { weekStart: "2026-01-26", load: 100 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Belastningen minskar")).toBeInTheDocument()
    })

    it("shows stable trend indicator when load is similar", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklyTrainingLoad: [
                { weekStart: "2026-01-19", load: 200 },
                { weekStart: "2026-01-26", load: 210 },
            ],
        })
        renderDashboardPage()
        expect(await screen.findByTitle("Belastningen är stabil")).toBeInTheDocument()
    })
})
