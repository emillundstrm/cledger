import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import FingerboardPage from "./FingerboardPage"
import type { FingerboardMax, FingerboardWorkout } from "@/api/types"

vi.mock("@/api/fingerboard")

import { fetchFingerboardMaxes, fetchFingerboardWorkouts } from "@/api/fingerboard"

const mockFetchMaxes = vi.mocked(fetchFingerboardMaxes)
const mockFetchWorkouts = vi.mocked(fetchFingerboardWorkouts)

function daysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function workoutWith(
    entries: { id: string; load: number; completed: boolean }[]
): FingerboardWorkout {
    return {
        id: "w-max",
        sessionId: null,
        protocol: "max_lift",
        performedAt: daysAgo(1),
        bodyweightKg: null,
        params: {
            prepareSeconds: 10,
            workSeconds: 5,
            repRestSeconds: 0,
            repsPerSet: 1,
            sets: entries.length,
            setRestSeconds: 180,
            handSwitchSeconds: 10,
        },
        durationSeconds: 600,
        completed: true,
        notes: null,
        sets: entries.map((entry, index) => ({
            id: entry.id,
            setIndex: index + 1,
            grip: "half_crimp" as const,
            edgeMm: 20,
            hand: "left" as const,
            mode: "pickup" as const,
            addedKg: null,
            liftedKg: entry.load,
            totalLoadKg: entry.load,
            workSeconds: 5,
            completed: entry.completed,
            rpe: null,
            peakForceKg: null,
        })),
    }
}

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/fingerboard"]}>
                <FingerboardPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("FingerboardPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchMaxes.mockResolvedValue([])
        mockFetchWorkouts.mockResolvedValue([])
    })

    it("offers both protocols", async () => {
        renderPage()

        expect(await screen.findByText("Max Lift")).toBeInTheDocument()
        expect(screen.getByText("Repeaters")).toBeInTheDocument()
    })

    it("links each protocol to its workout route", async () => {
        renderPage()

        const link = await screen.findByRole("link", { name: /Max Lift/ })
        expect(link).toHaveAttribute("href", "/fingerboard/max_lift")
    })

    it("explains the value of calibrating when there are no maxima yet", async () => {
        renderPage()

        expect(await screen.findByText(/No maxima yet/)).toBeInTheDocument()
    })

    it("shows measured maxima with their load", async () => {
        const maxes: FingerboardMax[] = [
            { grip: "half_crimp", edgeMm: 20, hand: "both", maxLoadKg: 60, testedAt: daysAgo(5) },
        ]
        mockFetchMaxes.mockResolvedValue(maxes)

        renderPage()

        expect(await screen.findByText("60kg")).toBeInTheDocument()
        expect(screen.getByText("Half crimp")).toBeInTheDocument()
        expect(screen.getByText("20mm")).toBeInTheDocument()
    })

    it("marks a max older than 90 days as stale", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "open", edgeMm: 20, hand: "both", maxLoadKg: 55, testedAt: daysAgo(120) },
        ])

        renderPage()

        expect(await screen.findByText("stale")).toBeInTheDocument()
    })

    it("does not mark a recent max as stale", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "open", edgeMm: 20, hand: "both", maxLoadKg: 55, testedAt: daysAgo(10) },
        ])

        renderPage()

        await screen.findByText("55kg")
        expect(screen.queryByText("stale")).not.toBeInTheDocument()
    })

    it("surfaces left/right asymmetry", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "half_crimp", edgeMm: 20, hand: "left", maxLoadKg: 40, testedAt: daysAgo(5) },
            { grip: "half_crimp", edgeMm: 20, hand: "right", maxLoadKg: 50, testedAt: daysAgo(5) },
        ])

        renderPage()

        expect(await screen.findByText(/20% asymmetry|20%/)).toBeInTheDocument()
        expect(screen.getByText(/40kg left vs 50kg right/)).toBeInTheDocument()
    })

    it("lists recent workouts with their top load", async () => {
        const workouts: FingerboardWorkout[] = [
            {
                id: "w1",
                sessionId: "s1",
                protocol: "repeaters",
                performedAt: daysAgo(2),
                bodyweightKg: 72,
                params: {
                    prepareSeconds: 10,
                    workSeconds: 7,
                    repRestSeconds: 3,
                    repsPerSet: 6,
                    sets: 2,
                    setRestSeconds: 180,
                    handSwitchSeconds: 10,
                },
                durationSeconds: 900,
                completed: true,
                notes: null,
                sets: [
                    {
                        id: "set1",
                        setIndex: 1,
                        grip: "half_crimp",
                        edgeMm: 20,
                        hand: "both",
                        mode: "hang",
                        addedKg: 8,
                        liftedKg: null,
                        totalLoadKg: 80,
                        workSeconds: 7,
                        completed: true,
                        rpe: 7,
                        peakForceKg: null,
                    },
                ],
            },
        ]
        mockFetchWorkouts.mockResolvedValue(workouts)

        renderPage()

        await waitFor(() => {
            expect(screen.getByText(/1\/1 held · best 80kg/)).toBeInTheDocument()
        })
    })

    it("reports the best held load, not a heavier missed attempt", async () => {
        mockFetchWorkouts.mockResolvedValue([
            workoutWith([
                { id: "s1", load: 30, completed: true },
                { id: "s2", load: 32.5, completed: false },
            ]),
        ])

        renderPage()

        await waitFor(() => {
            expect(screen.getByText(/1\/2 held · best 30kg/)).toBeInTheDocument()
        })
        expect(screen.queryByText(/best 32.5kg/)).not.toBeInTheDocument()
    })

    it("expands a workout to show every individual set", async () => {
        mockFetchWorkouts.mockResolvedValue([
            workoutWith([
                { id: "s1", load: 30, completed: true },
                { id: "s2", load: 32.5, completed: false },
            ]),
        ])

        renderPage()

        const row = await screen.findByRole("button", { name: /Max Lift/ })
        await userEvent.click(row)

        expect(screen.getByText("30kg")).toBeInTheDocument()
        expect(screen.getByText("32.5kg")).toBeInTheDocument()
        expect(screen.getByText("Held")).toBeInTheDocument()
        expect(screen.getByText("Missed")).toBeInTheDocument()
    })
})
