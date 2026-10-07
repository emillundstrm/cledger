import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A standalone group of content or controls (DESIGN.md: Container Model): a
 * hairline box on the page, no fill, no shadow. Never put another bordered or
 * filled surface inside it.
 */
export function Container({
    className,
    label,
    tone,
    children,
    ...props
}: ComponentProps<"section"> & {
    /** Small-caps caption at the top, e.g. a dashboard tile's name. */
    label?: ReactNode
    /** A notice: border and tint in the status color. */
    tone?: "warn" | "bad"
}) {
    return (
        <section
            className={cn(
                "rounded-[14px] border p-5",
                tone === undefined && "border-border",
                tone === "warn" && "border-warn/40 bg-warn/5",
                tone === "bad" && "border-bad/40 bg-bad/5",
                className,
            )}
            {...props}
        >
            {label !== undefined && <ContainerLabel>{label}</ContainerLabel>}
            {children}
        </section>
    )
}

/** A container's caption. An h2 by default, as containers sit right under the page title. */
export function ContainerLabel({
    children,
    className,
    as: Heading = "h2",
}: {
    children: ReactNode
    className?: string
    as?: "h2" | "h3"
}) {
    return (
        <Heading className={cn("mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground", className)}>
            {children}
        </Heading>
    )
}
