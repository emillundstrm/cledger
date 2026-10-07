import { Button } from "@/components/ui/button"

/**
 * Shown where a checklist change was made when saving it failed. The change
 * stays on screen; the user retries it or undoes it.
 */
function UnsavedNotice({
    onRetry,
    onDiscard,
    isRetrying,
}: {
    onRetry: () => void
    onDiscard: () => void
    isRetrying: boolean
}) {
    return (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-bad">Ändringen kunde inte sparas.</span>
            <div className="flex gap-1.5">
                <Button type="button" variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
                    {isRetrying ? "Sparar…" : "Försök igen"}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={isRetrying} onClick={onDiscard}>
                    Ångra ändringen
                </Button>
            </div>
        </div>
    )
}

export default UnsavedNotice
