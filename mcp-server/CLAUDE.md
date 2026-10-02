# MCP Server — Agent Instructions

## Stack

- ESM project (`"type": "module"` in `package.json`), Node16 module resolution
- `@modelcontextprotocol/sdk` v1.25+ with bundled Zod 4
- `@supabase/supabase-js` for data access

## Key Imports

- `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js` (Claude Desktop compatibility)
- `z` from `zod` (bundled with SDK)

## Env Vars

`CLEDGER_SUPABASE_URL`, `CLEDGER_SUPABASE_ANON_KEY`, `CLEDGER_EMAIL`, `CLEDGER_PASSWORD`

## Patterns

- Types in `src/types.ts` mirror the frontend pattern: database row types + `mapSessionRow`/`mapInjuryRow`/`mapNoteRow` for snake_case to camelCase
- `CledgerApi` class in `src/api.ts` uses lazy auth — `ensureAuthenticated()` authenticates on first API call, not at construction
- Analytics uses the same RPC functions as the frontend via `Promise.all`
- Injury update: delete all existing + re-insert (same pattern as frontend)
- Server `instructions` (in `src/index.ts`) tell the assistant where to record what; update them when adding tools
- MCP tools can archive notes but never delete them; deletion is UI-only
- `src/links.ts` mirrors `frontend/src/lib/links.ts`; keep the two in sync
