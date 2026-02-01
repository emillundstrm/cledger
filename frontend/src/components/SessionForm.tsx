import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { SessionRequest } from "@/api/types"
import {
    SESSION_TYPES,
    INTENSITY_VALUES,
    PERFORMANCE_VALUES,
    PRODUCTIVITY_VALUES,
    PAIN_FLAG_LOCATIONS,
} from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

interface SessionFormProps {
    initialData?: SessionRequest
    onSubmit: (data: SessionRequest) => void
    onCancel: () => void
    submitLabel: string
    isSubmitting?: boolean
}

function SessionForm({ initialData, onSubmit, onCancel, submitLabel, isSubmitting }: SessionFormProps) {
    const [date, setDate] = useState<Date>(
        initialData?.date
            ? new Date(initialData.date + "T00:00:00")
            : new Date()
    )
    const [types, setTypes] = useState<string[]>(initialData?.types ?? [])
    const [intensity, setIntensity] = useState<string>(initialData?.intensity ?? "moderate")
    const [performance, setPerformance] = useState<string>(initialData?.performance ?? "normal")
    const [productivity, setProductivity] = useState<string>(initialData?.productivity ?? "normal")
    const [durationMinutes, setDurationMinutes] = useState<string>(
        initialData?.durationMinutes != null ? String(initialData.durationMinutes) : ""
    )
    const [maxGrade, setMaxGrade] = useState<string>(initialData?.maxGrade ?? "")
    const [hardAttempts, setHardAttempts] = useState<string>(
        initialData?.hardAttempts != null ? String(initialData.hardAttempts) : ""
    )
    const [painFlags, setPainFlags] = useState<string[]>(initialData?.painFlags ?? [])
    const [notes, setNotes] = useState<string>(initialData?.notes ?? "")
    const [calendarOpen, setCalendarOpen] = useState(false)

    function togglePainFlag(location: string) {
        setPainFlags((prev) =>
            prev.includes(location)
                ? prev.filter((f) => f !== location)
                : [...prev, location]
        )
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const data: SessionRequest = {
            date: format(date, "yyyy-MM-dd"),
            types,
            intensity,
            performance,
            productivity,
            durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
            maxGrade: maxGrade || null,
            hardAttempts: hardAttempts ? parseInt(hardAttempts, 10) : null,
            painFlags,
            notes: notes || null,
        }

        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(date, "PPP")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => {
                                if (d) {
                                    setDate(d)
                                }
                                setCalendarOpen(false)
                            }}
                            defaultMonth={date}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Session Types */}
            <div className="space-y-2">
                <Label>Session Types</Label>
                <ToggleGroup
                    type="multiple"
                    value={types}
                    onValueChange={setTypes}
                    className="flex flex-wrap gap-2"
                >
                    {SESSION_TYPES.map((type) => (
                        <ToggleGroupItem
                            key={type}
                            value={type}
                            variant="outline"
                            aria-label={capitalize(type)}
                        >
                            {capitalize(type)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
                <Label>Intensity</Label>
                <RadioGroup
                    value={intensity}
                    onValueChange={setIntensity}
                    className="flex gap-4"
                >
                    {INTENSITY_VALUES.map((value) => (
                        <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`intensity-${value}`} />
                            <Label htmlFor={`intensity-${value}`} className="font-normal cursor-pointer">
                                {capitalize(value)}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Performance */}
            <div className="space-y-2">
                <Label>Performance</Label>
                <RadioGroup
                    value={performance}
                    onValueChange={setPerformance}
                    className="flex gap-4"
                >
                    {PERFORMANCE_VALUES.map((value) => (
                        <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`performance-${value}`} />
                            <Label htmlFor={`performance-${value}`} className="font-normal cursor-pointer">
                                {capitalize(value)}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Productivity */}
            <div className="space-y-2">
                <Label>Productivity</Label>
                <RadioGroup
                    value={productivity}
                    onValueChange={setProductivity}
                    className="flex gap-4"
                >
                    {PRODUCTIVITY_VALUES.map((value) => (
                        <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`productivity-${value}`} />
                            <Label htmlFor={`productivity-${value}`} className="font-normal cursor-pointer">
                                {capitalize(value)}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                        id="duration"
                        type="number"
                        min={0}
                        placeholder="e.g. 90"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxGrade">Max Grade</Label>
                    <Input
                        id="maxGrade"
                        type="text"
                        placeholder="e.g. 7A"
                        value={maxGrade}
                        onChange={(e) => setMaxGrade(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hardAttempts">Hard Attempts</Label>
                    <Input
                        id="hardAttempts"
                        type="number"
                        min={0}
                        placeholder="e.g. 5"
                        value={hardAttempts}
                        onChange={(e) => setHardAttempts(e.target.value)}
                    />
                </div>
            </div>

            {/* Pain Flags */}
            <div className="space-y-2">
                <Label>Pain Flags</Label>
                <div className="flex gap-4">
                    {PAIN_FLAG_LOCATIONS.map((location) => (
                        <div key={location} className="flex items-center gap-2">
                            <Checkbox
                                id={`pain-${location}`}
                                checked={painFlags.includes(location)}
                                onCheckedChange={() => togglePainFlag(location)}
                            />
                            <Label htmlFor={`pain-${location}`} className="font-normal cursor-pointer">
                                {capitalize(location)}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="How did the session go?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting || types.length === 0}>
                    {isSubmitting ? "Saving..." : submitLabel}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}

export default SessionForm
