import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { fetchJournalEntry } from "@/api/journal"
import JournalEntryRow from "@/components/journal/JournalEntryRow"
import { formatDay } from "@/components/journal/format"
import { useJournalMutations } from "@/components/journal/useJournalMutations"
import { ListFrame } from "@/components/system/List"
import { PageHeader } from "@/components/system/PageHeader"
import { ErrorState, LoadingState, NotFoundState } from "@/components/system/States"

const BACK = { to: "/journal", label: "Dagbok" }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A single journal entry, the target of links like /journal/<id>. */
function JournalEntryPage() {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const { update, archive, remove, failedFor } = useJournalMutations(() => navigate("/journal"))

    // An id that isn't a UUID can't match a row; don't ask for it. A valid id
    // with no row comes back as null: not found, not an error.
    const validId = UUID.test(id)
    const entryQuery = useQuery({
        queryKey: ["journal-entry", id],
        queryFn: () => fetchJournalEntry(id),
        enabled: validId,
    })
    const entry = entryQuery.data

    if (!validId || (entryQuery.isSuccess && !entry)) {
        return (
            <div className="space-y-7">
                <PageHeader title="Dagboksinlägg" />
                <NotFoundState back={BACK}>Inlägget finns inte. Det kan ha tagits bort.</NotFoundState>
            </div>
        )
    }

    return (
        <div className="space-y-7">
            <PageHeader title={entry ? formatDay(entry.entryDate) : "Dagboksinlägg"} back={BACK} />
            {entryQuery.isLoading && <LoadingState>Laddar inlägget…</LoadingState>}
            {entryQuery.isError && (
                <ErrorState onRetry={() => entryQuery.refetch()}>Kunde inte ladda inlägget.</ErrorState>
            )}
            {entry && (
                <ListFrame aria-label="Inlägg">
                    <JournalEntryRow
                        entry={entry}
                        tagSuggestions={entry.tags}
                        highlighted
                        error={failedFor(entry.id) ? "Kunde inte uppdatera inlägget." : undefined}
                        onSave={(data) => update.mutate({ id: entry.id, data })}
                        onArchive={(archived) => archive.mutate({ id: entry.id, archived })}
                        onDelete={() => remove.mutate(entry.id)}
                    />
                </ListFrame>
            )}
        </div>
    )
}

export default JournalEntryPage
