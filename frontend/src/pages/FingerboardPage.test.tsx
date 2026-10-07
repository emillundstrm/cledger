import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import FingerboardPage from "./FingerboardPage"
import type { FingerboardMax, FingerboardWorkout } from "@/api/types"

vi.mock("@/api/fingerboard")

import {
    deleteFingerboardWorkout,
    fetchFingerboardMaxes,
    fetchFingerboardWorkouts,
} from "@/api/fingerboard"

const mockFetchMaxes = vi.mocked(fetchFingerboardMaxes)
const mockFetchWorkouts = vi.mocked(fetchFingerboardWorkouts)
const mockDeleteWorkout = vi.mocked(deleteFingerboardWorkout)

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
        mockDeleteWorkout.mockResolvedValue(undefined)
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

        expect(await screen.findByText(/Inga maxvärden än/)).toBeInTheDocument()
    })

    it("shows measured maxima with their load", async () => {
        const maxes: FingerboardMax[] = [
            { grip: "half_crimp", edgeMm: 20, hand: "both", maxLoadKg: 60, testedAt: daysAgo(5) },
        ]
        mockFetchMaxes.mockResolvedValue(maxes)

        renderPage()

        expect(await screen.findByText("60 kg")).toBeInTheDocument()
        expect(screen.getByText("Halvcrimp")).toBeInTheDocument()
        expect(screen.getByText("20 mm")).toBeInTheDocument()
    })

    it("marks a max older than 90 days as stale", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "open", edgeMm: 20, hand: "both", maxLoadKg: 55, testedAt: daysAgo(120) },
        ])

        renderPage()

        expect(await screen.findByText("gammalt")).toBeInTheDocument()
    })

    it("does not mark a recent max as stale", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "open", edgeMm: 20, hand: "both", maxLoadKg: 55, testedAt: daysAgo(10) },
        ])

        renderPage()

        await screen.findByText("55 kg")
        expect(screen.queryByText("gammalt")).not.toBeInTheDocument()
    })

    it("surfaces left/right asymmetry", async () => {
        mockFetchMaxes.mockResolvedValue([
            { grip: "half_crimp", edgeMm: 20, hand: "left", maxLoadKg: 40, testedAt: daysAgo(5) },
            { grip: "half_crimp", edgeMm: 20, hand: "right", maxLoadKg: 50, testedAt: daysAgo(5) },
        ])

        renderPage()

        expect(await screen.findByText(/20 %/)).toBeInTheDocument()
        expect(screen.getByText(/40 kg vänster mot 50 kg höger/)).toBeInTheDocument()
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
            expect(screen.getByText(/1\/1 klarade · bäst 80 kg/)).toBeInTheDocument()
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
            expect(screen.getByText(/1\/2 klarade · bäst 30 kg/)).toBeInTheDocument()
        })
        expect(screen.queryByText(/bäst 32,5 kg/)).not.toBeInTheDocument()
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

        expect(screen.getByText("30 kg")).toBeInTheDocument()
        expect(screen.getByText("32,5 kg")).toBeInTheDocument()
        expect(screen.getByText("Klarade")).toBeInTheDocument()
        expect(screen.getByText("Missade")).toBeInTheDocument()
    })
})

describe("FingerboardPage loading and errors", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchMaxes.mockResolvedValue([])
        mockFetchWorkouts.mockResolvedValue([])
    })

    it("shows loading instead of the empty copy while workouts load", () => {
        mockFetchWorkouts.mockReturnValue(new Promise(() => {}))

        renderPage()

        expect(screen.getByText("Laddar pass…")).toBeInTheDocument()
        expect(screen.queryByText("Inget loggat än.")).not.toBeInTheDocument()
    })

    it("retries workouts that failed to load", async () => {
        mockFetchWorkouts.mockRejectedValueOnce(new Error("nope"))
        mockFetchWorkouts.mockResolvedValue([workoutWith([{ id: "s1", load: 30, completed: true }])])

        renderPage()

        expect(await screen.findByText("Kunde inte hämta passen.")).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "Försök igen" }))

        expect(await screen.findByText(/1\/1 klarade · bäst 30 kg/)).toBeInTheDocument()
    })

    it("retries maxima that failed to load", async () => {
        mockFetchMaxes.mockRejectedValueOnce(new Error("nope"))

        renderPage()

        expect(await screen.findByText("Kunde inte hämta maxvärdena.")).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "Försök igen" }))

        expect(await screen.findByText(/Inga maxvärden än/)).toBeInTheDocument()
    })

    it("shows ten workouts at first and more on request", async () => {
        mockFetchWorkouts.mockResolvedValue(
            Array.from({ length: 12 }, (_, index) => ({
                ...workoutWith([{ id: `s${index}`, load: 30, completed: true }]),
                id: `w${index}`,
            }))
        )

        renderPage()

        expect(await screen.findAllByRole("button", { name: /Max Lift/ })).toHaveLength(10)
        await userEvent.click(screen.getByRole("button", { name: "Visa fler" }))

        expect(screen.getAllByRole("button", { name: /Max Lift/ })).toHaveLength(12)
        expect(screen.queryByRole("button", { name: "Visa fler" })).not.toBeInTheDocument()
    })
})

describe("FingerboardPage workout deletion", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mockFetchMaxes.mockResolvedValue([])
        mockDeleteWorkout.mockResolvedValue(undefined)
    })

    it("explains a workout with no sets rather than showing an empty table", async () => {
        // Exactly what a save that failed part way through used to leave behind.
        mockFetchWorkouts.mockResolvedValue([workoutWith([])])

        renderPage()
        await userEvent.click(await screen.findByRole("button", { name: /Max Lift/ }))

        expect(screen.getByText(/Inga set sparades/)).toBeInTheDocument()
    })

    it("deletes a workout once confirmed", async () => {
        mockFetchWorkouts.mockResolvedValue([workoutWith([{ id: "s1", load: 30, completed: true }])])

        renderPage()
        await userEvent.click(await screen.findByRole("button", { name: /Max Lift/ }))
        await userEvent.click(screen.getByRole("button", { name: /Ta bort passet/ }))
        await userEvent.click(screen.getByRole("button", { name: "Ta bort" }))

        await waitFor(() => {
            expect(mockDeleteWorkout).toHaveBeenCalled()
        })
        // React Query passes its own context as a second argument.
        expect(mockDeleteWorkout.mock.calls[0][0]).toBe("w-max")
    })

    it("does not delete when the confirmation is dismissed", async () => {
        mockFetchWorkouts.mockResolvedValue([workoutWith([{ id: "s1", load: 30, completed: true }])])

        renderPage()
        await userEvent.click(await screen.findByRole("button", { name: /Max Lift/ }))
        await userEvent.click(screen.getByRole("button", { name: /Ta bort passet/ }))
        await userEvent.click(screen.getByRole("button", { name: /Behåll det/ }))

        expect(mockDeleteWorkout).not.toHaveBeenCalled()
    })
})
