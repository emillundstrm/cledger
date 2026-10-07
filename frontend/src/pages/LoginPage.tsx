import { useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router"
import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormError, FormField } from "@/components/system/Form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function LoginPage() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? "/sessions"
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { error } = await signIn(email, password)
        if (error) {
            // Supabase's messages are English; the common one gets a Swedish wording.
            setError(
                /invalid login credentials/i.test(error.message)
                    ? "Fel e-post eller lösenord."
                    : `Kunde inte logga in: ${error.message}`,
            )
            setLoading(false)
        } else {
            navigate(from, { replace: true })
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2.5 font-display text-3xl font-normal">
                        <span
                            aria-hidden="true"
                            className="inline-block size-3 rotate-45 rounded-[3px] bg-primary shadow-[0_0_12px_var(--glow)]"
                        />
                        CLedger
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField label="E-post" htmlFor="email">
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="du@exempel.se"
                                required
                                disabled={loading}
                            />
                        </FormField>
                        <FormField label="Lösenord" htmlFor="password">
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </FormField>
                        {error && <FormError>{error}</FormError>}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Loggar in…" : "Logga in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default LoginPage
