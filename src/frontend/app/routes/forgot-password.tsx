import { useState } from "react";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { forgotPassword } from "~/auth/authApi";
import { AuthCard, AuthField, AuthSubmit } from "~/components/AuthCard";

export function meta() {
    return [{ title: "Eloball — Reset password" }];
}

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        // Always reports success: whether the address is registered is not ours to reveal.
        await forgotPassword(email.trim()).catch(() => undefined);
        setBusy(false);
        setSent(true);
    };

    if (sent) {
        return (
            <AuthCard title="Check your inbox" subtitle={`If ${email.trim()} has an account, a reset link is on its way.`}>
                <MailCheck size={40} className="mx-auto text-emerald-500" />
                <Link to="/login" className="text-sm font-semibold text-center hover:underline">
                    Back to sign in
                </Link>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
            <form onSubmit={submit} className="flex flex-col gap-3">
                <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required autoFocus />
                <AuthSubmit busy={busy}>Send reset link</AuthSubmit>
            </form>
            <Link to="/login" className="text-sm text-muted-foreground text-center hover:text-foreground">
                Back to sign in
            </Link>
        </AuthCard>
    );
}
