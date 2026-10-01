/**
 * An invite code the user arrived with but couldn't act on yet — they still have to confirm their
 * email and claim a player before they can join anything. Parked here so it survives that
 * round-trip through the inbox.
 *
 * Only survives within one browser: confirming on a different device loses it, and the user falls
 * back to pasting the code on the league screen.
 */
const KEY = "eloball_pending_invite_v1";

export function setPendingInvite(code: string) {
    try {
        window.localStorage.setItem(KEY, code);
    } catch {
        /* private mode — the user can paste the code instead */
    }
}

export function getPendingInvite(): string | null {
    try {
        return window.localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

export function clearPendingInvite() {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        /* nothing to clean up */
    }
}
