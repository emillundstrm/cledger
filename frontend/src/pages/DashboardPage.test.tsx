import { render, screen } from "@testing-library/react"
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
    painFlagsLast30Days: [
        { location: "finger", count: 3 },
        { location: "elbow", count: 1 },
    ],
    weeklySessionCounts: [
        { weekStart: "2025-12-08", count: 2 },
        { weekStart: "2025-12-15", count: 4 },
        { weekStart: "2025-12-22", count: 1 },
        { weekStart: "2025-12-29", count: 3 },
        { weekStart: "2026-01-05", count: 5 },
        { weekStart: "2026-01-12", count: 2 },
        { weekStart: "2026-01-19", count: 4 },
        { weekStart: "2026-01-26", count: 3 },
    ],
    performanceTrend: [
        { weekStart: "2025-12-08", average: 1.5 },
        { weekStart: "2025-12-15", average: 2.0 },
        { weekStart: "2025-12-22", average: null },
        { weekStart: "2025-12-29", average: 2.5 },
        { weekStart: "2026-01-05", average: 3.0 },
        { weekStart: "2026-01-12", average: 1.0 },
        { weekStart: "2026-01-19", average: 2.0 },
        { weekStart: "2026-01-26", average: 2.3 },
    ],
    productivityTrend: [
        { weekStart: "2025-12-08", average: 2.0 },
        { weekStart: "2025-12-15", average: 2.5 },
        { weekStart: "2025-12-22", average: null },
        { weekStart: "2025-12-29", average: 1.5 },
        { weekStart: "2026-01-05", average: 2.0 },
        { weekStart: "2026-01-12", average: 3.0 },
        { weekStart: "2026-01-19", average: 2.0 },
        { weekStart: "2026-01-26", average: 1.7 },
    ],
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe("DashboardPage", () => {
    it("renders the Dashboard heading", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("shows loading state initially", () => {
        mockFetchAnalytics.mockReturnValue(new Promise(() => {}))
        renderDashboardPage()
        expect(screen.getByText("Loading analytics...")).toBeInTheDocument()
    })

    it("shows error message when fetch fails", async () => {
        mockFetchAnalytics.mockRejectedValue(new Error("Network error"))
        renderDashboardPage()
        expect(
            await screen.findByText("Failed to load analytics.")
        ).toBeInTheDocument()
    })

    it("displays stat cards with correct values", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Sessions This Week")).toBeInTheDocument()
        expect(screen.getByText("Hard Sessions (7 days)")).toBeInTheDocument()

        // Stat values appear in text-3xl divs
        const statValues = screen.getAllByText(/^\d+$/).filter(
            (el) => el.className.includes("text-3xl")
        )
        expect(statValues).toHaveLength(2)
        expect(statValues[0]).toHaveTextContent("3")
        expect(statValues[1]).toHaveTextContent("1")
    })

    it("does not display Days Since Rest metric", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        await screen.findByText("Sessions This Week")
        expect(screen.queryByText("Days Since Rest")).not.toBeInTheDocument()
    })

    it("displays pain flags summary", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Injuries (Last 30 Days)")).toBeInTheDocument()
        expect(screen.getByText("Finger:")).toBeInTheDocument()
        expect(screen.getByText("Elbow:")).toBeInTheDocument()
    })

    it("shows no pain flags message when empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            painFlagsLast30Days: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No injuries reported.")
        ).toBeInTheDocument()
    })

    it("renders weekly session counts chart container", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(await screen.findByText("Weekly Sessions (Last 8 Weeks)")).toBeInTheDocument()
        // Recharts chart container is rendered with data-slot="chart"
        const chartContainers = document.querySelectorAll("[data-slot='chart']")
        expect(chartContainers.length).toBeGreaterThanOrEqual(1)
    })

    it("shows no session data message when weekly counts empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            weeklySessionCounts: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No session data yet.")
        ).toBeInTheDocument()
    })

    it("renders performance trend chart container", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(
            await screen.findByText("Performance Trend (Last 8 Weeks)")
        ).toBeInTheDocument()
        // Verify chart containers are rendered (3 total: weekly sessions + performance + productivity)
        const chartContainers = document.querySelectorAll("[data-slot='chart']")
        expect(chartContainers.length).toBe(3)
    })

    it("renders productivity trend chart container", async () => {
        mockFetchAnalytics.mockResolvedValue(mockAnalytics)
        renderDashboardPage()
        expect(
            await screen.findByText("Productivity Trend (Last 8 Weeks)")
        ).toBeInTheDocument()
        const chartContainers = document.querySelectorAll("[data-slot='chart']")
        expect(chartContainers.length).toBe(3)
    })

    it("shows no trend data message when performance trend empty", async () => {
        mockFetchAnalytics.mockResolvedValue({
            ...mockAnalytics,
            performanceTrend: [],
        })
        renderDashboardPage()
        expect(
            await screen.findByText("No trend data yet.")
        ).toBeInTheDocument()
    })
})
