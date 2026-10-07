import { useState, useMemo, useRef, type ReactNode } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormActions, FormError, FormField, FormLayout } from "@/components/system/Form"
import { SegmentedControl } from "@/components/system/SegmentedControl"
import { cn } from "@/lib/utils"

const PERFORMANCE_OPTIONS = PERFORMANCE_VALUES.map((value) => ({ value, label: performanceLabel(value) }))

// Location, severity, note and the remove button, shared by the column labels and each injury row
const INJURY_GRID = "grid grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_2.25rem] gap-2"

interface SessionFormProps {
    initialData?: SessionRequest
    /** A save error from the page, shown directly above the buttons. */
    error?: ReactNode
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

function SessionForm({ initialData, error, onSubmit, onCancel, submitLabel, isSubmitting }: SessionFormProps) {
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

    // At least one type is required; say so when saving is tried, rather than
    // disabling the button without a reason.
    const [attempted, setAttempted] = useState(false)
    const typesError = attempted && types.length === 0 ? "Välj minst en typ av pass." : undefined

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAttempted(true)
        if (types.length === 0) {
            return
        }

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
        <FormLayout onSubmit={handleSubmit}>
            <FormField label="Datum" htmlFor="date">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            type="button"
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
            </FormField>

            <FormField label="Typ av pass" error={typesError}>
                <ToggleGroup
                    type="multiple"
                    value={types}
                    onValueChange={setTypes}
                    spacing={2}
                    className="flex flex-wrap"
                    aria-label="Typ av pass"
                    aria-invalid={typesError !== undefined}
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
            </FormField>

            {/* Intensity (RPE 1-10). The value is a neutral Wash pill, never ember. */}
            <FormField
                label={
                    <span className="flex items-center justify-between">
                        <span>Intensitet (RPE)</span>
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                            {intensity}
                        </span>
                    </span>
                }
            >
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
            </FormField>

            <FormField label="Prestation">
                <SegmentedControl
                    aria-label="Prestation"
                    value={performance}
                    onChange={setPerformance}
                    options={PERFORMANCE_OPTIONS}
                />
            </FormField>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                <FormField label="Längd (min)" htmlFor="duration">
                    <Input
                        id="duration"
                        type="number"
                        min={0}
                        placeholder="t.ex. 90"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                </FormField>
                <FormField label="Maxgrad" htmlFor="maxGrade">
                    <Input
                        id="maxGrade"
                        type="text"
                        placeholder="t.ex. 7A"
                        value={maxGrade}
                        onChange={(e) => setMaxGrade(e.target.value)}
                    />
                </FormField>
            </div>

            <FormField label="Plats" htmlFor="venue">
                <CreatableCombobox
                    id="venue"
                    value={venue}
                    onChange={setVenue}
                    options={venues}
                    placeholder="Välj eller skriv en plats…"
                    searchPlaceholder="Sök platser…"
                    emptyText="Inga platser hittades."
                />
            </FormField>

            <FormField label="Skador">
                {injuries.length > 0 && (
                    <div className="space-y-2">
                        {/* Visible column labels; each control also carries its own accessible name */}
                        <div aria-hidden="true" className={cn(INJURY_GRID, "text-xs font-medium text-muted-foreground")}>
                            <span>Kroppsdel</span>
                            <span>Allvarlighetsgrad</span>
                            <span>Anteckning</span>
                        </div>
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
                    </div>
                )}
                <div>
                    <Button type="button" variant="outline" onClick={addInjury}>
                        <Plus className="mr-1 h-4 w-4" />
                        Lägg till skada
                    </Button>
                </div>
            </FormField>

            <FormField label="Anteckningar" htmlFor="notes">
                <Textarea
                    id="notes"
                    placeholder="Hur gick passet?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </FormField>

            {error && <FormError>{error}</FormError>}

            <FormActions>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sparar…" : submitLabel}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Avbryt
                </Button>
            </FormActions>
        </FormLayout>
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
        <div className={cn(INJURY_GRID, "items-start")}>
            <div className="min-w-0">
                <CreatableCombobox
                    aria-label={`Skada ${index + 1} kroppsdel`}
                    value={injury.location}
                    onChange={onLocationChange}
                    options={injuryLocations}
                    placeholder="Välj eller skriv…"
                    searchPlaceholder="Sök kroppsdelar…"
                    emptyText="Inga kroppsdelar hittades."
                />
            </div>
            <div className="min-w-0">
                <Select
                    value={injury.severity}
                    onValueChange={onSeverityChange}
                >
                    <SelectTrigger aria-label={`Skada ${index + 1} allvarlighetsgrad`}>
                        <SelectValue placeholder="Välj" />
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
            <div className="min-w-0">
                <Input
                    type="text"
                    placeholder="Valfritt"
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
