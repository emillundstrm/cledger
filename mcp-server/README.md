# CLedger MCP Server

An MCP (Model Context Protocol) server that exposes CLedger climbing training log data to LLM agents, enabling AI-powered training coaching.

## Setup

### Prerequisites

- Node.js 20+
- Supabase instance (local via `npx supabase start` or hosted)

### Install & Build

```bash
cd mcp-server
npm install
npm run build
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLEDGER_SUPABASE_URL` | Supabase project URL (e.g., `http://localhost:54321` for local) |
| `CLEDGER_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `CLEDGER_EMAIL` | Email of the Supabase user to authenticate as |
| `CLEDGER_PASSWORD` | Password of the Supabase user |

All four environment variables are required. The MCP server authenticates as a specific user so Row Level Security applies and it only accesses that user's data.

## Running

The server uses stdio transport — it communicates via stdin/stdout and is designed to be launched by an MCP client.

```bash
node dist/index.js
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`~/.claude/claude_desktop_config.json` or similar):

```json
{
    "mcpServers": {
        "cledger": {
            "command": "node",
            "args": ["/absolute/path/to/cledger/mcp-server/dist/index.js"],
            "env": {
                "CLEDGER_SUPABASE_URL": "http://localhost:54321",
                "CLEDGER_SUPABASE_ANON_KEY": "your-anon-key",
                "CLEDGER_EMAIL": "your-email@example.com",
                "CLEDGER_PASSWORD": "your-password"
            }
        }
    }
}
```

## Available Tools

### `list_sessions`
List climbing training sessions with optional date range filter and limit. Returns sessions ordered by date descending with all fields.

**Parameters:**
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Maximum number of sessions to return

### `get_session`
Get a single session by its UUID with full detail.

**Parameters:**
- `id` (required): Session UUID

### `list_injuries`
List injuries across all sessions with optional date range filter.

**Parameters:**
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)

### `get_analytics`
Get training analytics: sessions this week, hard sessions, injury counts, weekly trends.

No parameters.

### `log_session`
Create a new training session.

**Parameters:**
- `date` (required): YYYY-MM-DD
- `types` (required): Array of session types
- `intensity` (required): easy, moderate, or hard
- `performance` (required): weak, normal, or strong
- `productivity` (required): low, normal, or high
- `durationMinutes` (optional): Duration in minutes
- `notes` (optional): Free-form notes
- `maxGrade` (optional): Max climbing grade
- `venue` (optional): Gym or crag name
- `injuries` (optional): Array of `{location, note?}`

### `log_injury`
Add an injury to an existing session.

**Parameters:**
- `sessionId` (required): Session UUID
- `location` (required): Body part (e.g., "finger", "elbow")
- `note` (optional): Injury details

### `list_insights`
List coach insights ordered by pinned status and last updated.

No parameters.

### `add_insight`
Add a new coach insight.

**Parameters:**
- `content` (required): Insight content (supports markdown)
- `pinned` (optional): Whether to pin the insight

### `update_insight`
Update an existing coach insight.

**Parameters:**
- `id` (required): Insight UUID
- `content` (optional): Updated content
- `pinned` (optional): Updated pin status

### `get_training_summary`
Convenience tool that returns a comprehensive training overview in a single call — sessions from the last 14 days, analytics, recent injuries, and trends. Best starting point for coaching.

No parameters.
