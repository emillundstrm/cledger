import { useState, useMemo, useRef } from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronsUpDown, Plus, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { sv } from "react-day-picker/locale"
import type { SessionRequest, InjuryRequest } from "@/api/types"
import {
    SESSION_TYPES,
    PERFORMANCE_VALUES,
    SEVERITY_LEVELS,
    performanceLabel,
    sessionTypeLabel,
} from "@/api/types"
import { fetchVenues, fetchInjuryLocations } from "@/api/sessions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SessionFormProps {
    initialData?: SessionRequest
    onSubmit: (data: SessionRequest) => void
    onCancel: () => void
    submitLabel: string
    isSubmitting?: boolean
}

interface InjuryEntry {
    location: string
    note: string
    severity: string
}

function SessionForm({ initialData, onSubmit, onCancel, submitLabel, isSubmitting }: SessionFormProps) {
    const [date, setDate] = useState<Date>(
        initialData?.date
            ? new Date(initialData.date + "T00:00:00")
            : new Date()
    )
    const [types, setTypes] = useState<string[]>(initialData?.types ?? [])
    const [intensity, setIntensity] = useState<number>(initialData?.intensity ?? 5)
    const [performance, setPerformance] = useState<string>(initialData?.performance ?? "normal")
    const [durationMinutes, setDurationMinutes] = useState<string>(
        initialData?.durationMinutes != null ? String(initialData.durationMinutes) : ""
    )
    const [maxGrade, setMaxGrade] = useState<string>(initialData?.maxGrade ?? "")
    const [venue, setVenue] = useState<string>(initialData?.venue ?? "")
    const [injuries, setInjuries] = useState<InjuryEntry[]>(
        initialData?.injuries?.map((i) => ({
            location: i.location,
            note: i.note ?? "",
            severity: i.severity != null ? String(i.severity) : "",
        })) ?? []
    )
    const [notes, setNotes] = useState<string>(initialData?.notes ?? "")
    const [calendarOpen, setCalendarOpen] = useState(false)

    const { data: venues = [] } = useQuery({
        queryKey: ["venues"],
        queryFn: fetchVenues,
    })

    const { data: injuryLocations = [] } = useQuery({
        queryKey: ["injuryLocations"],
        queryFn: fetchInjuryLocations,
    })

    function addInjury() {
        setInjuries((prev) => [...prev, { location: "", note: "", severity: "" }])
    }

    function removeInjury(index: number) {
        setInjuries((prev) => prev.filter((_, i) => i !== index))
    }

    function updateInjuryLocation(index: number, location: string) {
        setInjuries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, location } : entry))
        )
    }

    function updateInjuryNote(index: number, note: string) {
        setInjuries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, note } : entry))
        )
    }

    function updateInjurySeverity(index: number, severity: string) {
        setInjuries((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, severity } : entry))
        )
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const data: SessionRequest = {
            date: format(date, "yyyy-MM-dd"),
            types,
            intensity,
            performance,
            durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
            maxGrade: maxGrade || null,
            venue: venue || null,
            injuries: injuries
                .filter((i) => i.location.trim() !== "")
                .map((i): InjuryRequest => ({
                    location: i.location.trim(),
                    note: i.note.trim() || null,
                    severity: i.severity ? parseInt(i.severity, 10) : null,
                })),
            notes: notes || null,
        }

        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date */}
            <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
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
                            {format(date, "PPP", { locale: sv })}
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
                            locale={sv}
                            weekStartsOn={1}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Session Types */}
            <div className="space-y-2">
                <Label>Typ av pass</Label>
                <ToggleGroup
                    type="multiple"
                    value={types}
                    onValueChange={setTypes}
                    spacing={2}
                    className="flex flex-wrap"
                >
                    {SESSION_TYPES.map((type) => (
                        <ToggleGroupItem
                            key={type}
                            value={type}
                            variant="outline"
                            aria-label={sessionTypeLabel(type)}
                            className="type-chip h-auto px-4 py-2 text-[13px]"
                            style={{ "--chip-c": `var(--t-${type})` } as React.CSSProperties}
                        >
                            {sessionTypeLabel(type)}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {/* Intensity (RPE 1-10) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Intensitet (RPE)</Label>
                    <span className="rounded-full bg-primary px-3 py-0.5 text-[13px] font-bold tabular-nums text-primary-foreground">
                        {intensity}
                    </span>
                </div>
                <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[intensity]}
                    onValueChange={([v]) => setIntensity(v)}
                    aria-label="Intensitet RPE"
                />
                <div className="flex justify-between text-[11px] text-dim">
                    <span>Lätt</span>
                    <span>Max</span>
                </div>
            </div>

            {/* Performance */}
            <div className="space-y-2">
                <Label>Prestation</Label>
                <RadioGroup
                    value={performance}
                    onValueChange={setPerformance}
                    className="inline-flex gap-0.5 rounded-xl border border-border bg-card p-[3px]"
                >
                    {PERFORMANCE_VALUES.map((value) => (
                        <Label
                            key={value}
                            className="cursor-pointer rounded-[9px] px-4.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground has-data-[state=checked]:bg-accent has-data-[state=checked]:text-foreground has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                        >
                            <RadioGroupItem value={value} className="sr-only" />
                            {performanceLabel(value)}
                        </Label>
                    ))}
                </RadioGroup>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="duration">Längd (min)</Label>
                    <Input
                        id="duration"
                        type="number"
                        min={0}
                        placeholder="t.ex. 90"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxGrade">Maxgrad</Label>
                    <Input
                        id="maxGrade"
                        type="text"
                        placeholder="t.ex. 7A"
                        value={maxGrade}
                        onChange={(e) => setMaxGrade(e.target.value)}
                    />
                </div>
            </div>

            {/* Venue */}
            <div className="space-y-2">
                <Label htmlFor="venue">Plats</Label>
                <CreatableCombobox
                    id="venue"
                    value={venue}
                    onChange={setVenue}
                    options={venues}
                    placeholder="Välj eller skriv en plats…"
                    searchPlaceholder="Sök platser…"
                    emptyText="Inga platser hittades."
                />
            </div>

            {/* Injuries */}
            <div className="space-y-3">
                <Label>Skador</Label>
                {injuries.map((injury, index) => (
                    <InjuryEntryRow
                        key={index}
                        injury={injury}
                        index={index}
                        injuryLocations={injuryLocations}
                        onLocationChange={(loc) => updateInjuryLocation(index, loc)}
                        onNoteChange={(note) => updateInjuryNote(index, note)}
                        onSeverityChange={(sev) => updateInjurySeverity(index, sev)}
                        onRemove={() => removeInjury(index)}
                    />
                ))}
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addInjury}>
                    <Plus className="mr-1 h-4 w-4" />
                    Lägg till skada
                </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar</Label>
                <Textarea
                    id="notes"
                    placeholder="Hur gick passet?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button type="submit" size="lg" disabled={isSubmitting || types.length === 0}>
                    {isSubmitting ? "Sparar…" : submitLabel}
                </Button>
                <Button type="button" variant="outline" size="lg" className="rounded-full text-muted-foreground" onClick={onCancel}>
                    Avbryt
                </Button>
            </div>
        </form>
    )
}

function CreatableCombobox({
    id,
    "aria-label": ariaLabel,
    value,
    onChange,
    options,
    placeholder,
    searchPlaceholder,
    emptyText,
}: {
    id?: string
    "aria-label"?: string
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder: string
    searchPlaceholder: string
    emptyText: string
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const filtered = useMemo(() => {
        if (!search) {
            return options
        }
        const s = search.toLowerCase()
        return options.filter((option) => option.toLowerCase().includes(s))
    }, [options, search])

    const trimmedSearch = search.trim()
    const canCreate = trimmedSearch !== ""
        && !options.some((option) => option.toLowerCase() === trimmedSearch.toLowerCase())

    function select(next: string) {
        onChange(next)
        setOpen(false)
        setSearch("")
    }

    // Typing on the closed trigger opens the list with that key as the start of the search
    function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
        if (open || e.ctrlKey || e.metaKey || e.altKey) {
            return
        }
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
        } else if (e.key.length === 1 && e.key !== " ") {
            e.preventDefault()
            setSearch(e.key)
            setOpen(true)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={ariaLabel}
                    className="w-full justify-between font-normal"
                    onKeyDown={handleTriggerKeyDown}
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                onOpenAutoFocus={(e) => {
                    // Keep the caret after a key typed on the trigger, so the next key appends to it
                    e.preventDefault()
                    const input = inputRef.current
                    if (input) {
                        input.focus()
                        input.setSelectionRange(input.value.length, input.value.length)
                    }
                }}
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        ref={inputRef}
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {filtered.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={() => select(option)}
                                >
                                    {option}
                                </CommandItem>
                            ))}
                            {canCreate && (
                                <CommandItem
                                    value={`__create__${trimmedSearch}`}
                                    onSelect={() => select(trimmedSearch)}
                                >
                                    Använd ”{trimmedSearch}”
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

function InjuryEntryRow({
    injury,
    index,
    injuryLocations,
    onLocationChange,
    onNoteChange,
    onSeverityChange,
    onRemove,
}: {
    injury: InjuryEntry
    index: number
    injuryLocations: string[]
    onLocationChange: (location: string) => void
    onNoteChange: (note: string) => void
    onSeverityChange: (severity: string) => void
    onRemove: () => void
}) {
    return (
        <div className="flex gap-2 items-start">
            <div className="flex-1">
                <CreatableCombobox
                    aria-label={`Skada ${index + 1} kroppsdel`}
                    value={injury.location}
                    onChange={onLocationChange}
                    options={injuryLocations}
                    placeholder="Välj eller skriv kroppsdel…"
                    searchPlaceholder="Sök kroppsdelar…"
                    emptyText="Inga kroppsdelar hittades."
                />
            </div>
            <div className="w-36">
                <Select
                    value={injury.severity}
                    onValueChange={onSeverityChange}
                >
                    <SelectTrigger aria-label={`Skada ${index + 1} allvarlighetsgrad`}>
                        <SelectValue placeholder="Allvarlighetsgrad" />
                    </SelectTrigger>
                    <SelectContent>
                        {SEVERITY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={String(level.value)}>
                                {level.value} - {level.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1">
                <Input
                    type="text"
                    placeholder="Anteckning (valfritt)"
                    value={injury.note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    aria-label={`Skada ${index + 1} anteckning`}
                />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Ta bort skada ${index + 1}`}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}

export default SessionForm
