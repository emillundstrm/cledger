# CLedger MCP Server

A remote MCP server that gives Claude access to CLedger: the climbing training log, and the notes
and journal that serve as the assistant's memory. It sends routing instructions on connect, telling
the assistant to call `get_context` first and where to record what. Tool descriptions live in
`server.ts`.

## Connecting

Server URL: `https://<project-ref>.supabase.co/functions/v1/mcp`

- **claude.ai** (web, desktop, phone): Settings → Connectors → Add custom connector, paste the URL
- **Claude Code**: `claude mcp add --transport http cledger <url>`, then `/mcp` to sign in

The client registers itself and opens the CLedger consent page. Sign in, check that the redirect
host is the client you started from (e.g. `claude.ai`), and approve.

## Hosted setup (once)

In the Supabase dashboard, under Authentication:

1. **URL Configuration**: Site URL `https://emillundstrm.github.io/cledger`
2. **OAuth Server**: enable it, authorization path `/oauth/consent`, allow dynamic client registration

Then, from `frontend/`:

```sh
npx supabase functions deploy mcp
```

The consent page ships with the app (GitHub Pages). Approved clients are listed under
Authentication → OAuth Apps, where they can be revoked.

Optional secret: `CLEDGER_TIME_ZONE` (default `Europe/Stockholm`), for dates the assistant leaves
out.

## Local development

From `frontend/`, with `npx supabase start` running:

```sh
npx supabase functions serve mcp
npm run dev
```

The server is at `http://127.0.0.1:54321/functions/v1/mcp` and the consent page at
`http://localhost:5173/cledger/oauth/consent`.
