import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/**
 * A choice among several, often multi-select (DESIGN.md: Selection Controls):
 * filters, tags, scope toggles like "Visa arkiverade". Selected is Wash with
 * Ink text, never a solid fill. Session types use the hue-tinted `.type-chip`
 * instead.
 */
export function ChoiceChip({
    pressed,
    className,
    ...props
}: Omit<ComponentProps<"button">, "type"> & { pressed: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            className={cn(
                "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium outline-none transition-[color,background-color,border-color,transform] duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/80",
                pressed
                    ? "border-border bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground",
                className,
            )}
            {...props}
        />
    )
}
