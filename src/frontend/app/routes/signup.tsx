import { useState } from "react";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { register, resendConfirmation } from "~/auth/authApi";
import { AuthCard, AuthField, AuthSubmit } from "~/components/AuthCard";
import { getPendingInvite } from "~/lib/pendingInvite";
import { toast } from "~/lib/toast";

export function meta() {
    return [{ title: "Eloball — Create account" }];
}

export default function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const invite = getPendingInvite();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await register(email.trim(), password);
            // Registration does not sign you in — confirmation is required first.
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setBusy(false);
        }
    };

    if (sent) {
        return (
            <AuthCard title="Check your inbox" subtitle={`We sent a confirmation link to ${email.trim()}. Click it to activate your account.`}>
                <MailCheck size={40} className="mx-auto text-emerald-500" />
                <button
                    type="button"
                    onClick={async () => {
                        await resendConfirmation(email.trim());
                        toast.success("Sent again — check your spam folder too.");
                    }}
                    className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                >
                    Didn't get it? Send again
                </button>
                <p className="text-sm text-muted-foreground text-center">
                    Already confirmed?{" "}
                    <Link to="/login" className="font-semibold text-foreground hover:underline">
                        Sign in
                    </Link>
                </p>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Create your account"
            subtitle={invite ? "You've been invited to a league — set up an account to join it." : "Track your foosball ELO and compete across seasons."}
            error={error}
        >
            <form onSubmit={submit} className="flex flex-col gap-3">
                <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required autoFocus />
                <AuthField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    required
                    hint="At least 8 characters."
                />
                <AuthSubmit busy={busy}>Create account</AuthSubmit>
            </form>

            <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-foreground hover:underline">
                    Sign in
                </Link>
            </p>
        </AuthCard>
    );
}
