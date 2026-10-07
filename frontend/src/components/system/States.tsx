import type { ReactNode } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

/**
 * Loading, error, empty and not-found states (DESIGN.md: States). Each names
 * what it concerns in plain Swedish; none is boxed.
 */
export function LoadingState({ children }: { children: ReactNode }) {
    return (
        <p role="status" className="text-sm text-muted-foreground">
            {children}
        </p>
    )
}

export function ErrorState({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-bad">{children}</span>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    Försök igen
                </Button>
            )}
        </div>
    )
}

export function EmptyState({
    children,
    action,
}: {
    children: ReactNode
    /** One ghost action, when there is something to do (e.g. "Rensa filter"). */
    action?: { label: string; onClick: () => void }
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{children}</span>
            {action && (
                <Button variant="ghost" size="sm" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    )
}

/** Not an error: the thing does not exist (any more). */
export function NotFoundState({ children, back }: { children: ReactNode; back: { to: string; label: string } }) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{children}</p>
            <Link to={back.to} className="text-sm text-muted-foreground hover:text-foreground">
                ← {back.label}
            </Link>
        </div>
    )
}
