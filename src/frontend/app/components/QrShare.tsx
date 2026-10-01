import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download, Link as LinkIcon, Printer } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "~/lib/toast";

/**
 * A shareable QR code with copy / save / print.
 *
 * Shared rather than duplicated: the clipboard handling below is fiddlier than it looks, and two
 * copies of it would drift until one of them quietly stopped working.
 */
/** Synchronous counterpart to canvas.toBlob — no promise, so the user gesture survives. */
function dataUrlToBlob(dataUrl: string): Blob {
    const [meta, base64] = dataUrl.split(",");
    const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

export function QrShare({
    url,
    code,
    title,
    printSubtitle,
}: {
    /** What the QR encodes, and what "Copy link" puts on the clipboard. */
    url: string;
    /** Optional short code shown under the QR and on the printout. */
    code?: string;
    /** Heading on the printout, and the basis for the downloaded filename. */
    title: string;
    printSubtitle: string;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);

    const canvas = () => wrapRef.current?.querySelector("canvas") ?? null;

    /**
     * Copy text, with a fallback that needs no permission.
     *
     * The async Clipboard API gets refused on the first attempt in some browsers — commonly
     * NotAllowedError, including "Document is not focused" when the window wasn't already active.
     * The click that reports the failure then focuses the window, so a second click succeeds,
     * which is what makes this look like "only works the second time". The legacy execCommand
     * path is synchronous, permission-free, and unaffected by that.
     */
    const copyText = async (text: string): Promise<boolean> => {
        // The clipboard API refuses with NotAllowedError ("Document is not focused") when the
        // window wasn't the active one — the click that reports the failure is the click that
        // focuses it, which is why a second press then works.
        if (!document.hasFocus()) window.focus();

        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("[QrShare] clipboard.writeText refused, falling back to execCommand", err);
        }

        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            // Off-screen but still selectable; position:fixed avoids scrolling the page.
            ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, text.length);
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch (err) {
            console.error("[QrShare] execCommand copy failed", err);
            return false;
        }
    };

    const copyImage = async () => {
        const c = canvas();
        if (!c) return;
        if (!document.hasFocus()) window.focus();
        try {
            // toDataURL is synchronous and dataUrlToBlob stays synchronous, so ClipboardItem is
            // handed a finished Blob within the click itself. Anything async here — an awaited
            // toBlob, or a promise passed to ClipboardItem — severs the write from the user
            // gesture and gets it refused.
            const blob = dataUrlToBlob(c.toDataURL("image/png"));
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast.success("QR code copied — paste it anywhere.");
        } catch (err) {
            // Image writes aren't supported everywhere (Firefox needs a flag). The link is the
            // useful consolation, and copyText has a fallback that can't be refused.
            console.warn("[QrShare] clipboard.write(image) refused", err);
            if (await copyText(url)) {
                toast.success("Couldn't copy the image — copied the link instead.");
            } else {
                toast.error("Couldn't copy — select the link below and copy it by hand.");
            }
        }
    };

    const copyLink = async () => {
        if (await copyText(url)) toast.success("Link copied.");
        else toast.error("Couldn't copy the link.");
    };

    const download = () => {
        const c = canvas();
        if (!c) return;
        const a = document.createElement("a");
        a.href = c.toDataURL("image/png");
        a.download = `eloball-${title.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
    };

    const print = () => {
        const c = canvas();
        if (!c) return;
        const w = window.open("", "_blank", "width=600,height=800");
        if (!w) return;

        // Built with DOM APIs rather than document.write: titles here can be user-supplied league
        // names, and a print window opened from here inherits our origin, so an interpolated name
        // could run script with the viewer's session.
        const doc = w.document;
        doc.title = title + " — Eloball";

        const wrap = doc.createElement("div");
        wrap.setAttribute("style", "font-family:system-ui,sans-serif;text-align:center;padding:48px");

        const heading = doc.createElement("h1");
        heading.setAttribute("style", "font-size:28px;margin:0 0 4px");
        heading.textContent = title;

        const sub = doc.createElement("p");
        sub.setAttribute("style", "color:#666;margin:0 0 32px");
        sub.textContent = printSubtitle;

        const img = doc.createElement("img");
        img.setAttribute("style", "width:320px;height:320px");

        wrap.append(heading, sub, img);

        if (code) {
            const codeText = doc.createElement("p");
            codeText.setAttribute("style", "font-family:ui-monospace,monospace;font-size:24px;letter-spacing:4px;margin-top:24px");
            codeText.textContent = code;
            wrap.append(codeText);
        }

        doc.body.append(wrap);

        // Wait for the QR to decode before printing, or the sheet comes out with a blank square.
        img.onload = () => { w.focus(); w.print(); };
        img.src = c.toDataURL("image/png");
    };

    return (
        <>
            <div ref={wrapRef} className="flex justify-center rounded-2xl bg-white p-5">
                {/* Black on white regardless of theme: scanners want contrast. Level H (30%
                    recovery) so the excavated logo doesn't cost scannability. */}
                <QRCodeCanvas
                    value={url}
                    size={220}
                    level="H"
                    marginSize={2}
                    imageSettings={{ src: "/favicon.png", height: 46, width: 46, excavate: true }}
                />
            </div>

            {code && (
                <p className="text-center font-mono text-2xl font-bold tracking-[0.3em] select-all">
                    {code}
                </p>
            )}

            <p className="text-center text-xs text-muted-foreground break-all select-all">
                {url}
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
        </>
    );
}
