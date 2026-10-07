import { useEffect } from "react"
import { useSearchParams } from "react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { decideAuthorization, fetchAuthorizationRequest } from "@/api/oauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { ErrorState, LoadingState } from "@/components/system/States"

function redirectTo(url: string) {
    window.location.assign(url)
}

/** The host the client gets sent back to. Clients register themselves, so the name alone can be faked. */
function redirectHost(uri: string): string {
    try {
        return new URL(uri).host
    } catch {
        return uri
    }
}

function OAuthConsentPage() {
    const [searchParams] = useSearchParams()
    const authorizationId = searchParams.get("authorization_id")

    const request = useQuery({
        queryKey: ["oauth-authorization", authorizationId],
        queryFn: () => fetchAuthorizationRequest(authorizationId!),
        enabled: authorizationId !== null,
        retry: false,
        staleTime: Infinity,
    })

    const decision = useMutation({
        mutationFn: (approve: boolean) => decideAuthorization(authorizationId!, approve),
        onSuccess: redirectTo,
    })

    useEffect(() => {
        if (request.data?.kind === "redirect") {
            redirectTo(request.data.redirectUrl)
        }
    }, [request.data])

    let body: React.ReactNode
    if (authorizationId === null) {
        body = <ErrorState>Länken saknar sitt auktoriserings-ID.</ErrorState>
    } else if (request.isError) {
        body = <ErrorState>{request.error.message}</ErrorState>
    } else if (request.data?.kind !== "consent") {
        body = <LoadingState>Laddar…</LoadingState>
    } else {
        const { details } = request.data
        body = (
            <div className="space-y-5">
                <p>
                    <span className="font-medium">{details.client.name}</span> vill kunna läsa och skriva dina
                    pass, anteckningar och din dagbok som {details.user.email}.
                </p>
                <p className="text-sm text-muted-foreground">
                    Du skickas sedan tillbaka till <span className="font-medium text-foreground">{redirectHost(details.redirect_uri)}</span>.
                    Godkänn bara om det var där du startade anslutningen.
                </p>
                {decision.isError && (
                    <ErrorState>{decision.error.message}</ErrorState>
                )}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={decision.isPending}
                        onClick={() => decision.mutate(false)}
                    >
                        Neka
                    </Button>
                    <Button
                        className="flex-1"
                        disabled={decision.isPending}
                        onClick={() => decision.mutate(true)}
                    >
                        Godkänn
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <h1 className="font-display text-2xl leading-none">Anslut till CLedger</h1>
                    <CardDescription>En app ber om åtkomst till ditt konto.</CardDescription>
                </CardHeader>
                <CardContent>{body}</CardContent>
            </Card>
        </div>
    )
}

export default OAuthConsentPage
