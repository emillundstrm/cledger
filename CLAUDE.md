# CLedger — Agent Instructions

Read ARCHITECTURE.md for the high-level design and tech stack.

## Project Structure

- `frontend/` — React + TypeScript + ShadCN UI app (Vite)
- `frontend/supabase/` — Supabase config and SQL migrations
- `mcp-server/` — Node.js MCP server for LLM coaching access
- `tasks/` — PRD files for feature planning

## Environment Setup

- Node 20 via nvm: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20`
- npm is NOT on PATH without loading nvm first
- Local Supabase: API at :54321, DB at :54322, Studio at :54323

## Commands

All frontend commands run from `frontend/`:

```sh
npm run dev          # dev server
npm run build        # production build (also copies 404.html for SPA routing)
npx tsc -b           # typecheck
npx eslint src/      # lint
npx vitest run       # tests
```

Supabase CLI must also run from `frontend/` (where `supabase/` config lives):

```sh
npx supabase start   # start local instance
npx supabase db reset # apply migrations from scratch
```

## Cross-Cutting Rules

- When adding a new analytics RPC function, update 3 places: `frontend/src/api/analytics.ts` + `types.ts`, `mcp-server/src/api.ts` + `types.ts`
- All Supabase tables need `user_id UUID` referencing `auth.users(id)` for RLS
- RLS policies use `auth.uid() = user_id`; UPDATE needs both USING and WITH CHECK
- Supabase migrations use `YYYYMMDDHHMMSS` timestamp prefix naming
- RPC functions use SECURITY INVOKER so `auth.uid()` resolves to the calling user

## Code Style

- Four spaces for indentation
- Never skip curly braces, even for guard clauses
- TypeScript everywhere, no `any` unless unavoidable
