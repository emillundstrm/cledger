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
                submitLabel="Logga pass"
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
        expect(screen.getByText("Datum")).toBeInTheDocument()
        expect(screen.getByText("Typ av pass")).toBeInTheDocument()
        expect(screen.getByText("Intensitet (RPE)")).toBeInTheDocument()
        expect(screen.getByText("Prestation")).toBeInTheDocument()
    })

    it("renders all session type toggle buttons", () => {
        renderForm()
        expect(screen.getByText("Boulder")).toBeInTheDocument()
        expect(screen.getByText("Leder")).toBeInTheDocument()
        expect(screen.getByText("Board")).toBeInTheDocument()
        expect(screen.getByText("Fingerbräda")).toBeInTheDocument()
        expect(screen.getByText("Styrka")).toBeInTheDocument()
        expect(screen.getByText("Prehab")).toBeInTheDocument()
    })

    it("renders intensity RPE slider", () => {
        renderForm()
        expect(screen.getByLabelText("Intensitet RPE")).toBeInTheDocument()
    })

    it("renders performance radio options", () => {
        renderForm()
        expect(screen.getByLabelText("Svag")).toBeInTheDocument()
        expect(screen.getByLabelText("Stark")).toBeInTheDocument()
    })

    it("renders optional fields", () => {
        renderForm()
        expect(screen.getByLabelText("Längd (min)")).toBeInTheDocument()
        expect(screen.getByLabelText("Maxgrad")).toBeInTheDocument()
        expect(screen.getByLabelText("Anteckningar")).toBeInTheDocument()
    })

    it("renders venue field", () => {
        renderForm()
        expect(screen.getByLabelText("Plats")).toBeInTheDocument()
    })

    it("renders injuries section with add button", () => {
        renderForm()
        expect(screen.getByText("Skador")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Lägg till skada" })).toBeInTheDocument()
    })

    it("renders submit and cancel buttons", () => {
        renderForm()
        expect(screen.getByRole("button", { name: "Logga pass" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Avbryt" })).toBeInTheDocument()
    })

    it("disables submit when no session types selected", () => {
        renderForm()
        const submitButton = screen.getByRole("button", { name: "Logga pass" })
        expect(submitButton).toBeDisabled()
    })

    it("calls onCancel when cancel button is clicked", async () => {
        const user = userEvent.setup()
        renderForm()
        await user.click(screen.getByRole("button", { name: "Avbryt" }))
        expect(mockOnCancel).toHaveBeenCalledOnce()
    })

    it("submits form data when a type is selected and submit is clicked", async () => {
        const user = userEvent.setup()
        renderForm()

        // Select a session type
        await user.click(screen.getByText("Boulder"))

        // Submit
        await user.click(screen.getByRole("button", { name: "Logga pass" }))

        expect(mockOnSubmit).toHaveBeenCalledOnce()
        const submittedData = mockOnSubmit.mock.calls[0][0]
        expect(submittedData.types).toContain("boulder")
        expect(submittedData.intensity).toBe(5) // default RPE
        expect(submittedData.performance).toBe("normal") // default
        expect(submittedData.venue).toBeNull()
        expect(submittedData.injuries).toEqual([])
    })

    it("shows custom submit label", () => {
        renderForm({ submitLabel: "Spara" })
        expect(screen.getByRole("button", { name: "Spara" })).toBeInTheDocument()
    })

    it("shows 'Sparar…' when isSubmitting is true", () => {
        renderForm({ isSubmitting: true })
        expect(screen.getByRole("button", { name: "Sparar…" })).toBeInTheDocument()
    })

    it("pre-fills form with initialData including injuries", () => {
        renderForm({
            initialData: {
                date: "2026-01-28",
                types: ["boulder", "hangboard"],
                intensity: 9,
                performance: "strong",
                durationMinutes: 90,
                maxGrade: "7A",
                venue: "Beta Bloc",
                injuries: [{ location: "finger", note: "A2 pulley", severity: 3 }],
                notes: "Great session",
            },
        })

        expect(screen.getByLabelText("Längd (min)")).toHaveValue(90)
        expect(screen.getByLabelText("Maxgrad")).toHaveValue("7A")
        expect(screen.getByLabelText("Anteckningar")).toHaveValue("Great session")
        expect(screen.getByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.getByText("finger")).toBeInTheDocument()
        expect(screen.getByDisplayValue("A2 pulley")).toBeInTheDocument()
    })

    it("adds and removes injury entries", async () => {
        const user = userEvent.setup()
        renderForm()

        // Add an injury
        await user.click(screen.getByRole("button", { name: "Lägg till skada" }))
        expect(screen.getByLabelText("Skada 1 kroppsdel")).toBeInTheDocument()
        expect(screen.getByLabelText("Skada 1 anteckning")).toBeInTheDocument()

        // Add another
        await user.click(screen.getByRole("button", { name: "Lägg till skada" }))
        expect(screen.getByLabelText("Skada 2 kroppsdel")).toBeInTheDocument()

        // Remove first
        await user.click(screen.getByLabelText("Ta bort skada 1"))
        expect(screen.queryByLabelText("Skada 2 kroppsdel")).not.toBeInTheDocument()
        expect(screen.getByLabelText("Skada 1 kroppsdel")).toBeInTheDocument()
    })

    it("shows venue suggestions from API", async () => {
        mockFetchVenues.mockResolvedValue(["Beta Bloc", "Climbing Factory"])
        const user = userEvent.setup()
        renderForm()

        // Open the venue combobox
        await user.click(screen.getByLabelText("Plats"))

        // Wait for venues to load and display
        expect(await screen.findByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.getByText("Climbing Factory")).toBeInTheDocument()
    })

    it("selects a venue from suggestions", async () => {
        mockFetchVenues.mockResolvedValue(["Beta Bloc", "Climbing Factory"])
        const user = userEvent.setup()
        renderForm()

        // Open venue combobox
        await user.click(screen.getByLabelText("Plats"))

        // Wait for and select a venue
        const venueOption = await screen.findByText("Beta Bloc")
        await user.click(venueOption)

        // Select a type to enable submit
        await user.click(screen.getByText("Boulder"))

        // Submit and check venue is included
        await user.click(screen.getByRole("button", { name: "Logga pass" }))

        const data = mockOnSubmit.mock.calls[0][0]
        expect(data.venue).toBe("Beta Bloc")
    })

    it("renders severity dropdown for each injury entry", async () => {
        const user = userEvent.setup()
        renderForm()

        await user.click(screen.getByRole("button", { name: "Lägg till skada" }))
        expect(screen.getByLabelText("Skada 1 allvarlighetsgrad")).toBeInTheDocument()
    })

    it("pre-fills severity from initialData", () => {
        renderForm({
            initialData: {
                date: "2026-01-28",
                types: ["boulder"],
                intensity: 5,
                performance: "normal",
                durationMinutes: null,
                maxGrade: null,
                venue: null,
                injuries: [{ location: "finger", note: null, severity: 3 }],
                notes: null,
            },
        })

        // Severity select trigger should show "3 - Måttlig"
        const severityTrigger = screen.getByLabelText("Skada 1 allvarlighetsgrad")
        expect(severityTrigger).toHaveTextContent("3 - Måttlig")
    })

    it("submits severity as null when not selected", async () => {
        const user = userEvent.setup()
        renderForm()

        // Add injury and set location
        await user.click(screen.getByRole("button", { name: "Lägg till skada" }))

        // Open location combobox and type a location
        await user.click(screen.getByLabelText("Skada 1 kroppsdel"))
        const searchInput = screen.getByPlaceholderText("Sök kroppsdelar…")
        await user.type(searchInput, "elbow")
        await user.click(screen.getByText("Använd ”elbow”"))

        // Select a type to enable submit
        await user.click(screen.getByText("Boulder"))

        // Submit without selecting severity
        await user.click(screen.getByRole("button", { name: "Logga pass" }))

        const data = mockOnSubmit.mock.calls[0][0]
        expect(data.injuries[0].severity).toBeNull()
    })

    it("opens the venue list when typing on the trigger", async () => {
        const user = userEvent.setup()
        mockFetchVenues.mockResolvedValue(["Beta Bloc", "Klätterverket"])
        renderForm()

        screen.getByRole("combobox", { name: "Plats" }).focus()
        await user.keyboard("b")

        const searchInput = await screen.findByPlaceholderText("Sök platser…")
        expect(searchInput).toHaveValue("b")
        expect(searchInput).toHaveFocus()
        await user.keyboard("eta")
        expect(searchInput).toHaveValue("beta")
        expect(await screen.findByText("Beta Bloc")).toBeInTheDocument()
        expect(screen.queryByText("Klätterverket")).not.toBeInTheDocument()
    })

    it("selects a new venue with arrow keys and Enter", async () => {
        const user = userEvent.setup()
        mockFetchVenues.mockResolvedValue(["Beta Bloc"])
        renderForm()

        screen.getByRole("combobox", { name: "Plats" }).focus()
        await user.keyboard("Bet")
        await screen.findByText("Beta Bloc")
        await user.keyboard("{ArrowDown}{Enter}")

        expect(screen.getByRole("combobox", { name: "Plats" })).toHaveTextContent("Bet")
        await user.click(screen.getByText("Boulder"))
        await user.click(screen.getByRole("button", { name: "Logga pass" }))
        expect(mockOnSubmit.mock.calls[0][0].venue).toBe("Bet")
    })

    it("selects a new venue with Enter when nothing matches", async () => {
        const user = userEvent.setup()
        renderForm()

        screen.getByRole("combobox", { name: "Plats" }).focus()
        await user.keyboard("Crag{Enter}")

        expect(screen.getByRole("combobox", { name: "Plats" })).toHaveTextContent("Crag")
    })
})
