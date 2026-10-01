import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";

/** Shared chrome for the signed-out screens: logo, heading, error banner. */
export function AuthCard({
    title,
    subtitle,
    error,
    children,
}: {
    title: string;
    subtitle?: string;
    error?: string | null;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm flex flex-col gap-5 rounded-2xl bg-white dark:bg-neutral-800 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col items-center text-center gap-2">
                    <img src="/logo.png" alt="Eloball" className="h-auto w-44 object-contain dark:hidden" />
                    <img src="/logo-dark.png" alt="Eloball" className="h-auto w-44 object-contain hidden dark:block" />
                    <h1 className="text-xl font-extrabold mt-2">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>}
                </div>

                {error && (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        {error}
                    </div>
                )}

                {children}
            </div>
        </div>
    );
}

export function AuthField({
    label,
    type,
    value,
    onChange,
    hint,
    ...rest
}: {
    label: string;
    type: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{label}</span>
            <input
                {...rest}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
            />
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </label>
    );
}

export function AuthSubmit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
    return (
        <Button type="submit" disabled={busy} className="w-full cursor-pointer mt-1">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {children}
        </Button>
    );
}
