import { useId, useState, useMemo, useRef, type ReactNode } from "react"
import { format, subDays } from "date-fns"
import { CalendarIcon, ChevronsUpDown, Plus, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { sv } from "react-day-picker/locale"
import type { SessionRequest, InjuryRequest, PlanCategory } from "@/api/types"
import {
    SESSION_TYPES,
    PERFORMANCE_VALUES,
    SEVERITY_LEVELS,
    PLAN_CATEGORY_LABELS,
    performanceLabel,
    sessionTypeLabel,
} from "@/api/types"
import { fetchVenues, fetchInjuryLocations } from "@/api/sessions"
import { fetchCurrentPlanWeek } from "@/api/plans"
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
import { fieldErrorId } from "@/components/system/fieldErrorId"
import { SegmentedControl } from "@/components/system/SegmentedControl"
import { ChoiceChip } from "@/components/system/ChoiceChip"
import { pickableEntries, type PickableEntry } from "@/lib/plans/week"
import { LOCALE } from "@/lib/locale"
import { cn } from "@/lib/utils"

const PERFORMANCE_OPTIONS = PERFORMANCE_VALUES.map((value) => ({ value, label: performanceLabel(value) }))

// Session types where a max grade means something; for the rest the field is hidden
const GRADED_TYPES: readonly string[] = ["boulder", "routes", "board"]

/** A distance in km as typed, with a comma or a point: null when blank or not a positive number. */
function parseDistance(value: string): number | null {
    const km = Number(value.trim().replace(",", "."))
    return value.trim() !== "" && Number.isFinite(km) && km > 0 ? Math.round(km * 100) / 100 : null
}

// Location, severity, note and the remove button, shared by the column labels and each injury row
const INJURY_GRID = "grid grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_2.25rem] gap-2"

interface SessionFormProps {
    initialData?: SessionRequest
    /**
     * Values carried over from the last session for a new one. They may arrive
     * after the form mounts, and never overwrite what has been typed meanwhile.
     */
    defaults?: { venue: string | null }
    /** The session being edited, so its own links show as picked. */
    sessionId?: string
    /** Planned items to start picked, e.g. the one tapped on the plan page. */
    initialPlanEntryIds?: string[]
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

function SessionForm({
    initialData,
    defaults,
    sessionId,
    initialPlanEntryIds = [],
    error,
    onSubmit,
    onCancel,
    submitLabel,
    isSubmitting,
}: SessionFormProps) {
    const [date, setDate] = useState<Date>(
        initialData?.date
            ? new Date(initialData.date + "T00:00:00")
            : new Date()
    )
    const [types, setTypes] = useState<string[]>(initialData?.types ?? [])
    const [intensity, setIntensity] = useState<number>(initialData?.intensity ?? 5)
    const [performance, setPerformance] = useState<string>(initialData?.performance ?? "normal")
    const [durationMinutes, setDurationMinutes] = useState<string>(
        // A new session defaults to an hour: hall sessions are rarely shorter
        initialData ? (initialData.durationMinutes != null ? String(initialData.durationMinutes) : "") : "60"
    )
    const [maxGrade, setMaxGrade] = useState<string>(initialData?.maxGrade ?? "")
    const [distance, setDistance] = useState<string>(
        initialData?.distanceKm != null ? initialData.distanceKm.toLocaleString(LOCALE) : ""
    )
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
    // Injuries are rare, so they start as a quiet "+" link. Notes stay open:
    // nearly every session gets one.
    const [focusNewInjury, setFocusNewInjury] = useState(false)

    // Apply the defaults once, when they arrive, to fields still left empty
    const [defaultsApplied, setDefaultsApplied] = useState(false)
    if (defaults && !defaultsApplied) {
        setDefaultsApplied(true)
        if (venue === "" && defaults.venue) {
            setVenue(defaults.venue)
        }
    }

    // The plan week the session's date falls in. The picker follows the date,
    // so moving a session to another week offers that week's items instead.
    const dateKey = format(date, "yyyy-MM-dd")
    const planWeekQuery = useQuery({
        queryKey: ["planWeek", dateKey],
        queryFn: () => fetchCurrentPlanWeek(dateKey),
    })
    const planEntries = planWeekQuery.data ? pickableEntries(planWeekQuery.data, sessionId) : []
    // Only what the user changed; everything else is picked if it was linked or preselected.
    const [planToggles, setPlanToggles] = useState<Record<string, boolean>>({})
    function isPicked(entry: PickableEntry): boolean {
        return planToggles[entry.entryId] ?? (entry.linked || initialPlanEntryIds.includes(entry.entryId))
    }

    function addTypes(extra: string[]) {
        setTypes((prev) => [...prev, ...extra.filter((t) => !prev.includes(t))])
    }

    function togglePlanEntry(entry: PickableEntry) {
        const picked = !isPicked(entry)
        setPlanToggles((prev) => ({ ...prev, [entry.entryId]: picked }))
        if (picked) {
            addTypes(entry.sessionTypes)
        }
    }

    // A new session started from a planned item takes that item's types, once they load
    const [preselectApplied, setPreselectApplied] = useState(initialData !== undefined)
    if (!preselectApplied && planWeekQuery.data) {
        setPreselectApplied(true)
        addTypes(planEntries.filter((e) => initialPlanEntryIds.includes(e.entryId)).flatMap((e) => e.sessionTypes))
    }

    // Shown while it holds a value, so an old grade on any session type stays visible
    const showGrade = types.some((t) => GRADED_TYPES.includes(t)) || maxGrade !== ""
    // Likewise for a distance, which only runs have
    const showDistance = types.includes("running") || distance !== ""

    const { data: venues = [] } = useQuery({
        queryKey: ["venues"],
        queryFn: fetchVenues,
    })

    const { data: injuryLocations = [] } = useQuery({
        queryKey: ["injuryLocations"],
        queryFn: fetchInjuryLocations,
    })

    function addInjury() {
        setFocusNewInjury(true)
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
    const distanceError =
        attempted && distance.trim() !== "" && parseDistance(distance) === null ? "Ange sträckan i km, t.ex. 8,5." : undefined

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAttempted(true)
        if (types.length === 0 || (distance.trim() !== "" && parseDistance(distance) === null)) {
            return
        }

        const data: SessionRequest = {
            date: format(date, "yyyy-MM-dd"),
            types,
            intensity,
            performance,
            durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
            maxGrade: maxGrade || null,
            distanceKm: parseDistance(distance),
            venue: venue || null,
            injuries: injuries
                .filter((i) => i.location.trim() !== "")
                .map((i): InjuryRequest => ({
                    location: i.location.trim(),
                    note: i.note.trim() || null,
                    severity: i.severity ? parseInt(i.severity, 10) : null,
                })),
            notes: notes || null,
            // Left out until the week has loaded, so a failed load never unlinks anything
            plan: planWeekQuery.isSuccess
                ? {
                    offered: planEntries.map((e) => e.entryId),
                    selected: planEntries.filter(isPicked).map((e) => e.entryId),
                }
                : undefined,
        }

        onSubmit(data)
    }

    return (
        <FormLayout onSubmit={handleSubmit}>
            <FormField label="Datum" htmlFor="date">
                <div className="flex gap-2">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                type="button"
                                variant="field"
                                className="min-w-0 flex-1 justify-start"
                            >
                                <CalendarIcon className="text-muted-foreground" />
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
                    {/* Shortcuts for the two dates nearly every session has. Always shown, so a
                        click never makes the button under the pointer move or vanish. */}
                    <Button type="button" variant="outline" className="h-11" onClick={() => setDate(new Date())}>
                        Idag
                    </Button>
                    <Button type="button" variant="outline" className="h-11" onClick={() => setDate(subDays(new Date(), 1))}>
                        Igår
                    </Button>
                </div>
            </FormField>

            {planEntries.length > 0 && (
                <FormField label="Från veckans plan">
                    <div role="group" aria-label="Från veckans plan" className="flex flex-wrap gap-2">
                        {planEntries.map((entry) => (
                            <ChoiceChip
                                key={entry.entryId}
                                pressed={isPicked(entry)}
                                onClick={() => togglePlanEntry(entry)}
                                className="min-h-9 px-4 text-[13px]"
                                title={categoryLabel(entry.category)}
                            >
                                {entry.title}
                                {entry.count > 1 && (
                                    <span className="text-dim">{entry.open} av {entry.count} kvar</span>
                                )}
                            </ChoiceChip>
                        ))}
                    </div>
                </FormField>
            )}

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
                {showGrade && (
                    <FormField label="Maxgrad" htmlFor="maxGrade">
                        <Input
                            id="maxGrade"
                            type="text"
                            placeholder="t.ex. 7A"
                            value={maxGrade}
                            onChange={(e) => setMaxGrade(e.target.value)}
                        />
                    </FormField>
                )}
                {showDistance && (
                    <FormField label="Sträcka (km)" htmlFor="distance" error={distanceError}>
                        <Input
                            id="distance"
                            type="text"
                            inputMode="decimal"
                            placeholder="t.ex. 8,5"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            aria-invalid={distanceError !== undefined}
                            aria-describedby={distanceError ? fieldErrorId("distance") : undefined}
                        />
                    </FormField>
                )}
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

            {injuries.length > 0 && (
                <FormField label="Skador">
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
                                autoFocus={focusNewInjury && index === injuries.length - 1}
                                onLocationChange={(loc) => updateInjuryLocation(index, loc)}
                                onNoteChange={(note) => updateInjuryNote(index, note)}
                                onSeverityChange={(sev) => updateInjurySeverity(index, sev)}
                                onRemove={() => removeInjury(index)}
                            />
                        ))}
                    </div>
                    <div>
                        <Button type="button" variant="outline" onClick={addInjury}>
                            <Plus />
                            Lägg till skada
                        </Button>
                    </div>
                </FormField>
            )}

            {injuries.length === 0 && (
                <div>
                    <AddSectionLink label="Lägg till skada" onClick={addInjury}>Skada</AddSectionLink>
                </div>
            )}

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

function categoryLabel(category: PlanCategory): string {
    return PLAN_CATEGORY_LABELS[category] ?? category
}

/** A quiet text link that opens an optional part of the form (DESIGN.md: Forms). */
function AddSectionLink({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
        >
            <Plus aria-hidden="true" className="size-4" />
            {children}
        </button>
    )
}

function CreatableCombobox({
    id,
    "aria-label": ariaLabel,
    autoFocus,
    value,
    onChange,
    options,
    placeholder,
    searchPlaceholder,
    emptyText,
}: {
    id?: string
    autoFocus?: boolean
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
                    variant="field"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={ariaLabel}
                    autoFocus={autoFocus}
                    onKeyDown={handleTriggerKeyDown}
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground" />
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
    autoFocus,
    onLocationChange,
    onNoteChange,
    onSeverityChange,
    onRemove,
}: {
    injury: InjuryEntry
    index: number
    injuryLocations: string[]
    /** Focus the body-part picker on mount: the row was just added by hand. */
    autoFocus: boolean
    onLocationChange: (location: string) => void
    onNoteChange: (note: string) => void
    onSeverityChange: (severity: string) => void
    onRemove: () => void
}) {
    // The level's name alone ("Måttlig") doesn't say what it means for training
    const hintId = useId()
    const level = SEVERITY_LEVELS.find((l) => String(l.value) === injury.severity)

    return (
        <div className="space-y-1.5">
            <div className={cn(INJURY_GRID, "items-start")}>
                <div className="min-w-0">
                    <CreatableCombobox
                        aria-label={`Skada ${index + 1} kroppsdel`}
                        autoFocus={autoFocus}
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
                        <SelectTrigger
                            className="w-full"
                            aria-label={`Skada ${index + 1} allvarlighetsgrad`}
                            aria-describedby={level ? hintId : undefined}
                        >
                            <SelectValue placeholder="Välj" />
                        </SelectTrigger>
                        <SelectContent>
                            {SEVERITY_LEVELS.map((l) => (
                                <SelectItem key={l.value} value={String(l.value)}>
                                    {l.value} – {l.name}
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
            {level && (
                <p id={hintId} className="text-xs text-muted-foreground">
                    {level.name}: {level.description}.
                </p>
            )}
        </div>
    )
}

export default SessionForm
