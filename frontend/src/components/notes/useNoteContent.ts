import { useState } from "react"
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { updateNoteContent } from "@/api/notes"
import type { Note } from "@/api/types"

const MUTATION_KEY = ["note-content"]

/** The freshest content we hold for a note: its own page's cache, else any notes list. */
function cachedContent(queryClient: QueryClient, id: string): string | undefined {
    const single = queryClient.getQueryData<Note>(["note", id])
    if (single) {
        return single.content
    }
    for (const [, notes] of queryClient.getQueriesData<Note[]>({ queryKey: ["notes"] })) {
        const note = notes?.find((n) => n.id === id)
        if (note) {
            return note.content
        }
    }
    return undefined
}

function setCachedContent(queryClient: QueryClient, id: string, content: string) {
    queryClient.setQueryData<Note>(["note", id], (old) => (old ? { ...old, content } : old))
    queryClient.setQueriesData<Note[]>({ queryKey: ["notes"] }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, content } : n)),
    )
}

/**
 * Checklist edits (tick, add) on any note. Changes show at once in both the
 * note page and the notes list, and save in the background one at a time and
 * in order, so quick taps cannot overwrite each other.
 *
 * A failed save keeps the change on screen and marks the note unsaved, so the
 * user can retry it or undo it where they made it, instead of seeing it
 * quietly revert.
 */
export function useNoteContent() {
    const queryClient = useQueryClient()
    // Notes whose latest change failed to save, with the content to retry.
    const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(new Map())

    const forget = (id: string) => {
        setUnsaved((prev) => {
            if (!prev.has(id)) {
                return prev
            }
            const next = new Map(prev)
            next.delete(id)
            return next
        })
    }

    const mutation = useMutation({
        mutationKey: MUTATION_KEY,
        mutationFn: ({ id, content }: { id: string; content: string }) => updateNoteContent(id, content),
        scope: { id: "note-content" },
        onMutate: async ({ id, content }) => {
            await queryClient.cancelQueries({ queryKey: ["note", id] })
            await queryClient.cancelQueries({ queryKey: ["notes"] })
            setCachedContent(queryClient, id, content)
        },
        onError: (_error, { id, content }) => {
            // Saves run in order, so a later failure holds the newer content.
            setUnsaved((prev) => new Map(prev).set(id, content))
        },
        onSuccess: (_note, { id }) => {
            // Each save sends the whole content, so it carries any earlier
            // change to the same note that failed.
            forget(id)
            // Refetch only once the queue is drained; earlier refetches would
            // briefly show content from before the later taps.
            if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
                queryClient.invalidateQueries({ queryKey: ["notes"] })
                queryClient.invalidateQueries({ queryKey: ["search"] })
            }
        },
    })

    const change = (id: string, edit: (content: string) => string) => {
        const current = cachedContent(queryClient, id)
        if (current === undefined) {
            return
        }
        const next = edit(current)
        if (next !== current) {
            mutation.mutate({ id, content: next })
        }
    }

    /** Send the unsaved content again. */
    const retry = (id: string) => {
        const content = unsaved.get(id)
        if (content !== undefined) {
            mutation.mutate({ id, content })
        }
    }

    /** Drop the unsaved change and show what is saved. */
    const discard = (id: string) => {
        forget(id)
        queryClient.invalidateQueries({ queryKey: ["notes"] })
        queryClient.invalidateQueries({ queryKey: ["note", id] })
    }

    return {
        change,
        retry,
        discard,
        unsavedIds: [...unsaved.keys()],
        isUnsaved: (id: string) => unsaved.has(id),
        isSaving: mutation.isPending,
    }
}
