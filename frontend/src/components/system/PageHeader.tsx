import type { ReactNode } from "react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"

/**
 * The top of every page (DESIGN.md: Page Header): an optional back link on
 * child pages, the page title (the page's only h1), an optional subtitle, and
 * at most one primary action plus its companions at the right.
 */
export function PageHeader({
    title,
    back,
    subtitle,
    actions,
    className,
}: {
    title: ReactNode
    back?: { to: string; label: string }
    subtitle?: ReactNode
    /** The page's primary action, and controls that belong with it (e.g. a view switch). */
    actions?: ReactNode
    className?: string
}) {
    return (
        <header className={cn("space-y-2", className)}>
            {back && (
                <Link
                    to={back.to}
                    className="inline-block rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                >
                    ← {back.label}
                </Link>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="min-w-0 font-display text-4xl break-words">{title}</h1>
                {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </header>
    )
}
