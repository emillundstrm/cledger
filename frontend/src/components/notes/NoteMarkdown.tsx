import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import ReactMarkdown from "react-markdown"
import { resolveLinks } from "@/api/notes"
import { extractAppLinks, parseAppPath, routeFor } from "@/lib/links"

/**
 * Renders note content as Markdown. Links to app routes become in-app links,
 * and links to items that no longer exist are shown as plain text with a
 * marker. Raw HTML in content is not rendered (react-markdown's default).
 */
function NoteMarkdown({ content }: { content: string }) {
    const links = useMemo(() => extractAppLinks(content), [content])
    const keys = links.map((l) => `${l.kind}:${l.id}`)

    const { data: titles } = useQuery({
        queryKey: ["link-titles", keys],
        queryFn: () => resolveLinks(links),
        enabled: links.length > 0,
    })

    return (
        <div className="text-sm prose-note">
            <ReactMarkdown
                components={{
                    a: ({ href, children }) => renderLink(href ?? "", children, titles),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

function renderLink(href: string, children: ReactNode, titles: Map<string, string> | undefined) {
    const link = parseAppPath(href)
    if (!link) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        )
    }

    const missing = titles !== undefined && !titles.has(`${link.kind}:${link.id}`)
    if (missing) {
        return (
            <span className="text-muted-foreground" title="This item no longer exists">
                {children} <span className="text-xs">(missing)</span>
            </span>
        )
    }

    return (
        <Link to={routeFor(link)} title={titles?.get(`${link.kind}:${link.id}`)}>
            {children}
        </Link>
    )
}

export default NoteMarkdown
