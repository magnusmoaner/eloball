import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "~/auth/AuthProvider";
import { AuthError, resendConfirmation } from "~/auth/authApi";
import { AuthCard, AuthField, AuthSubmit } from "~/components/AuthCard";
import { toast } from "~/lib/toast";

export function meta() {
    return [{ title: "Eloball — Sign in" }];
}

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unconfirmed, setUnconfirmed] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setUnconfirmed(false);
        try {
            await login(email.trim(), password, rememberMe);
            navigate("/", { replace: true });
        } catch (err) {
            const code = err instanceof AuthError ? err.code : "";
            setUnconfirmed(code === "email_not_confirmed");
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthCard title="Welcome back" subtitle="Sign in to track your foosball ELO." error={error}>
            {unconfirmed && (
                <button
                    type="button"
                    onClick={async () => {
                        await resendConfirmation(email.trim());
                        toast.success("Confirmation email sent.");
                    }}
                    className="text-sm font-semibold text-primary hover:underline cursor-pointer -mt-2"
                >
                    Resend confirmation email
                </button>
            )}

            <form onSubmit={submit} className="flex flex-col gap-3">
                <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required autoFocus />
                <AuthField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="size-4 rounded border-border cursor-pointer accent-primary"
                        />
                        Remember me
                    </label>
                    <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                        Forgot password?
                    </Link>
                </div>

                <AuthSubmit busy={busy}>Sign in</AuthSubmit>
            </form>

            <p className="text-sm text-muted-foreground text-center">
                New here?{" "}
                <Link to="/signup" className="font-semibold text-foreground hover:underline">
                    Create an account
                </Link>
            </p>
        </AuthCard>
    );
}
