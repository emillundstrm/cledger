import { useId, useRef, type CSSProperties, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
    value: T
    label: string
    /** Tooltip, when the label alone is terse. */
    title?: string
}

/**
 * One exclusive choice among 2–4 options (DESIGN.md: Selection Controls): a
 * pill track with the selected option on a Wash pill that slides between
 * options. A radio group for assistive tech, with arrow-key navigation.
 */
export function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
    "aria-label": ariaLabel,
    size = "default",
    className,
}: {
    value: T
    onChange: (value: T) => void
    options: readonly SegmentedOption<T>[]
    "aria-label": string
    size?: "default" | "sm"
    className?: string
}) {
    // Anchor names must be unique per instance and a valid CSS ident.
    const anchor = `--segmented-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
    const buttons = useRef<(HTMLButtonElement | null)[]>([])

    // With nothing selected, the first option takes the tab stop, so the
    // control can still be reached by keyboard.
    const hasChecked = options.some((o) => o.value === value)

    const select = (index: number) => {
        const option = options[(index + options.length) % options.length]
        onChange(option.value)
        buttons.current[options.indexOf(option)]?.focus()
    }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        // -1 when nothing is selected: right then lands on the first option, left on the last.
        const current = options.findIndex((o) => o.value === value)
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault()
            select(current + 1)
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault()
            select(current === -1 ? options.length - 1 : current - 1)
        } else if (event.key === "Home") {
            event.preventDefault()
            select(0)
        } else if (event.key === "End") {
            event.preventDefault()
            select(options.length - 1)
        }
    }

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={cn(
                "relative isolate inline-flex w-fit gap-0.5 rounded-full border border-border p-[3px]",
                className,
            )}
            style={{ "--tab-pill-anchor": anchor, "--tab-pill-radius": "999px" } as CSSProperties}
            onKeyDown={onKeyDown}
        >
            {options.map((option, index) => {
                const checked = option.value === value
                return (
                    <button
                        key={option.value}
                        ref={(el) => {
                            buttons.current[index] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked || (!hasChecked && index === 0) ? 0 : -1}
                        title={option.title}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "cursor-pointer rounded-full font-medium whitespace-nowrap outline-none transition-[color,box-shadow,transform] duration-200 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            size === "default" ? "px-4 py-1.5 text-[13px]" : "px-3 py-1 text-xs",
                            checked ? "tab-pill-active text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {option.label}
                    </button>
                )
            })}
            <span aria-hidden="true" className="tab-pill" />
        </div>
    )
}
