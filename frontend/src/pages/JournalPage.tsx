import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { fetchJournalEntries } from "@/api/journal"
import { fetchSessions } from "@/api/sessions"
import type { JournalEntry } from "@/api/types"
import { Button } from "@/components/ui/button"
import JournalEntryRow from "@/components/journal/JournalEntryRow"
import { formatDay } from "@/components/journal/format"
import JournalEntryForm from "@/components/journal/JournalEntryForm"
import { useJournalMutations } from "@/components/journal/useJournalMutations"
import { ChoiceChip } from "@/components/system/ChoiceChip"
import { PageHeader } from "@/components/system/PageHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/system/States"
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
    const { create, update, archive, remove, failedFor } = useJournalMutations()

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
        <div className="space-y-7">
            <PageHeader title="Dagbok" />

            <JournalEntryForm
                idPrefix="new-entry"
                tagSuggestions={tagSuggestions}
                contentLabel="Nytt inlägg"
                submitLabel="Spara inlägg"
                isPending={create.isPending}
                error={create.isError ? "Kunde inte spara inlägget." : undefined}
                onSubmit={async (data) => {
                    await create.mutateAsync(data)
                }}
            />

            <div className="flex justify-end">
                <ChoiceChip pressed={showArchived} onClick={() => setShowArchived(!showArchived)}>
                    Visa arkiverade
                </ChoiceChip>
            </div>

            {entriesQuery.isLoading && <LoadingState>Laddar dagboken…</LoadingState>}
            {entriesQuery.isError && (
                <ErrorState onRetry={() => entriesQuery.refetch()}>Kunde inte ladda dagboken.</ErrorState>
            )}

            {entriesQuery.data && entries.length === 0 && (
                <EmptyState>Inga inlägg de senaste {daysBack} dagarna.</EmptyState>
            )}

            {groupByDay(entries).map(([date, dayEntries]) => (
                // The day is the entry's heading, so it sits inside the day's frame,
                // above its entries, rather than outside as a separator.
                <section
                    key={date}
                    aria-labelledby={`day-${date}`}
                    className="overflow-hidden rounded-lg border border-border"
                >
                    <div className="flex flex-wrap items-baseline gap-x-3 px-4 pt-4">
                        <h2 id={`day-${date}`} className="font-display text-xl">
                            {formatDay(date)}
                        </h2>
                        {(sessionsByDate.get(date) ?? []).map((sessionId, i) => (
                            <Link
                                key={sessionId}
                                to={`/sessions/${sessionId}/edit`}
                                className="rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/80"
                            >
                                Träningspass{i > 0 ? ` ${i + 1}` : ""} →
                            </Link>
                        ))}
                    </div>
                    <ul className="divide-y divide-border">
                        {dayEntries.map((entry) => (
                            <JournalEntryRow
                                key={entry.id}
                                entry={entry}
                                tagSuggestions={tagSuggestions}
                                error={failedFor(entry.id) ? "Kunde inte uppdatera inlägget." : undefined}
                                onSave={async (data) => {
                                    await update.mutateAsync({ id: entry.id, data })
                                }}
                                onArchive={(archived) => archive.mutate({ id: entry.id, archived })}
                                onDelete={() => remove.mutate(entry.id)}
                            />
                        ))}
                    </ul>
                </section>
            ))}

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
