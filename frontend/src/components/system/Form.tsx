import type { ComponentProps, ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Forms sit on the page, never in a box (DESIGN.md: Forms). FormLayout sets
 * the width and the rhythm between fields; FormField puts the label above its
 * control; FormActions is the button row at the bottom.
 */
export function FormLayout({ className, ...props }: ComponentProps<"form">) {
    return <form className={cn("max-w-2xl space-y-6", className)} {...props} />
}

export function FormField({
    label,
    htmlFor,
    hint,
    hintId,
    error,
    className,
    children,
}: {
    label: ReactNode
    /** The control's id. Omit for a group of controls; give the group an aria-label instead. */
    htmlFor?: string
    /** Help under the control. Pass `hintId` and set it as the control's aria-describedby. */
    hint?: ReactNode
    hintId?: string
    error?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <div className={cn("space-y-2", className)}>
            {htmlFor ? (
                <Label htmlFor={htmlFor}>{label}</Label>
            ) : (
                <div className="text-sm leading-none font-medium">{label}</div>
            )}
            {children}
            {hint && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-bad">
                    {error}
                </p>
            )}
        </div>
    )
}

/** The submit and cancel row at the bottom of a form, left-aligned. */
export function FormActions({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />
}

/** A form-level error, shown directly above the button row. */
export function FormError({ children }: { children: ReactNode }) {
    return (
        <p role="alert" className="text-sm text-bad">
            {children}
        </p>
    )
}
