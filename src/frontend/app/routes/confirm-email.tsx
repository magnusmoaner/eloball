import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { confirmEmail } from "~/auth/authApi";
import { AuthCard } from "~/components/AuthCard";

export function meta() {
    return [{ title: "Eloball — Confirm email" }, { name: "referrer", content: "no-referrer" }];
}

export default function ConfirmEmail() {
    const [searchParams] = useSearchParams();
    const [state, setState] = useState<"working" | "done" | "failed">("working");
    const started = useRef(false);

    useEffect(() => {
        // React 18 mounts effects twice in dev; the token is single-use, so guard it.
        if (started.current) return;
        started.current = true;

        const userId = searchParams.get("userId");
        const code = searchParams.get("code");

        // Scrub the token from the address bar before doing anything else with it.
        window.history.replaceState(null, "", window.location.pathname);

        if (!userId || !code) {
            setState("failed");
            return;
        }

        confirmEmail(userId, code).then(
            () => setState("done"),
            () => setState("failed"),
        );
    }, [searchParams]);

    if (state === "working") {
        return (
            <AuthCard title="Confirming your email…">
                <Loader2 size={40} className="mx-auto animate-spin text-muted-foreground" />
            </AuthCard>
        );
    }

    if (state === "failed") {
        return (
            <AuthCard title="Link expired" subtitle="This confirmation link is invalid or has already been used.">
                <XCircle size={40} className="mx-auto text-red-500" />
                <Link to="/login" className="text-sm font-semibold text-center hover:underline">
                    Back to sign in — you can send a new link from there
                </Link>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="You're all set" subtitle="Your email is confirmed. Sign in to start playing.">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <Link
                to="/login"
                className="w-full text-center py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
            >
                Sign in
            </Link>
        </AuthCard>
    );
}
