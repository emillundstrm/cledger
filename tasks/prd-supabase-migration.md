# PRD: Supabase Migration

## Introduction

Migrate CLedger from a local-first Spring Boot + PostgreSQL architecture to a Supabase architecture. This removes the entire Java backend and replaces it with Supabase's managed PostgreSQL, PostgREST API, Row Level Security, and Auth. The frontend and MCP server will communicate directly with Supabase. Development and testing are done against a local Supabase instance (via Supabase CLI). Only after all functionality is verified locally do we switch to the hosted Supabase project for production deployment.

## Goals

- Remove the Spring Boot backend entirely
- Use Supabase as the sole backend (database, API, auth, hosting)
- Add authentication so each user's data is private
- Support multiple users from day one with Row Level Security
- Deploy the frontend via GitHub Pages
- Migrate the MCP server to use the Supabase client instead of the Spring Boot API
- Preserve all existing functionality (session logging, analytics, insights)

## User Stories

### US-001: Set up local Supabase instance and database schema
**Description:** As a developer, I need to set up a local Supabase instance via the Supabase CLI and recreate the existing database schema so the app has a data layer to work with. A hosted Supabase project already exists and will be used later for production.

**Acceptance Criteria:**
- [x] Local Supabase instance running via `npx supabase start` (project already initialized)
- [x] `sessions` table created with all existing columns plus `user_id` (UUID, FK to `auth.users`)
- [x] `sessions` table includes a `types` text array column (replaces the `session_types` join table)
- [x] `session_injuries` table created with `user_id`
- [x] `coach_insights` table created with `user_id`
- [x] All tables have `created_at` and `updated_at` timestamps with defaults
- [x] SQL migration files stored in `supabase/migrations/`
- [x] Frontend `.env` points to local Supabase instance (`http://localhost:54321`)

### US-002: Configure Row Level Security policies
**Description:** As a user, I want my data to be private so that no one else can see or modify my sessions, injuries, or insights.

**Acceptance Criteria:**
- [x] RLS enabled on all tables (`sessions`, `session_injuries`, `coach_insights`)
- [x] SELECT policy: users can only read their own rows (`auth.uid() = user_id`)
- [x] INSERT policy: users can only insert rows with their own `user_id`
- [x] UPDATE policy: users can only update their own rows
- [x] DELETE policy: users can only delete their own rows
- [x] Verified: unauthenticated requests are rejected
- [x] Verified: user A cannot access user B's data

### US-003: Configure authentication
**Description:** As a user, I want to sign in with my email and password so my data is protected. Users are created manually via the Supabase dashboard (invite link) — there is no self-service sign-up.

**Acceptance Criteria:**
- [x] Email+password auth enabled in Supabase
- [x] Login page with email and password fields
- [x] Successful login redirects to the app
- [x] User session persisted (page refresh keeps you logged in)
- [x] Sign-out button in the app layout
- [x] Unauthenticated users are redirected to the login page
- [x] No public sign-up form (users are invited manually via Supabase dashboard)
- [x] Typecheck passes
- [x] Verified by human in browser

### US-004: Replace frontend API layer with Supabase client
**Description:** As a developer, I need to replace all `fetch('/api/...')` calls with Supabase JS client calls so the frontend communicates directly with Supabase.

**Acceptance Criteria:**
- [x] `@supabase/supabase-js` installed in frontend
- [x] Supabase client initialized with project URL and anon key
- [x] `sessions` API module rewritten: list, get, create, update, delete use Supabase client
- [x] `analytics` API module rewritten to call Supabase database functions (RPC)
- [x] `insights` API module rewritten to use Supabase client
- [x] `venues` endpoint replaced with a distinct query on sessions
- [x] `session_types` join table removed; types read from the `types` array column on `sessions`
- [x] `injury-locations` endpoint replaced with a distinct query on session_injuries
- [x] React Query hooks updated to use new Supabase-based functions
- [x] Typecheck passes

### US-012: Post-login redirect and login UI lockdown
**Description:** As a user, after I successfully log in I should be automatically redirected to the sessions page so I know the login worked. The login form should also be disabled while authentication is in progress to prevent double submissions.

**Acceptance Criteria:**
- [x] Successful login redirects the user to the sessions page
- [x] Login form inputs and submit button are disabled while authentication is in progress
- [x] A loading indicator is shown during authentication (e.g., spinner on the button)
- [x] If login fails, the form is re-enabled and an error message is shown
- [x] Typecheck passes

### US-005: Move analytics computation
**Description:** As a developer, I need to implement analytics as Supabase database functions (RPC) now that there's no backend service layer, so the dashboard keeps working. The daysSinceLastRestDay is excluded since it will be removed from the UI.

**Acceptance Criteria:**
- [x] Analytics computations implemented as Supabase database functions (RPC), split into separate functions
- [x] `sessionsThisWeek` metric works correctly
- [x] `hardSessionsLast7Days` metric works correctly
- [x] `daysSinceLastRestDay` metric does NOT need to work
- [x] `painFlagsLast30Days` metric works correctly
- [x] `weeklySessionCounts` (last 8 weeks) works correctly
- [x] `performanceTrend` (last 8 weeks) works correctly
- [x] `productivityTrend` (last 8 weeks) works correctly
- [x] Dashboard page renders all charts and metrics correctly
- [x] Typecheck passes

### US-006: Update session form to work with Supabase
**Description:** As a user, I want the session creation and editing forms to work the same as before so my workflow isn't disrupted.

**Acceptance Criteria:**
- [x] Create session form submits to Supabase and saves correctly
- [x] Edit session form loads existing data from Supabase and updates correctly
- [x] Session types (boulder, routes, board, etc.) saved correctly in the `types` text array column
- [x] Injuries saved and updated correctly with cascade behavior
- [x] Validation rules preserved (required fields, allowed values)
- [x] Delete session works with confirmation
- [x] Typecheck passes

### US-007: Migrate MCP server to Supabase
**Description:** As a developer, I need the MCP server to use the Supabase client instead of calling the Spring Boot API, so it continues to work for LLM-based coaching.

**Acceptance Criteria:**
- [x] `@supabase/supabase-js` installed in MCP server
- [x] MCP server authenticates with Supabase as a specific user (using email+password or a user-scoped token), so RLS applies and it only accesses that user's data
- [x] All 10 MCP tools updated to use Supabase queries instead of HTTP calls to backend
- [x] `list_sessions`, `get_session`, `log_session`, `log_injury` work correctly
- [x] `get_analytics` works correctly
- [x] `list_insights`, `add_insight`, `update_insight` work correctly
- [x] `get_training_summary` works correctly
- [x] `list_injuries` works correctly
- [x] Typecheck passes

### US-008: Remove Spring Boot backend
**Description:** As a developer, I want to remove the entire backend project so there's no dead code or confusion about what's in use.

**Acceptance Criteria:**
- [x] `backend/` directory deleted
- [x] Vite proxy configuration removed (no more `/api` proxy to `localhost:8080`)
- [x] Any scripts referencing the backend updated or removed
- [x] `ARCHITECTURE.md` updated to reflect new Supabase-based architecture
- [x] Application works end-to-end without the backend running

### US-009: Deploy to GitHub Pages with hosted Supabase
**Description:** As a user, I want to access CLedger from the internet so I can log sessions from any device. This is when we switch from the local Supabase instance to the hosted Supabase project. The GitHub repository (`emillundstrm/cledger`) is already created and the current main branch has been pushed.

**Acceptance Criteria:**
- [x] GitHub repository created and main branch pushed (`emillundstrm/cledger`)
- [ ] Supabase migrations pushed to hosted project (`supabase db push` or `supabase link` + `supabase db push`)
- [ ] RLS policies and auth configuration applied to hosted project
- [x] Production environment variables configured to point at hosted Supabase project URL and anon key
- [x] Frontend built as a static site (Vite production build)
- [x] GitHub Actions workflow created for automated deployment to GitHub Pages
- [x] Vite `base` path configured correctly for GitHub Pages (`/cledger/`)
- [x] SPA routing handled (404.html redirect or hash router)
- [ ] Supabase Auth site URL configured for the GitHub Pages domain (`https://emillundstrm.github.io`)
- [ ] App loads and functions correctly on the public URL
- [ ] Login flow works on production
- [ ] Session CRUD works on production
- [ ] Dashboard loads with real data on production

### US-010: Data migration tooling
**Description:** As an existing user, I want to migrate my existing local data to Supabase so I don't lose my training history.

**Acceptance Criteria:**
- [x] Script or instructions to export data from local PostgreSQL
- [x] Script or instructions to import data into Supabase with correct `user_id`
- [x] Sessions, injuries, and insights all migrated
- [x] Data integrity verified after migration (row counts match, spot-check values)

### US-011: Production cutover to hosted Supabase
**Description:** As a developer, after all functionality is verified against the local Supabase instance, I need to configure and verify the hosted Supabase project so the app works in production.

**Acceptance Criteria:**
- [x] All migrations applied to the hosted Supabase project
- [x] RLS policies verified on hosted instance
- [x] Auth configuration (email+password, no public sign-up) verified on hosted instance
- [x] MCP server user credentials configured for hosted instance
- [x] Smoke test: login, create session, view dashboard, view insights all work against hosted Supabase
- [x] Local development continues to work against local Supabase instance (env-based switching)

### US-013: Fix mobile responsiveness on small screens
**Description:** As a user on a small screen (e.g., iPhone 13 in portrait), I want the app to display correctly without horizontal scrollbars so I can use it comfortably on my phone.

**Acceptance Criteria:**
- [x] Header navigation uses icons instead of text labels at small screen breakpoints
- [x] No horizontal scrollbar appears on the header at iPhone 13 portrait width (~390px)
- [x] Dashboard charts (especially the last two) have responsive minimum widths
- [x] No horizontal scrollbar appears on the dashboard page at iPhone 13 portrait width
- [x] Typecheck passes

## Functional Requirements

- FR-1: All data access must go through Supabase PostgREST API via `@supabase/supabase-js`
- FR-2: Every table must have a `user_id` column referencing `auth.users(id)`
- FR-3: Row Level Security must be enabled on all tables; users can only access their own data
- FR-4: Authentication must use email+password via Supabase Auth. Users are created manually via the Supabase dashboard — no self-service sign-up
- FR-5: The frontend must redirect unauthenticated users to a login page
- FR-6: The frontend must pass the user's auth token with every Supabase request (handled by the client library)
- FR-7: The MCP server must authenticate as a specific user for data access (RLS applies, scoped to that user's data)
- FR-8: Analytics must produce the same metrics as the current backend `AnalyticsService`
- FR-9: Session validation rules must be preserved (allowed types, intensity, performance, productivity values)
- FR-10: The app must be deployable as a static site to GitHub Pages
- FR-11: The `backend/` directory must be fully removed, not left as dead code

## Non-Goals

- No self-service sign-up (users are invited via Supabase dashboard)
- No OAuth providers required (can be added later if desired)
- No real-time subscriptions (Supabase Realtime) - standard request/response is sufficient
- No server-side rendering or edge functions for the frontend
- No Supabase Hosting (frontend is hosted on GitHub Pages instead)
- No Supabase Storage usage (no file uploads)
- No changes to the UI design or component library (ShadCN stays)
- No new features beyond what the MVP already supports
- No mobile app - this remains a responsive web app

## Technical Considerations

- **Supabase JS client:** Use `@supabase/supabase-js` v2 for both frontend and MCP server
- **Environment variables:** Supabase URL and anon key must be configured via env vars (not hardcoded). The MCP server needs user credentials (email+password) configured via env vars to authenticate as a specific user
- **Analytics computation:** Use Supabase database functions (RPC). Split into a few separate functions rather than one monolithic one. This keeps computation server-side and the frontend thin.
- **Session types:** Stored as a PostgreSQL text array column on the `sessions` table. No join table needed.
- **Cascading deletes:** Supabase/PostgreSQL foreign keys with `ON DELETE CASCADE` handle session -> injuries cleanup, same as current Flyway migrations
- **Local-first development:** All development and testing targets the local Supabase instance (`supabase start`). The hosted Supabase project is only used for final production deployment (US-009/US-011). Environment variables control which instance is used.
- **Supabase CLI:** Use `npx supabase init` and `npx supabase db diff` for local development and migration management. Use `npx supabase db push` to apply migrations to the hosted project when ready. All `npx supabase` commands must be run from the `frontend/` directory, where the Supabase CLI module is installed
- **GitHub Pages deployment:** Vite's `base` option must match the repo name (e.g., `/<repo-name>/`). SPA client-side routing needs a 404.html workaround since GitHub Pages doesn't support catch-all rewrites. A GitHub Actions workflow should automate build and deploy on push to main
- **Testing:** Frontend tests (Vitest) need to mock the Supabase client. Backend JUnit tests are deleted with the backend

## Success Metrics

- All existing MVP functionality works identically from the user's perspective
- App is accessible from the public internet via a URL
- Login flow completes in under 10 seconds
- Existing training data successfully migrated without loss
- No Spring Boot code remains in the repository
- MCP server produces the same outputs as before

## Resolved Questions

- **Session types:** Use a PostgreSQL text array column instead of a join table, for simplicity.
- **Analytics computation:** Use Supabase database functions (RPC), split into a few separate functions rather than one monolithic one.
- **MCP server user context:** Operate as a specific user. The MCP server is used by an LLM to access one user's personal data and reason around it, so it authenticates as that user rather than using the service role for cross-user access.
- **Edge Functions:** Not needed at this point. All logic lives in the client or in database functions.
