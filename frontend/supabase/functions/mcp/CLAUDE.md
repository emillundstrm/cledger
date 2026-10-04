# MCP Server — Agent Instructions

Remote MCP server on Supabase Edge Functions (Deno). Clients connect to
`https://<project-ref>.supabase.co/functions/v1/mcp` and sign in with OAuth.

## Stack

- Deno on the Supabase Edge Runtime; npm packages through the import map in `deno.json`
- `@modelcontextprotocol/server` v2: `createMcpHandler` serves Streamable HTTP statelessly, one
  fresh `McpServer` per request
- `@supabase/server`: `withOAuthProtectedResource()` answers unauthenticated requests with the
  OAuth discovery challenge, `withSupabase({ auth: "user" })` verifies the access token against
  the project JWKS and hands over a client carrying it
- Relative imports use the `.ts` extension

## Files

- `index.ts` — entry point: auth middleware, then `createServer`
- `server.ts` — `INSTRUCTIONS` and every tool (`registerTool`)
- `api.ts` — `CledgerApi`, data access through the user's client; RLS scopes every query
- `types.ts`, `links.ts`, `checklist.ts` — mirrors of the frontend (see Patterns)

## Auth

- Supabase Auth's OAuth 2.1 server with dynamic client registration (`[auth.oauth_server]` in
  `config.toml`); `verify_jwt = false` for this function because it checks tokens itself
- Auth sends the user to the app's `/oauth/consent` page (`frontend/src/pages/OAuthConsentPage.tsx`),
  built from `site_url` + `authorization_url_path`, so `site_url` includes the `/cledger` base path
- Token verification needs asymmetric JWT signing keys (ES256), which the project uses

## Patterns

- Types in `types.ts` mirror the frontend pattern: database row types + `mapSessionRow`/`mapInjuryRow`/`mapNoteRow`/`mapJournalEntryRow` for snake_case to camelCase
- Analytics uses the same RPC functions as the frontend via `Promise.all`
- Injury update: delete all existing + re-insert (same pattern as frontend)
- Server `instructions` (in `server.ts`) tell the assistant where to record what; update them when adding tools
- Read-only tools get `annotations: { readOnlyHint: true }`
- MCP tools can archive notes and journal entries but never delete them; deletion is UI-only
- Dates the assistant omits default to the user's local date (`localDate()` in `server.ts`). The
  server runs in UTC, so it uses `CLEDGER_TIME_ZONE` (default `Europe/Stockholm`)
- `links.ts` and `checklist.ts` mirror `frontend/src/lib/links.ts` and `checklist.ts`; keep them in sync

## Commands

Run from `frontend/`:

```sh
npx supabase functions serve mcp    # local, at http://127.0.0.1:54321/functions/v1/mcp
npx supabase functions deploy mcp   # hosted project
```
