import { useState, useMemo } from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronsUpDown, Plus, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { SessionRequest, InjuryRequest } from "@/api/types"
import {
    SESSION_TYPES,
    INTENSITY_VALUES,
    PERFORMANCE_VALUES,
    PRODUCTIVITY_VALUES,
} from "@/api/types"
import { fetchVenues, fetchInjuryLocations } from "@/api/sessions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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

interface InjuryEntry {
    location: string
    note: string
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
    const [venue, setVenue] = useState<string>(initialData?.venue ?? "")
    const [venueOpen, setVenueOpen] = useState(false)
    const [venueSearch, setVenueSearch] = useState("")
    const [injuries, setInjuries] = useState<InjuryEntry[]>(
        initialData?.injuries?.map((i) => ({ location: i.location, note: i.note ?? "" })) ?? []
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

    const filteredVenues = useMemo(() => {
        if (!venueSearch) {
            return venues
        }
        const search = venueSearch.toLowerCase()
        return venues.filter((v) => v.toLowerCase().includes(search))
    }, [venues, venueSearch])

    function addInjury() {
        setInjuries((prev) => [...prev, { location: "", note: "" }])
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
            venue: venue || null,
            injuries: injuries
                .filter((i) => i.location.trim() !== "")
                .map((i): InjuryRequest => ({
                    location: i.location.trim(),
                    note: i.note.trim() || null,
                })),
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
                    className="flex flex-wrap"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Venue */}
            <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Popover open={venueOpen} onOpenChange={setVenueOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="venue"
                            variant="outline"
                            role="combobox"
                            aria-expanded={venueOpen}
                            className="w-full justify-between font-normal"
                        >
                            {venue || "Select or type a venue..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search venues..."
                                value={venueSearch}
                                onValueChange={setVenueSearch}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {venueSearch ? (
                                        <button
                                            type="button"
                                            className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent cursor-pointer"
                                            onClick={() => {
                                                setVenue(venueSearch)
                                                setVenueOpen(false)
                                                setVenueSearch("")
                                            }}
                                        >
                                            Use &quot;{venueSearch}&quot;
                                        </button>
                                    ) : (
                                        "No venues found."
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {filteredVenues.map((v) => (
                                        <CommandItem
                                            key={v}
                                            value={v}
                                            onSelect={() => {
                                                setVenue(v)
                                                setVenueOpen(false)
                                                setVenueSearch("")
                                            }}
                                        >
                                            {v}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Injuries */}
            <div className="space-y-3">
                <Label>Injuries</Label>
                {injuries.map((injury, index) => (
                    <InjuryEntryRow
                        key={index}
                        injury={injury}
                        index={index}
                        injuryLocations={injuryLocations}
                        onLocationChange={(loc) => updateInjuryLocation(index, loc)}
                        onNoteChange={(note) => updateInjuryNote(index, note)}
                        onRemove={() => removeInjury(index)}
                    />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addInjury}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Injury
                </Button>
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

function InjuryEntryRow({
    injury,
    index,
    injuryLocations,
    onLocationChange,
    onNoteChange,
    onRemove,
}: {
    injury: InjuryEntry
    index: number
    injuryLocations: string[]
    onLocationChange: (location: string) => void
    onNoteChange: (note: string) => void
    onRemove: () => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    const filtered = useMemo(() => {
        if (!search) {
            return injuryLocations
        }
        const s = search.toLowerCase()
        return injuryLocations.filter((loc) => loc.toLowerCase().includes(s))
    }, [injuryLocations, search])

    return (
        <div className="flex gap-2 items-start">
            <div className="flex-1">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            aria-label={`Injury ${index + 1} location`}
                            className="w-full justify-between font-normal"
                        >
                            {injury.location || "Select or type location..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search locations..."
                                value={search}
                                onValueChange={setSearch}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {search ? (
                                        <button
                                            type="button"
                                            className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent cursor-pointer"
                                            onClick={() => {
                                                onLocationChange(search)
                                                setOpen(false)
                                                setSearch("")
                                            }}
                                        >
                                            Use &quot;{search}&quot;
                                        </button>
                                    ) : (
                                        "No locations found."
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {filtered.map((loc) => (
                                        <CommandItem
                                            key={loc}
                                            value={loc}
                                            onSelect={() => {
                                                onLocationChange(loc)
                                                setOpen(false)
                                                setSearch("")
                                            }}
                                        >
                                            {loc}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex-1">
                <Input
                    type="text"
                    placeholder="Note (optional)"
                    value={injury.note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    aria-label={`Injury ${index + 1} note`}
                />
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Remove injury ${index + 1}`}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}

export default SessionForm
