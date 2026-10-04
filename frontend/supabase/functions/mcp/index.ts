import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createMcpHandler } from "@modelcontextprotocol/server";
import { pipeline } from "@supabase/middleware";
import { withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { CledgerApi } from "./api.ts";
import { createServer } from "./server.ts";

// Remote MCP server for claude.ai connectors and Claude Code. Clients sign in through Supabase
// Auth's OAuth 2.1 server (consent page: frontend/src/pages/OAuthConsentPage.tsx). Requests
// without a valid token get a 401 pointing at the protected resource metadata, which starts that
// flow. The Supabase client carries the user's token, so RLS applies as in the app.
Deno.serve(
    pipeline(
        [withOAuthProtectedResource(), withSupabase({ auth: "user" })],
        (req, { supabase, userClaims }) => {
            if (!userClaims) {
                return Promise.resolve(new Response("Unauthorized", { status: 401 }));
            }
            const api = new CledgerApi(supabase, userClaims.id);
            return createMcpHandler(() => createServer(api)).fetch(req);
        }
    )
);
