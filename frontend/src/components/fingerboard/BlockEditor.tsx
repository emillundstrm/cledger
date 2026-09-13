import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LoadStepper from "./LoadStepper"
import type { Grip } from "@/lib/fingerboard/protocols"
import { EDGE_OPTIONS, GRIPS, GRIP_LABELS } from "@/lib/fingerboard/protocols"
import type { WorkoutBlock } from "@/lib/fingerboard/types"
import { cn } from "@/lib/utils"

interface BlockEditorProps {
    blocks: WorkoutBlock[]
    onChange: (blocks: WorkoutBlock[]) => void
    incrementKg: number
    /** Whether positions can be added and removed. */
    allowMultiple: boolean
    loadLabel: string
    /** False when loads come from the anchor and are shown read-only. */
    editableLoads: boolean
    /** False when one edge applies to the whole session. */
    editableEdges: boolean
    recommendationFor?: (block: WorkoutBlock) => string | null
}

/**
 * Edits the grip positions a workout moves through. Mixing positions in one
 * session is normal — Abralifts is a circuit across six — so grip, edge, sets
 * and load all belong to the position rather than the workout.
 */
function BlockEditor({
    blocks,
    onChange,
    incrementKg,
    allowMultiple,
    loadLabel,
    editableLoads,
    editableEdges,
    recommendationFor,
}: BlockEditorProps) {
    const update = (index: number, changes: Partial<WorkoutBlock>) => {
        onChange(blocks.map((block, i) => (i === index ? { ...block, ...changes } : block)))
    }

    const remove = (index: number) => {
        onChange(blocks.filter((_, i) => i !== index))
    }

    const add = () => {
        const last = blocks[blocks.length - 1]
        onChange([
            ...blocks,
            last === undefined
                ? { grip: "half_crimp", edgeMm: 20, sets: 1, loadKg: 0 }
                : { ...last, sets: 1 },
        ])
    }

    return (
        <div className="space-y-3">
            {blocks.map((block, index) => {
                const note = recommendationFor?.(block) ?? null
                return (
                    <div
                        key={index}
                        className="space-y-3 rounded-[14px] border border-border p-4"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-display text-sm text-muted-foreground tabular-nums">
                                {index + 1}
                            </span>
                            <Select
                                value={block.grip}
                                onValueChange={(value) => update(index, { grip: value as Grip })}
                            >
                                <SelectTrigger
                                    aria-label={`Position ${index + 1} grip`}
                                    className="flex-1"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRIPS.map((grip) => (
                                        <SelectItem key={grip} value={grip}>
                                            {GRIP_LABELS[grip]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {allowMultiple && blocks.length > 1 ? (
                                <button
                                    type="button"
                                    aria-label={`Remove position ${index + 1}`}
                                    onClick={() => remove(index)}
                                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            ) : null}
                        </div>

                        <div className={cn("grid gap-3", editableEdges ? "grid-cols-2" : "grid-cols-1")}>
                            {editableEdges ? (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Edge</Label>
                                    <Select
                                        value={String(block.edgeMm)}
                                        onValueChange={(value) =>
                                            update(index, { edgeMm: Number(value) })
                                        }
                                    >
                                        <SelectTrigger
                                            aria-label={`Position ${index + 1} edge`}
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EDGE_OPTIONS.map((edge) => (
                                                <SelectItem key={edge} value={String(edge)}>
                                                    {edge}mm
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div className="space-y-1.5">
                                <Label className="text-xs">Sets</Label>
                                <Select
                                    value={String(block.sets)}
                                    onValueChange={(value) => update(index, { sets: Number(value) })}
                                >
                                    <SelectTrigger
                                        aria-label={`Position ${index + 1} sets`}
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
                                            <SelectItem key={count} value={String(count)}>
                                                {count}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {editableLoads ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs">{loadLabel}</Label>
                                <LoadStepper
                                    ariaLabel={`Position ${index + 1} load`}
                                    value={block.loadKg}
                                    stepKg={incrementKg}
                                    onChange={(value) => update(index, { loadKg: value })}
                                />
                                {note === null ? null : (
                                    <p className="text-xs text-muted-foreground">{note}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-xs text-muted-foreground">{loadLabel}</span>
                                <span className="font-display text-xl tabular-nums">
                                    {block.loadKg}kg
                                </span>
                            </div>
                        )}
                    </div>
                )
            })}

            {allowMultiple ? (
                <button
                    type="button"
                    onClick={add}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                    <Plus className="size-4" />
                    Add position
                </button>
            ) : null}
        </div>
    )
}

export default BlockEditor
