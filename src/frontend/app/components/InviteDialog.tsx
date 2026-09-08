import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Link as LinkIcon, Loader2, Printer, RefreshCw } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
    useGetLeagueInviteQuery,
    useRotateLeagueInviteMutation,
} from "../../apis/foosball/foosball";
import type { MyLeague } from "../../apis/foosball/types";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "~/lib/toast";

/**
 * The owner's share sheet: a QR code meant to be taped to the foosball table, plus the raw code
 * for anyone typing it in. Rotating invalidates every link and printout already out there.
 */
export function InviteDialog({ league, onClose }: { league: MyLeague | null; onClose: () => void }) {
    const { data: invite, isLoading } = useGetLeagueInviteQuery(league?.id ?? skipToken);
    const [rotate, { isLoading: rotating }] = useRotateLeagueInviteMutation();
    const wrapRef = useRef<HTMLDivElement>(null);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [png, setPng] = useState<Blob | null>(null);

    const code = invite?.code;
    const url = code ? `${window.location.origin}/join/${code}` : "";

    const canvas = () => wrapRef.current?.querySelector("canvas") ?? null;

    // Render the PNG ahead of the click rather than during it. Handing ClipboardItem an unresolved
    // promise severs the write from the user gesture, and a browser that hasn't already granted
    // clipboard-write refuses it — which is why the first Copy QR used to fall through to the link
    // and only worked once something else had been copied.
    //
    // Two passes: the logo in the middle is drawn asynchronously by qrcode.react once the image
    // decodes, so the immediate snapshot can miss it. The second pass catches the finished canvas.
    useEffect(() => {
        if (!code) return;
        let cancelled = false;
        const snapshot = () => canvas()?.toBlob((b) => { if (b && !cancelled) setPng(b); }, "image/png");

        snapshot();
        const t = setTimeout(snapshot, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [code]);

    const copyImage = async () => {
        const c = canvas();
        if (!c) return;
        try {
            // Prefer the blob prepared above; only fall back to generating one now (which may be
            // refused for lack of a gesture) if the canvas wasn't ready in time.
            const blob = png ?? new Promise<Blob>((resolve, reject) =>
                c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png"));
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast.success("QR code copied — paste it anywhere.");
        } catch {
            // Firefox needs a flag for image writes, and some browsers refuse them outright.
            // Fall back to the link, but only claim success if that actually worked.
            try {
                await navigator.clipboard.writeText(url);
                toast.success("Couldn't copy the image — copied the invite link instead.");
            } catch {
                toast.error("Couldn't copy. Use Save, or copy the code below by hand.");
            }
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Invite link copied.");
        } catch {
            toast.error("Couldn't copy. Copy the code below by hand.");
        }
    };

    const download = () => {
        const c = canvas();
        if (!c) return;
        const a = document.createElement("a");
        a.href = c.toDataURL("image/png");
        a.download = `eloball-${league?.name.replace(/\s+/g, "-").toLowerCase() ?? "invite"}.png`;
        a.click();
    };

    const print = () => {
        const c = canvas();
        if (!c || !league) return;
        const w = window.open("", "_blank", "width=600,height=800");
        if (!w) return;

        // Built with DOM APIs rather than document.write: league names are user-supplied, and a
        // print window opened from here inherits our origin, so an interpolated name could run
        // script with the viewer's session. Ownership is transferable (delegate / claim-ownership),
        // so the name shown here is not necessarily one you chose yourself.
        const doc = w.document;
        doc.title = league.name + " \u2014 Eloball invite";

        const wrap = doc.createElement("div");
        wrap.setAttribute("style", "font-family:system-ui,sans-serif;text-align:center;padding:48px");

        const heading = doc.createElement("h1");
        heading.setAttribute("style", "font-size:28px;margin:0 0 4px");
        heading.textContent = league.name;

        const sub = doc.createElement("p");
        sub.setAttribute("style", "color:#666;margin:0 0 32px");
        sub.textContent = "Scan to join on Eloball";

        const img = doc.createElement("img");
        img.setAttribute("style", "width:320px;height:320px");

        const codeText = doc.createElement("p");
        codeText.setAttribute("style", "font-family:ui-monospace,monospace;font-size:24px;letter-spacing:4px;margin-top:24px");
        codeText.textContent = code ?? "";

        wrap.append(heading, sub, img, codeText);
        doc.body.append(wrap);

        // Wait for the QR to decode before printing, or the sheet comes out with a blank square.
        img.onload = () => {
            w.focus();
            w.print();
        };
        img.src = c.toDataURL("image/png");
    };

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
                        <div ref={wrapRef} className="flex justify-center rounded-2xl bg-white p-5">
                            {/* Rendered white-on-black regardless of theme: scanners want contrast.
                                Level H (30% recovery) so the excavated logo in the middle doesn't
                                cost us scannability. Same-origin image, so the canvas stays
                                untainted and copy/save/print still work. */}
                            <QRCodeCanvas
                                value={url}
                                size={220}
                                level="H"
                                marginSize={2}
                                imageSettings={{
                                    src: "/favicon.png",
                                    height: 46,
                                    width: 46,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <p className="text-center font-mono text-2xl font-bold tracking-[0.3em] select-all">
                            {code}
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={copyImage}>
                                <Copy size={14} /> Copy QR
                            </Button>
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={copyLink}>
                                <LinkIcon size={14} /> Copy link
                            </Button>
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={download}>
                                <Download size={14} /> Save
                            </Button>
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={print}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>

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
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
