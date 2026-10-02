export function formatTimestamp(ts: string): string {
    return new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

/** First ~160 characters of Markdown as plain text, for previews. */
export function plainPreview(markdown: string, length = 160): string {
    const plain = markdown
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#*_`>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    return plain.length > length ? plain.slice(0, length) + "…" : plain
}

/** Tags are lowercase with dashes for spaces, so "Axel Skada" and "axel-skada" are one tag. */
export function normaliseTag(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, "-")
}
