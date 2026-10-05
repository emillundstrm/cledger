import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchJournalEntries } from "@/api/journal"
import { fetchSessions } from "@/api/sessions"
import type { JournalEntry } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import JournalEntryCard, { DayHeading } from "@/components/journal/JournalEntryCard"
import JournalEntryForm from "@/components/journal/JournalEntryForm"
import { useJournalMutations } from "@/components/journal/useJournalMutations"
import { daysAgoLocal } from "@/lib/dates"

const PAGE_DAYS = 30

function groupByDay(entries: JournalEntry[]): [string, JournalEntry[]][] {
    const groups = new Map<string, JournalEntry[]>()
    for (const entry of entries) {
        const day = groups.get(entry.entryDate) ?? []
        day.push(entry)
        groups.set(entry.entryDate, day)
    }
    return [...groups.entries()]
}

function JournalPage() {
    const [daysBack, setDaysBack] = useState(PAGE_DAYS)
    const [showArchived, setShowArchived] = useState(false)
    const from = daysAgoLocal(daysBack)
    const { create, update, archive, remove, isError } = useJournalMutations()

    const entriesQuery = useQuery({
        queryKey: ["journal", { from, showArchived }],
        queryFn: () => fetchJournalEntries(from, showArchived),
        placeholderData: (previous) => previous,
    })

    const { data: sessions } = useQuery({
        queryKey: ["sessions"],
        queryFn: fetchSessions,
    })

    const entries = entriesQuery.data ?? []
    const tagSuggestions = [...new Set(entries.flatMap((e) => e.tags))].sort()
    const sessionsByDate = new Map<string, string[]>()
    for (const session of sessions ?? []) {
        sessionsByDate.set(session.date, [...(sessionsByDate.get(session.date) ?? []), session.id])
    }

    return (
        <div className="space-y-6">
            <h2 className="font-display text-4xl">Dagbok</h2>

            <Card className="rounded-[14px] px-1 py-4">
                <CardContent>
                    <JournalEntryForm
                        idPrefix="new-entry"
                        tagSuggestions={tagSuggestions}
                        submitLabel="Spara inlägg"
                        isPending={create.isPending}
                        onSubmit={(data) => create.mutate(data)}
                    />
                    {create.isError && <p className="mt-2 text-destructive">Kunde inte spara inlägget.</p>}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Visa arkiverade
                </label>
            </div>

            {isError && <p className="text-destructive">Kunde inte uppdatera inlägget.</p>}
            {entriesQuery.isLoading && <p className="text-muted-foreground">Laddar dagboken…</p>}
            {entriesQuery.isError && <p className="text-destructive">Kunde inte ladda dagboken.</p>}

            {entriesQuery.data && entries.length === 0 && (
                <p className="text-muted-foreground">Inga inlägg de senaste {daysBack} dagarna.</p>
            )}

            <div className="space-y-8">
                {groupByDay(entries).map(([date, dayEntries]) => (
                    <section key={date} className="space-y-3">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                            <DayHeading date={date} />
                            {(sessionsByDate.get(date) ?? []).map((sessionId, i) => (
                                <Link
                                    key={sessionId}
                                    to={`/sessions/${sessionId}/edit`}
                                    className="text-xs text-primary"
                                >
                                    Träningspass{i > 0 ? ` ${i + 1}` : ""} →
                                </Link>
                            ))}
                        </div>
                        {dayEntries.map((entry) => (
                            <JournalEntryCard
                                key={entry.id}
                                entry={entry}
                                tagSuggestions={tagSuggestions}
                                onSave={(data) => update.mutate({ id: entry.id, data })}
                                onArchive={(archived) => archive.mutate({ id: entry.id, archived })}
                                onDelete={() => remove.mutate(entry.id)}
                            />
                        ))}
                    </section>
                ))}
            </div>

            {entriesQuery.data && (
                <Button
                    variant="outline"
                    disabled={entriesQuery.isFetching}
                    onClick={() => setDaysBack(daysBack + PAGE_DAYS)}
                >
                    Visa äldre
                </Button>
            )}
        </div>
    )
}

export default JournalPage
