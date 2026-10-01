import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resetPassword } from "~/auth/authApi";
import { AuthCard, AuthField, AuthSubmit } from "~/components/AuthCard";
import { toast } from "~/lib/toast";

export function meta() {
    // Keeps the reset code out of the Referer header on any request this page makes.
    return [{ title: "Eloball — Choose a new password" }, { name: "referrer", content: "no-referrer" }];
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Read once, then scrub: the code should not linger in the address bar or browser history.
    const [creds] = useState(() => ({
        email: searchParams.get("email") ?? "",
        code: searchParams.get("code") ?? "",
    }));

    useEffect(() => {
        window.history.replaceState(null, "", window.location.pathname);
    }, []);

    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const missing = !creds.email || !creds.code;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await resetPassword(creds.email, creds.code, password);
            toast.success("Password updated — sign in with your new one.");
            navigate("/login", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't reset your password.");
        } finally {
            setBusy(false);
        }
    };

    if (missing) {
        return (
            <AuthCard title="Link not valid" subtitle="This reset link is incomplete. Request a fresh one.">
                <Link to="/forgot-password" className="text-sm font-semibold text-center hover:underline">
                    Send a new link
                </Link>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Choose a new password" subtitle={`For ${creds.email}`} error={error}>
            <form onSubmit={submit} className="flex flex-col gap-3">
                <AuthField
                    label="New password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    required
                    autoFocus
                    hint="At least 8 characters."
                />
                <AuthSubmit busy={busy}>Update password</AuthSubmit>
            </form>
        </AuthCard>
    );
}
