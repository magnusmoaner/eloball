import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
    useGetLeagueInviteQuery,
    useRotateLeagueInviteMutation,
} from "../../apis/foosball/foosball";
import type { MyLeague } from "../../apis/foosball/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { QrShare } from "~/components/QrShare";
import { toast } from "~/lib/toast";

/**
 * The share sheet for a league: a QR meant to be taped to the foosball table, plus the raw code
 * for anyone typing it in.
 *
 * Any member can share the code — bringing a colleague in shouldn't require being the owner.
 * Rotating it stays owner-only, since that revokes every copy already in circulation.
 */
export function InviteDialog({ league, onClose }: { league: MyLeague | null; onClose: () => void }) {
    const { data: invite, isLoading } = useGetLeagueInviteQuery(league?.id ?? skipToken);
    const [rotate, { isLoading: rotating }] = useRotateLeagueInviteMutation();
    const [confirmRotate, setConfirmRotate] = useState(false);

    const isOwner = league?.role === "Owner";
    const code = invite?.code;
    const url = code ? `${window.location.origin}/join/${code}` : "";

    const handleRotate = async () => {
        if (!league) return;
        try {
            await rotate(league.id).unwrap();
            setConfirmRotate(false);
            toast.success("New code generated. Old links no longer work.");
        } catch {
            toast.error("Couldn't rotate the code.");
        }
    };

    return (
        <Dialog open={league != null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Invite to {league?.name}</DialogTitle>
                    <DialogDescription>
                        Anyone with this code can join. Print it and stick it on the table.
                    </DialogDescription>
                </DialogHeader>

                {isLoading || !code ? (
                    <div className="flex justify-center py-10">
                        <Loader2 size={24} className="animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <QrShare
                            url={url}
                            code={code}
                            title={league?.name ?? "Eloball"}
                            printSubtitle="Scan to join on Eloball"
                        />

                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => (confirmRotate ? handleRotate() : setConfirmRotate(true))}
                                disabled={rotating}
                                className={`inline-flex items-center justify-center gap-1.5 text-sm transition-colors cursor-pointer ${
                                    confirmRotate ? "text-destructive font-semibold" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {rotating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                {confirmRotate ? "Sure? Every existing link stops working" : "Generate a new code"}
                            </button>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
