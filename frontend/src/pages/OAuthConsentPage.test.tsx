import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { OAuthAuthorizationDetails } from "@supabase/supabase-js"
import OAuthConsentPage from "@/pages/OAuthConsentPage"
import { decideAuthorization, fetchAuthorizationRequest } from "@/api/oauth"

vi.mock("@/api/oauth")

const assign = vi.fn()

const details: OAuthAuthorizationDetails = {
    authorization_id: "auth-1",
    redirect_uri: "https://claude.ai/api/mcp/auth_callback",
    client: { id: "client-1", name: "Claude", uri: "", logo_uri: "" },
    user: { id: "user-1", email: "me@example.com" },
    scope: "",
}

function renderPage(path = "/oauth/consent?authorization_id=auth-1") {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <OAuthConsentPage />
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe("OAuthConsentPage", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.stubGlobal("location", { ...window.location, assign })
        vi.mocked(fetchAuthorizationRequest).mockResolvedValue({ kind: "consent", details })
        vi.mocked(decideAuthorization).mockResolvedValue("https://claude.ai/api/mcp/auth_callback?code=xyz")
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("shows the client, the account and where it redirects", async () => {
        renderPage()

        expect(await screen.findByText("Claude")).toBeInTheDocument()
        expect(screen.getByText(/me@example\.com/)).toBeInTheDocument()
        expect(screen.getByText("claude.ai")).toBeInTheDocument()
        expect(fetchAuthorizationRequest).toHaveBeenCalledWith("auth-1")
    })

    it("approves and sends the user back to the client", async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(await screen.findByRole("button", { name: "Godkänn" }))

        expect(decideAuthorization).toHaveBeenCalledWith("auth-1", true)
        await waitFor(() => {
            expect(assign).toHaveBeenCalledWith("https://claude.ai/api/mcp/auth_callback?code=xyz")
        })
    })

    it("denies", async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(await screen.findByRole("button", { name: "Neka" }))

        expect(decideAuthorization).toHaveBeenCalledWith("auth-1", false)
    })

    it("redirects straight away when already approved", async () => {
        vi.mocked(fetchAuthorizationRequest).mockResolvedValue({
            kind: "redirect",
            redirectUrl: "https://claude.ai/api/mcp/auth_callback?code=abc",
        })
        renderPage()

        await waitFor(() => {
            expect(assign).toHaveBeenCalledWith("https://claude.ai/api/mcp/auth_callback?code=abc")
        })
        expect(screen.queryByRole("button", { name: "Godkänn" })).not.toBeInTheDocument()
    })

    it("shows an error for an unknown request", async () => {
        vi.mocked(fetchAuthorizationRequest).mockRejectedValue(new Error("authorization not found"))
        renderPage()

        expect(await screen.findByRole("alert")).toHaveTextContent("Kunde inte läsa förfrågan")
    })

    it("shows an error when the authorization ID is missing", () => {
        renderPage("/oauth/consent")

        expect(screen.getByRole("alert")).toHaveTextContent("Länken är ofullständig")
        expect(fetchAuthorizationRequest).not.toHaveBeenCalled()
    })
})
