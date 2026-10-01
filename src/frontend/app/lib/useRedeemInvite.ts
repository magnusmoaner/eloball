import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useJoinLeagueMutation } from "../../apis/foosball/foosball";
import { setCurrentLeague } from "~/leagueSlice";
import { clearPendingInvite, getPendingInvite } from "~/lib/pendingInvite";
import { toast } from "~/lib/toast";

/**
 * Redeems a parked invite code once the user is actually able to join: signed in, with a player,
 * and their leagues loaded.
 *
 * This lives here rather than in LeagueOnboarding because that screen only renders when you belong
 * to no leagues — so an existing member scanning a QR code would never reach it, and the code would
 * sit unredeemed forever. The condition below is true for every onboarded user, however they got
 * back: fresh signup, ordinary login, or a link opened in another tab.
 *
 * @param ready whether the user is in a position to join anything yet
 * @param leagues the caller's current league list, used to know when the join has landed
 * @returns true while a join is in flight, so the caller can hold the UI still
 */
export function useRedeemPendingInvite(ready: boolean, leagues: { id: number }[] | undefined): boolean {
    const dispatch = useDispatch();
    const [joinLeague] = useJoinLeagueMutation();
    // Assume we're redeeming if a code is parked at mount, so the league-onboarding screen doesn't
    // flash up for a frame before the join lands.
    const [redeeming, setRedeeming] = useState(() => getPendingInvite() != null);
    const [joinedId, setJoinedId] = useState<number | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (!ready || started.current) return;

        const code = getPendingInvite();
        if (!code) {
            setRedeeming(false);
            return;
        }

        started.current = true;
        (async () => {
            try {
                const joined = await joinLeague(code).unwrap();
                clearPendingInvite();
                setJoinedId(joined.id);
                toast.success(`Joined ${joined.name}`);
            } catch {
                // Clear it either way — a rotated or bogus code must not be retried on every load.
                clearPendingInvite();
                toast.error("That invite link isn't valid any more. Ask for a new one.");
                setRedeeming(false);
            }
        })();
    }, [ready, joinLeague]);

    // Open the new league only once the refreshed list actually contains it. Selecting it the
    // instant the POST returns races the refetch: for that moment the cached list still lacks the
    // league, so the "exactly one league → open it" fallback treats the selection as invalid and
    // snaps the user back to where they were.
    useEffect(() => {
        if (joinedId == null || !leagues?.some((l) => l.id === joinedId)) return;
        dispatch(setCurrentLeague(joinedId));
        setRedeeming(false);
    }, [joinedId, leagues, dispatch]);

    return redeeming;
}
