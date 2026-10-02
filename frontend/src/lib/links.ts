// Links between items are plain Markdown links to app routes, e.g.
// [axellärdomar](/notes/<uuid>) or [passet](/sessions/<uuid>). Paths are
// relative to the app root, without the GitHub Pages base path, so they
// survive a rename. Mirrored in mcp-server/src/links.ts.

export type LinkKind = "note" | "session"

const SEGMENT_TO_KIND: Record<string, LinkKind> = {
    notes: "note",
    sessions: "session",
}

export interface AppLink {
    kind: LinkKind
    id: string
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const APP_PATH = new RegExp(`^/(notes|sessions)/(${UUID})/?$`, "i")
const MARKDOWN_LINK = new RegExp(`\\]\\((/(?:notes|sessions)/${UUID})/?\\)`, "gi")

/** Parse an href into an app link, or null if it points anywhere else. */
export function parseAppPath(href: string): AppLink | null {
    const match = APP_PATH.exec(href)
    if (!match) {
        return null
    }
    return { kind: SEGMENT_TO_KIND[match[1].toLowerCase()], id: match[2].toLowerCase() }
}

/** All distinct app links in a Markdown text, in order of appearance. */
export function extractAppLinks(markdown: string): AppLink[] {
    const seen = new Set<string>()
    const links: AppLink[] = []
    for (const match of markdown.matchAll(MARKDOWN_LINK)) {
        const link = parseAppPath(match[1])
        if (!link) {
            continue
        }
        const key = `${link.kind}:${link.id}`
        if (!seen.has(key)) {
            seen.add(key)
            links.push(link)
        }
    }
    return links
}

/** The in-app route for a link. Sessions have no view page, so they open in the editor. */
export function routeFor(link: AppLink): string {
    if (link.kind === "session") {
        return `/sessions/${link.id}/edit`
    }
    return `/notes/${link.id}`
}
