import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"
import { PERFORMANCE_VALUES } from "@/api/types"
import type { ProtocolDefinition } from "@/lib/fingerboard/protocols"
import { totalLoadKg } from "@/lib/fingerboard/protocols"
import { buildNotes } from "@/lib/fingerboard/notes"
import { cn } from "@/lib/utils"
import type { RecordedSet, WorkoutConfig } from "@/lib/fingerboard/types"

export interface SummaryResult {
    sets: RecordedSet[]
    rpe: number
    performance: string
    notes: string
}

interface WorkoutSummaryProps {
    protocol: ProtocolDefinition
    config: WorkoutConfig
    sets: RecordedSet[]
    elapsedSeconds: number
    onChangeSet: (setIndex: number, changes: Partial<RecordedSet>) => void
    onSave: (result: SummaryResult) => void
    onDiscard: () => void
    isSaving: boolean
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

function WorkoutSummary({
    protocol,
    config,
    sets,
    elapsedSeconds,
    onChangeSet,
    onSave,
    onDiscard,
    isSaving,
}: WorkoutSummaryProps) {
    const [rpe, setRpe] = useState(7)
    const [performance, setPerformance] = useState("normal")
    const [notes, setNotes] = useState(() => buildNotes(protocol, config, sets))

    const minutes = Math.max(1, Math.round(elapsedSeconds / 60))

    return (
        <div className="space-y-7">
            <div>
                <h2 className="font-display text-2xl tracking-tight">Nice work</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {minutes} min · {sets.filter((set) => set.completed).length} of {sets.length} sets
                    completed
                </p>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-border">
                <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">Set</th>
                            <th className="px-4 py-2.5 font-medium">
                                {protocol.mode === "hang" ? "Added" : "Lifted"}
                            </th>
                            <th className="px-4 py-2.5 font-medium">Total</th>
                            <th className="px-4 py-2.5 text-right font-medium">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sets.map((set) => (
                            <tr key={set.setIndex} className="border-b border-border last:border-0">
                                <td className="px-4 py-2.5 tabular-nums">{set.setIndex}</td>
                                <td className="px-4 py-2">
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.5"
                                        aria-label={`Set ${set.setIndex} load`}
                                        value={set.loadKg}
                                        onChange={(event) =>
                                            onChangeSet(set.setIndex, {
                                                loadKg: Number(event.target.value),
                                            })
                                        }
                                        className="h-9 w-24"
                                    />
                                </td>
                                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                                    {totalLoadKg(protocol.mode, config.bodyweightKg, set.loadKg)}kg
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChangeSet(set.setIndex, { completed: !set.completed })
                                        }
                                        className={cn(
                                            "cursor-pointer rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-colors",
                                            set.completed
                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground"
                                        )}
                                    >
                                        {set.completed ? "Completed" : "Failed"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <Label htmlFor="rpe">Session RPE</Label>
                    <span className="font-display text-xl tabular-nums">{rpe}</span>
                </div>
                <Slider
                    id="rpe"
                    min={1}
                    max={10}
                    step={1}
                    value={[rpe]}
                    onValueChange={(value) => setRpe(value[0])}
                />
            </div>

            <div className="space-y-2.5">
                <Label>Performance</Label>
                <ToggleGroup
                    type="single"
                    value={performance}
                    onValueChange={(value) => {
                        if (value) {
                            setPerformance(value)
                        }
                    }}
                    className="flex justify-start gap-2"
                >
                    {PERFORMANCE_VALUES.map((value) => (
                        <ToggleGroupItem key={value} value={value} className="rounded-[10px] px-4">
                            {capitalize(value)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            <div className="space-y-2.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                />
            </div>

            <div className="flex gap-3">
                <Button
                    size="lg"
                    className="flex-1"
                    disabled={isSaving}
                    onClick={() => onSave({ sets, rpe, performance, notes })}
                >
                    {isSaving ? "Saving…" : "Save session"}
                </Button>
                <Button variant="outline" size="lg" disabled={isSaving} onClick={onDiscard}>
                    Discard
                </Button>
            </div>
        </div>
    )
}

export default WorkoutSummary
