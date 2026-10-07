import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { resolveLinks } from "@/api/notes"
import { checklistItems } from "@/lib/checklist"
import { extractAppLinks, parseAppPath, routeFor } from "@/lib/links"
import { cn } from "@/lib/utils"
import { plainPreview } from "./format"

/**
 * Renders note content as Markdown. Links to app routes become in-app links,
 * and links to items that no longer exist are shown as plain text with a
 * marker. Raw HTML in content is not rendered (react-markdown's default).
 *
 * Checklist items ("- [ ] kaffe") render as checkboxes. They are tappable when
 * `onToggleItem` is given, which receives the item's line in `content`.
 */
function NoteMarkdown({
    content,
    onToggleItem,
}: {
    content: string
    onToggleItem?: (line: number, checked: boolean) => void
}) {
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
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children }) => renderLink(href ?? "", children, titles),
                    // Note content sits below the page's own headings, so its
                    // "#" headings start at h3 and keep their look via classes.
                    h1: ({ children }) => <h3 className="md-h1">{children}</h3>,
                    h2: ({ children }) => <h4 className="md-h2">{children}</h4>,
                    h3: ({ children }) => <h5 className="md-h3">{children}</h5>,
                    h4: ({ children }) => <h6 className="md-h3">{children}</h6>,
                    h5: ({ children }) => <h6 className="md-h3">{children}</h6>,
                    h6: ({ children }) => <h6 className="md-h3">{children}</h6>,
                    ...(onToggleItem ? checklistComponents(content, onToggleItem) : {}),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

/** Task list items with a working checkbox, located in the source by line. */
function checklistComponents(content: string, onToggleItem: (line: number, checked: boolean) => void): Components {
    const items = checklistItems(content)
    return {
        // The item renders its own checkbox; GFM's is read-only.
        input: () => null,
        li: ({ node, className, children }) => {
            const line = (node?.position?.start.line ?? 0) - 1
            const item = className?.includes("task-list-item")
                ? items.find((i) => i.line === line)
                : undefined
            if (!item) {
                return <li className={className}>{children}</li>
            }
            return (
                <li className={cn(className, item.checked && "is-checked")}>
                    <input
                        type="checkbox"
                        checked={item.checked}
                        aria-label={plainPreview(item.text, 200)}
                        onChange={() => onToggleItem(item.line, !item.checked)}
                    />
                    <span>{children}</span>
                </li>
            )
        },
    }
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
            <span className="text-muted-foreground" title="Det här finns inte längre">
                {children} <span className="text-xs">(saknas)</span>
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
