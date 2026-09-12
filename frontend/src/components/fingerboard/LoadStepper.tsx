import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadStepperProps {
    value: number
    onChange: (value: number) => void
    /** Usually the smallest plate available. */
    stepKg: number
    id?: string
    ariaLabel?: string
    min?: number
    className?: string
}

/**
 * Weight entry for use mid-session. A stock number input means a fiddly caret,
 * a spinner with tiny hit targets and a keyboard covering half the screen —
 * all awkward with chalk on your hands. Stepping by the plate increment is both
 * faster and closer to what actually happens on the pin, while the value stays
 * directly editable for the odd awkward number.
 */
function LoadStepper({
    value,
    onChange,
    stepKg,
    id,
    ariaLabel,
    min = 0,
    className,
}: LoadStepperProps) {
    const clamp = (next: number) => Math.max(min, Math.round(next * 100) / 100)

    return (
        <div
            className={cn(
                "flex items-stretch overflow-hidden rounded-[12px] border border-border",
                className
            )}
        >
            <button
                type="button"
                aria-label={`Decrease by ${stepKg}kg`}
                onClick={() => onChange(clamp(value - stepKg))}
                disabled={value - stepKg < min}
                className="flex w-12 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent disabled:cursor-not-allowed disabled:opacity-40 sm:w-14"
            >
                <Minus className="size-5" />
            </button>

            <div className="flex flex-1 items-baseline justify-center gap-1 border-x border-border px-1 py-3">
                <input
                    id={id}
                    aria-label={ariaLabel}
                    type="number"
                    inputMode="decimal"
                    step={stepKg}
                    value={value}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                        const parsed = Number(event.target.value)
                        if (!Number.isNaN(parsed)) {
                            onChange(clamp(parsed))
                        }
                    }}
                    className="w-full min-w-0 bg-transparent text-center font-display text-2xl tabular-nums outline-none sm:text-3xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="shrink-0 text-sm text-muted-foreground">kg</span>
            </div>

            <button
                type="button"
                aria-label={`Increase by ${stepKg}kg`}
                onClick={() => onChange(clamp(value + stepKg))}
                className="flex w-12 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent sm:w-14"
            >
                <Plus className="size-5" />
            </button>
        </div>
    )
}

export default LoadStepper
