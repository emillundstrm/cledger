import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import SessionForm from "@/components/SessionForm"

vi.mock("@/api/sessions", () => ({
    fetchVenues: vi.fn(),
    fetchInjuryLocations: vi.fn(),
}))

import { fetchVenues, fetchInjuryLocations } from "@/api/sessions"

const mockFetchVenues = vi.mocked(fetchVenues)
const mockFetchInjuryLocations = vi.mocked(fetchInjuryLocations)

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    })
}

function renderForm(props: Partial<React.ComponentProps<typeof SessionForm>> = {}) {
    const queryClient = createQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            <SessionForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
                submitLabel="Log Session"
                {...props}
            />
        </QueryClientProvider>
    )
}

beforeEach(() => {
    vi.resetAllMocks()
    mockFetchVenues.mockResolvedValue([])
    mockFetchInjuryLocations.mockResolvedValue([])
})

describe("SessionForm", () => {
    it("renders all required form fields", () => {
        renderForm()
        expect(screen.getByText("Date")).toBeInTheDocument()
        expect(screen.getByText("Session Types")).toBeInTheDocument()
        expect(screen.getByText("Intensity")).toBeInTheDocument()
        expect(screen.getByText("Performance")).toBeInTheDocument()
        expect(screen.getByText("Productivity")).toBeInTheDocument()
    })

    it("renders all session type toggle buttons", () => {
        renderForm()
        expect(screen.getByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Routes")).toBeInTheDocument()
        expect(screen.getByText("Board")).toBeInTheDocument()
        expect(screen.getByText("Hangboard")).toBeInTheDocument()
        expect(screen.getByText("Strength")).toBeInTheDocument()
        expect(screen.getByText("Prehab")).toBeInTheDocument()
    })

    it("renders intensity radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Easy")).toBeInTheDocument()
        expect(screen.getByLabelText("Moderate")).toBeInTheDocument()
        expect(screen.getByLabelText("Hard")).toBeInTheDocument()
    })

    it("renders performance radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Weak")).toBeInTheDocument()
        expect(screen.getByLabelText("Strong")).toBeInTheDocument()
    })

    it("renders productivity radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Low")).toBeInTheDocument()
        expect(screen.getByLabelText("High")).toBeInTheDocument()
    })

    it("renders optional fields", () => {
        renderForm()
        expect(screen.getByLabelText("Duration (min)")).toBeInTheDocument()
        expect(screen.getByLabelText("Max Grade")).toBeInTheDocument()
        expect(screen.getByLabelText("Hard Attempts")).toBeInTheDocument()
        expect(screen.getByLabelText("Notes")).toBeInTheDocument()
    })

    it("renders venue field", () => {
        renderForm()
        expect(screen.getByLabelText("Venue")).toBeInTheDocument()
    })

    it("renders injuries section with add button", () => {
        renderForm()
        expect(screen.getByText("Injuries")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Add Injury" })).toBeInTheDocument()
    })

    it("renders submit and cancel buttons", () => {
        renderForm()
        expect(screen.getByRole("button", { name: "Log Session" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    })

    it("disables submit when no session types selected", () => {
        renderForm()
        const submitButton = screen.getByRole("button", { name: "Log Session" })
        expect(submitButton).toBeDisabled()
    })

    it("calls onCancel when cancel button is clicked", async () => {
        const user = userEvent.setup()
        renderForm()
        await user.click(screen.getByRole("button", { name: "Cancel" }))
        expect(mockOnCancel).toHaveBeenCalledOnce()
    })

    it("submits form data when a type is selected and submit is clicked", async () => {
        const user = userEvent.setup()
        renderForm()

        // Select a session type
        await user.click(screen.getByText("Boulder"))

        // Submit
        await user.click(screen.getByRole("button", { name: "Log Session" }))

        expect(mockOnSubmit).toHaveBeenCalledOnce()
        const submittedData = mockOnSubmit.mock.calls[0][0]
        expect(submittedData.types).toContain("boulder")
        expect(submittedData.intensity).toBe("moderate") // default
        expect(submittedData.performance).toBe("normal") // default
        expect(submittedData.productivity).toBe("normal") // default
        expect(submittedData.venue).toBeNull()
        expect(submittedData.injuries).toEqual([])
    })

    it("shows custom submit label", () => {
        renderForm({ submitLabel: "Save Changes" })
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument()
    })

    it("shows 'Saving...' when isSubmitting is true", () => {
        renderForm({ isSubmitting: true })
        expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument()
    })

    it("pre-fills form with initialData including injuries", () => {
        renderForm({
            initialData: {
                date: "2026-01-28",
                types: ["boulder", "hangboard"],
                intensity: "hard",
                performance: "strong",
                productivity: "high",
                durationMinutes: 90,
                maxGrade: "7A",
                hardAttempts: 5,
                venue: "Beta Bloc",
                injuries: [{ location: "finger", note: "A2 pulley" }],
                notes: "Great session",
            },
        })

        expect(screen.getByLabelText("Duration (min)")).toHaveValue(90)
        expect(screen.getByLabelText("Max Grade")).toHaveValue("7A")
        expect(screen.getByLabelText("Hard Attempts")).toHaveValue(5)
        expect(screen.getByLabelText("Notes")).toHaveValue("Great session")
        expect(screen.getByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.getByText("finger")).toBeInTheDocument()
        expect(screen.getByDisplayValue("A2 pulley")).toBeInTheDocument()
    })

    it("adds and removes injury entries", async () => {
        const user = userEvent.setup()
        renderForm()

        // Add an injury
        await user.click(screen.getByRole("button", { name: "Add Injury" }))
        expect(screen.getByLabelText("Injury 1 location")).toBeInTheDocument()
        expect(screen.getByLabelText("Injury 1 note")).toBeInTheDocument()

        // Add another
        await user.click(screen.getByRole("button", { name: "Add Injury" }))
        expect(screen.getByLabelText("Injury 2 location")).toBeInTheDocument()

        // Remove first
        await user.click(screen.getByLabelText("Remove injury 1"))
        expect(screen.queryByLabelText("Injury 2 location")).not.toBeInTheDocument()
        expect(screen.getByLabelText("Injury 1 location")).toBeInTheDocument()
    })

    it("shows venue suggestions from API", async () => {
        mockFetchVenues.mockResolvedValue(["Beta Bloc", "Climbing Factory"])
        const user = userEvent.setup()
        renderForm()

        // Open the venue combobox
        await user.click(screen.getByLabelText("Venue"))

        // Wait for venues to load and display
        expect(await screen.findByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.getByText("Climbing Factory")).toBeInTheDocument()
    })

    it("selects a venue from suggestions", async () => {
        mockFetchVenues.mockResolvedValue(["Beta Bloc", "Climbing Factory"])
        const user = userEvent.setup()
        renderForm()

        // Open venue combobox
        await user.click(screen.getByLabelText("Venue"))

        // Wait for and select a venue
        const venueOption = await screen.findByText("Beta Bloc")
        await user.click(venueOption)

        // Select a type to enable submit
        await user.click(screen.getByText("Boulder"))

        // Submit and check venue is included
        await user.click(screen.getByRole("button", { name: "Log Session" }))

        const data = mockOnSubmit.mock.calls[0][0]
        expect(data.venue).toBe("Beta Bloc")
    })
})
