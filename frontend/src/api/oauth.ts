import type { OAuthAuthorizationDetails } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

// Consent for MCP clients (claude.ai connectors, Claude Code) signing in through Supabase Auth's
// OAuth 2.1 server. Auth sends the user to /oauth/consent?authorization_id=… to approve or deny.

export type AuthorizationRequest =
    | { kind: "consent"; details: OAuthAuthorizationDetails }
    | { kind: "redirect"; redirectUrl: string }

/** The pending request, or a redirect straight back to the client if the user already approved it. */
export async function fetchAuthorizationRequest(authorizationId: string): Promise<AuthorizationRequest> {
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

    if (error) {
        throw new Error(error.message)
    }

    if ("authorization_id" in data) {
        return { kind: "consent", details: data }
    }
    return { kind: "redirect", redirectUrl: data.redirect_url }
}

/** Approves or denies the request. Returns the client URL to send the user back to. */
export async function decideAuthorization(authorizationId: string, approve: boolean): Promise<string> {
    const { data, error } = approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId)

    if (error) {
        throw new Error(error.message)
    }

    return data.redirect_url
}
