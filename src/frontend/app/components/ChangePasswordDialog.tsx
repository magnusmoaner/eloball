import { useState } from "react";
import { Loader2 } from "lucide-react";
import { changePassword } from "~/auth/authApi";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "~/lib/toast";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [oldPassword, setOld] = useState("");
    const [newPassword, setNew] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setBusy(true);
        setError(null);
        try {
            await changePassword(oldPassword, newPassword);
            toast.success("Password updated.");
            setOld("");
            setNew("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't change your password.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change password</DialogTitle>
                    <DialogDescription>You'll stay signed in on this device.</DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </p>
                )}

                <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOld(e.target.value)}
                    placeholder="Current password"
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                />
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNew(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                />

                <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={onClose}>Cancel</Button>
                    <Button className="cursor-pointer" disabled={busy || !oldPassword || newPassword.length < 8} onClick={submit}>
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
