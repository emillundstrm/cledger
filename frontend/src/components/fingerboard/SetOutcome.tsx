import type { KeyboardEvent } from "react"
import { useRef } from "react"
import { cn } from "@/lib/utils"

// A held set is tinted Good and a missed one Bad: status, never Ember.
const OUTCOMES = [
    { completed: true, label: "Klarade", selectedClass: "border-good/40 bg-good/15 text-good" },
    { completed: false, label: "Missade", selectedClass: "border-bad/40 bg-bad/15 text-bad" },
] as const

/**
 * Whether a set was held: one radio pair, used both between sets in the
 * runner and afterwards in the summary, so the answer looks and works the same
 * in both places. One tab stop; the arrow keys switch.
 */
function SetOutcome({
    completed,
    onChange,
    "aria-label": ariaLabel,
    className,
}: {
    completed: boolean
    onChange: (completed: boolean) => void
    "aria-label": string
    className?: string
}) {
    const buttons = useRef<(HTMLButtonElement | null)[]>([])

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault()
            const next = !completed
            onChange(next)
            buttons.current[next ? 0 : 1]?.focus()
        }
    }

    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={cn("flex shrink-0 gap-1.5", className)}
            onKeyDown={onKeyDown}
        >
            {OUTCOMES.map((outcome, index) => {
                const checked = completed === outcome.completed
                return (
                    <button
                        key={outcome.label}
                        ref={(el) => {
                            buttons.current[index] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => onChange(outcome.completed)}
                        className={cn(
                            "h-11 cursor-pointer rounded-full border px-4 text-sm font-medium outline-none transition-[color,background-color,border-color,transform] duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/80",
                            checked
                                ? outcome.selectedClass
                                : "border-border text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
                        )}
                    >
                        {outcome.label}
                    </button>
                )
            })}
        </div>
    )
}

export default SetOutcome
