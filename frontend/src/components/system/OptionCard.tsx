import type { ReactNode } from "react"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

/**
 * A choice that needs a description (DESIGN.md: Selection Controls): a
 * container-shaped option with a radio, inside a RadioGroup. Selected takes
 * Wash and an Ink Muted border; the focus ring outlines the whole card.
 */
function OptionCard({
    id,
    value,
    selected,
    title,
    description,
}: {
    id: string
    value: string
    selected: boolean
    title: ReactNode
    description?: ReactNode
}) {
    return (
        <label
            htmlFor={id}
            className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors duration-150 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                selected
                    ? "border-muted-foreground/60 bg-accent"
                    : "border-border hover:border-muted-foreground/60 hover:bg-accent/60"
            )}
        >
            <RadioGroupItem
                value={value}
                id={id}
                className="mt-0.5 text-foreground focus-visible:ring-0"
            />
            <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                {description !== undefined ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {description}
                    </span>
                ) : null}
            </span>
        </label>
    )
}

export default OptionCard
