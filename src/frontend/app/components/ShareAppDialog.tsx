import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { QrShare } from "~/components/QrShare";

/**
 * Invite someone to Eloball itself, rather than to one of your leagues. They land on signup and
 * are walked through creating a league of their own.
 */
export function ShareAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const url = typeof window !== "undefined" ? `${window.location.origin}/signup` : "";

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Share Eloball</DialogTitle>
                    <DialogDescription>
                        Anyone who scans this can sign up and start their own league.
                    </DialogDescription>
                </DialogHeader>

                <QrShare
                    url={url}
                    title="Eloball"
                    printSubtitle="Scan to sign up and start tracking your foosball ELO"
                />
            </DialogContent>
        </Dialog>
    );
}
