import { useEffect } from "react";
import { Navigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "~/auth/AuthProvider";
import { setPendingInvite } from "~/lib/pendingInvite";
import { AuthCard } from "~/components/AuthCard";

export function meta() {
    return [{ title: "Eloball — Join a league" }];
}

/**
 * Landing page for an invite link or QR code. It doesn't join anything itself — you need a player
 * first, and possibly an account. It parks the code and hands off; the league screen picks it up
 * once the user is far enough along to act on it.
 */
export default function Join() {
    const { code } = useParams();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (code) setPendingInvite(code);
    }, [code]);

    if (!code) return <Navigate to="/" replace />;

    if (isLoading) {
        return (
            <AuthCard title="One moment…">
                <Loader2 size={40} className="mx-auto animate-spin text-muted-foreground" />
            </AuthCard>
        );
    }

    // Signed in → the shell walks them through player/league onboarding, which consumes the code.
    // Signed out → sign up first; the code waits in localStorage.
    return <Navigate to={isAuthenticated ? "/" : "/signup"} replace />;
}
