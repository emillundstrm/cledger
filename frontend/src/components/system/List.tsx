import type { ComponentProps, ReactNode } from "react"
import { Link } from "react-router"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A list of similar items (DESIGN.md: Container Model, List Rows): rows in one
 * hairline frame, separated by dividers. No fill, no shadow, no lift.
 *
 *     <ListFrame aria-label="Pass">
 *         <ListRow>
 *             <RowLink to="/sessions/1">Boulder</RowLink>
 *             <RowChevron />
 *         </ListRow>
 *     </ListFrame>
 */
export function ListFrame({ className, ...props }: ComponentProps<"ul">) {
    return (
        <ul
            className={cn(
                "divide-y divide-border overflow-hidden rounded-lg border border-border",
                className,
            )}
            {...props}
        />
    )
}

/**
 * One row. A row with a RowLink or RowButton is interactive: the whole row
 * takes the hover wash, because those stretch over it. Controls inside the row
 * (checkboxes, buttons) sit above the stretched target and keep their own
 * hover.
 */
export function ListRow({
    className,
    interactive = true,
    archived = false,
    ...props
}: ComponentProps<"li"> & {
    /** Set false for a row with nothing to open, so it takes no hover wash. */
    interactive?: boolean
    archived?: boolean
}) {
    return (
        <li
            className={cn(
                "group/row relative px-4 py-3 transition-colors duration-150",
                interactive && "hover:bg-accent/60",
                archived && "opacity-60",
                className,
            )}
            {...props}
        />
    )
}

// The stretched target covers the row; its focus ring is drawn on that cover
// so it outlines the whole row.
const STRETCHED =
    "outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] " +
    "focus-visible:after:ring-[3px] focus-visible:after:ring-inset focus-visible:after:ring-ring/80"

/** The row's link. It stretches over the row, so the whole row navigates. */
export function RowLink({ className, ...props }: ComponentProps<typeof Link>) {
    return <Link className={cn("text-left", STRETCHED, className)} {...props} />
}

/** The row's expand toggle. It stretches over the row, so the whole row expands. */
export function RowButton({
    className,
    expanded,
    ...props
}: Omit<ComponentProps<"button">, "type"> & { expanded: boolean }) {
    return (
        <button
            type="button"
            aria-expanded={expanded}
            className={cn("cursor-pointer text-left", STRETCHED, className)}
            {...props}
        />
    )
}

/**
 * The chevron at the end of an interactive row: right for a row that
 * navigates (it nudges on hover), down for one that expands (it turns when
 * open).
 */
export function RowChevron({ expanded }: { expanded?: boolean }) {
    if (expanded === undefined) {
        return (
            <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/row:translate-x-0.5"
            />
        )
    }
    return (
        <ChevronDown
            aria-hidden="true"
            className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                expanded ? "rotate-180" : "rotate-0",
            )}
        />
    )
}

/**
 * Content inside a row that must stay clickable above the stretched target
 * (checklists, inline buttons, links in Markdown).
 */
export function RowControls({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("relative z-10", className)} {...props} />
}

/** The heading above a group of rows (a week, a day): small caps, a rule, an optional count. */
export function GroupHeader({ children, count }: { children: ReactNode; count?: ReactNode }) {
    return (
        <h3 className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>{children}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            {count !== undefined && <span className="font-medium normal-case tracking-normal text-dim">{count}</span>}
        </h3>
    )
}
