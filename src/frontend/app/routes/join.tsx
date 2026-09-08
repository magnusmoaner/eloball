import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router";
import { Loader2, Users } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useAuth } from "~/auth/AuthProvider";
import { useGetLeaguePreviewQuery } from "../../apis/foosball/foosball";
import { setPendingInvite } from "~/lib/pendingInvite";
import { AuthCard } from "~/components/AuthCard";

export function meta() {
    return [{ title: "Eloball — Join a league" }];
}

/**
 * Landing page for an invite link or QR code.
 *
 * It doesn't join anything itself — that needs an account and a claimed player. It parks the code
 * and hands off; `useRedeemPendingInvite` redeems it as soon as the user is in a position to join.
 */
export default function Join() {
    const { code } = useParams();
    const { isAuthenticated, isLoading } = useAuth();

    // Anonymous lookup — the card should name the league before asking anyone to sign up.
    // Skipped once signed in, since we redirect straight through in that case.
    const { data: league, isLoading: loadingLeague, isError } = useGetLeaguePreviewQuery(
        !isLoading && !isAuthenticated && code ? code : skipToken,
    );

    useEffect(() => {
        if (code) setPendingInvite(code);
    }, [code]);

    if (!code) return <Navigate to="/" replace />;

    if (isLoading || (!isAuthenticated && loadingLeague)) {
        return (
            <AuthCard title="One moment…">
                <Loader2 size={40} className="mx-auto animate-spin text-muted-foreground" />
            </AuthCard>
        );
    }

    // Signed in → straight through; the redeemer picks the code up and opens the league.
    if (isAuthenticated) return <Navigate to="/" replace />;

    // A code that no longer resolves — rotated, mistyped, or a stale printout.
    if (isError || !league) {
        return (
            <AuthCard
                title="This invite has expired"
                subtitle="The code on this link is no longer valid. Ask whoever shared it for a new one."
            >
                <Link to="/login" className="text-sm font-semibold text-center hover:underline">
                    Back to sign in
                </Link>
            </AuthCard>
        );
    }

    // Signed out. Don't assume they're new: someone already in another league is just as likely to
    // be scanning this. Either route keeps the code, so they land in the league either way.
    return (
        <AuthCard
            title={`Join ${league.name}`}
            subtitle="You've been invited to this league on Eloball. Play matches and track your ELO."
        >
            <p className="flex items-center justify-center gap-1.5 -mt-2 text-sm text-muted-foreground">
                <Users size={14} />
                {league.memberCount} {league.memberCount === 1 ? "member" : "members"}
            </p>

            <Link
                to="/signup"
                className="w-full text-center py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-opacity hover:opacity-90"
            >
                Create an account
            </Link>
            <Link
                to="/login"
                className="w-full text-center py-3 rounded-xl border border-border font-semibold text-sm transition-colors hover:bg-muted"
            >
                I already have an account
            </Link>
            <p className="text-xs text-muted-foreground text-center">
                Invite code <span className="font-mono font-semibold tracking-wider">{code}</span>
            </p>
        </AuthCard>
    );
}
