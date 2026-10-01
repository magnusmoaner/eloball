import { useState } from "react";
import { useDispatch } from "react-redux";
import { Loader2, Trash2 } from "lucide-react";
import { foosballApi } from "../../apis/foosball/foosball";
import { useAuth } from "~/auth/AuthProvider";
import { deleteAccount } from "~/auth/authApi";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { setCurrentLeague } from "~/leagueSlice";
import { clearPendingInvite } from "~/lib/pendingInvite";
import { toast } from "~/lib/toast";

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const dispatch = useDispatch();
    const { refresh } = useAuth();
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setPassword("");
        setError(null);
        onClose();
    };

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await deleteAccount(password);
            // Drop to the signed-out shell first: clearing the cache while the app is still
            // mounted makes every open screen refetch, and those requests now get 401s.
            await refresh();
            // Nothing from this account should linger for whoever uses the browser next.
            dispatch(foosballApi.util.resetApiState());
            dispatch(setCurrentLeague(null));
            clearPendingInvite();
            toast.success("Your account has been deleted.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't delete your account.");
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && !busy && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription>This can't be undone.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2 text-sm">
                    <p>
                        <span className="font-semibold">Deleted:</span> your login, your email address, and your
                        membership of every league. If you own a league, the longest-standing member takes over.
                    </p>
                    <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Kept:</span> your name in past matches and
                        seasons, so everyone else's ratings and history still add up.
                    </p>
                </div>

                {error && (
                    <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </p>
                )}

                <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Confirm with your password</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && password && !busy && void submit()}
                        autoComplete="current-password"
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                    />
                </label>

                <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={close} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="cursor-pointer dark:bg-destructive"
                        onClick={() => void submit()}
                        disabled={!password || busy}
                    >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Delete account
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
