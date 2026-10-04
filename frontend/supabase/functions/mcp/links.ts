// Links between items are plain Markdown links to app routes, e.g.
// [axellärdomar](/notes/<uuid>), [passet](/sessions/<uuid>) or
// [dagboken](/journal/<uuid>). Mirrored from
// frontend/src/lib/links.ts.

export type LinkKind = "note" | "session" | "journal";

const SEGMENT_TO_KIND: Record<string, LinkKind> = {
    notes: "note",
    sessions: "session",
    journal: "journal",
};

export interface AppLink {
    kind: LinkKind;
    id: string;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MARKDOWN_LINK = new RegExp(`\\]\\(/(notes|sessions|journal)/(${UUID})/?\\)`, "gi");

/** All distinct app links in a Markdown text, in order of appearance. */
export function extractAppLinks(markdown: string): AppLink[] {
    const seen = new Set<string>();
    const links: AppLink[] = [];
    for (const match of markdown.matchAll(MARKDOWN_LINK)) {
        const link = { kind: SEGMENT_TO_KIND[match[1].toLowerCase()], id: match[2].toLowerCase() };
        const key = `${link.kind}:${link.id}`;
        if (!seen.has(key)) {
            seen.add(key);
            links.push(link);
        }
    }
    return links;
}
