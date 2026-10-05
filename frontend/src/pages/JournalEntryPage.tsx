import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router"
import { fetchJournalEntry } from "@/api/journal"
import JournalEntryCard, { DayHeading } from "@/components/journal/JournalEntryCard"
import { useJournalMutations } from "@/components/journal/useJournalMutations"

/** A single journal entry, the target of links like /journal/<id>. */
function JournalEntryPage() {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const { update, archive, remove, isError } = useJournalMutations(() => navigate("/journal"))

    const { data: entry, isLoading, isError: loadError } = useQuery({
        queryKey: ["journal-entry", id],
        queryFn: () => fetchJournalEntry(id),
    })

    return (
        <div className="space-y-6">
            <Link to="/journal" className="text-sm text-muted-foreground hover:text-foreground">
                ← Dagbok
            </Link>
            {isLoading && <p className="text-muted-foreground">Laddar inlägget…</p>}
            {(loadError || (!isLoading && !entry)) && (
                <p className="text-destructive">Inlägget hittades inte.</p>
            )}
            {entry && (
                <div className="space-y-3">
                    <DayHeading date={entry.entryDate} />
                    <JournalEntryCard
                        entry={entry}
                        tagSuggestions={entry.tags}
                        highlighted
                        onSave={(data) => update.mutate({ id: entry.id, data })}
                        onArchive={(archived) => archive.mutate({ id: entry.id, archived })}
                        onDelete={() => remove.mutate(entry.id)}
                    />
                </div>
            )}
            {isError && <p className="text-destructive">Kunde inte uppdatera inlägget.</p>}
        </div>
    )
}

export default JournalEntryPage
