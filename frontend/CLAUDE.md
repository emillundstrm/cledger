# Frontend — Agent Instructions

## Stack Details

- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- ShadCN v3 — theme via CSS variables in `src/index.css`
- React Router v7 — import from `react-router` (not `react-router-dom`)
- `@tanstack/react-query` for data fetching; `QueryClientProvider` wraps the app in `App.tsx`
- Import alias `@/` maps to `src/` via tsconfig paths and Vite resolve alias
- Dark mode: `class="dark"` on `<html>` in `index.html`, `@custom-variant dark` in CSS

## File Conventions

- Pages: `src/pages/` (e.g., `SessionsPage.tsx`, `DashboardPage.tsx`)
- Layout: `src/components/layout/` (`AppLayout.tsx`)
- Reusable components: `src/components/` (`SessionForm.tsx`)
- ShadCN UI primitives: `src/components/ui/` (auto-generated, lint rules relaxed)
- API layer: `src/api/types.ts` (types + mapping functions), `src/api/sessions.ts`, `analytics.ts`, `insights.ts`
- Auth: `src/auth/AuthContext.tsx` (AuthProvider + useAuth), `ProtectedRoute.tsx`
- Supabase client singleton: `src/lib/supabase.ts`

## Supabase API Layer

- Supabase returns snake_case — use `mapSessionRow`, `mapInjuryRow`, `mapInsightRow` from `types.ts` for camelCase conversion
- Database row types (`SessionRow`, `SessionInjuryRow`, `InsightRow`) in `types.ts` for type-safe queries
- For mutations, call `supabase.auth.getUser()` to get `user_id`
- Batch-load related data (e.g., injuries for sessions) using `.in()` to avoid N+1 queries
- Sessions `types` column is `TEXT[]` array (not a join table)
- `PostgREST` returns 200 with empty array when RLS filters out rows on SELECT (not 403)
- PostgreSQL `generate_series` with DATE needs `INTERVAL` step (e.g., `INTERVAL '7 days'`)

## Auth

- `AuthProvider` + `useAuth` wraps the app; `ProtectedRoute` redirects unauthenticated users to `/login`
- When adding `useAuth` to a component, ALL test files rendering that component must mock `@/auth/AuthContext`

## Testing

- Vitest + jsdom environment; config in `vitest.config.ts`
- Test setup in `src/test/setup.ts` (jest-dom matchers, ResizeObserver + scrollIntoView polyfills)
- Wrap components in `QueryClientProvider` (with `retry: false`) + `MemoryRouter` with `initialEntries`
- Mock API modules: `vi.mock("@/api/sessions")` + `vi.mocked()` for typed mocks
- `vi.resetAllMocks()` in `beforeEach` clears mock factories — re-set return values there
- When `SessionForm` gains a new `useQuery` hook, ALL test files rendering it need the corresponding mock
- Recharts doesn't render in jsdom — test chart containers via `data-slot="chart"` attribute
- ShadCN Select renders values in multiple DOM elements — use `getByLabelText` + `toHaveTextContent`
- ShadCN Tabs uses `aria-selected` (not `aria-pressed`)
- For duplicate text across charts, use `getAllByText` instead of `getByText`
- `@testing-library/user-event` for simulating clicks and typing

## Build & Deploy

- GitHub Pages: `base: '/cledger/'` in Vite + `basename="/cledger"` on `BrowserRouter`
- Build script copies `index.html` to `404.html` for SPA routing
- `tsconfig.app.json` excludes test files (`src/**/*.test.ts`, `src/**/*.test.tsx`, `src/test`)
- Production env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) via GitHub Actions secrets
