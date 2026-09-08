import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "~/lib/toast";
import { Dices, Loader2, LogOut, Ticket, UserPlus, Users } from "lucide-react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
    useGetLeaguePreviewQuery,
    useJoinLeagueMutation,
    useCreateLeagueMutation,
} from "../../apis/foosball/foosball";
import { setCurrentLeague } from "~/leagueSlice";
import { randomLeagueName } from "~/lib/leagueName";
import { generateSeasonName } from "~/lib/seasonName";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/auth/AuthProvider";
import { clearPendingInvite, getPendingInvite } from "~/lib/pendingInvite";

/**
 * The hard gate between signing up and using the app: you are in a league or you are nowhere.
 * Two ways through — redeem an invite code, or start your own league and become its owner.
 * There is no browsing, because there is no endpoint that lists other people's leagues.
 */
export function LeagueOnboarding() {
    const { logout } = useAuth();
    const dispatch = useDispatch();
    const [joinLeague, { isLoading: joining }] = useJoinLeagueMutation();
    const [createLeague, { isLoading: creating }] = useCreateLeagueMutation();

    const [code, setCode] = useState(() => getPendingInvite() ?? "");
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [seasonName, setSeasonName] = useState(() => generateSeasonName());

    const busy = joining || creating;

    // Show which league a code belongs to before committing to it.
    const trimmed = code.trim().toUpperCase();
    const { data: preview, isFetching: previewing } = useGetLeaguePreviewQuery(
        trimmed.length >= 6 ? trimmed : skipToken,
    );

    const join = async (value: string) => {
        try {
            const joined = await joinLeague(value).unwrap();
            clearPendingInvite();
            dispatch(setCurrentLeague(joined.id));
            toast.success(`Joined ${joined.name}`);
        } catch {
            toast.error("That invite code isn't valid.");
        }
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        try {
            const created = await createLeague({ name, seasonName: seasonName.trim() || undefined }).unwrap();
            clearPendingInvite();
            dispatch(setCurrentLeague(created.id));
            toast.success(`Created ${created.name}`);
        } catch {
            toast.error("Couldn't create your league.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
            <div className="w-full max-w-md flex flex-col gap-6 rounded-2xl bg-white dark:bg-neutral-800 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col items-center text-center gap-2">
                    <img src="/logo.png" alt="Eloball" className="h-auto w-44 object-contain dark:hidden" />
                    <img src="/logo-dark.png" alt="Eloball" className="h-auto w-44 object-contain hidden dark:block" />
                    <h1 className="text-xl font-extrabold mt-2">
                        {showCreate ? "Create a league" : "Join a league"}
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {showCreate
                            ? "You'll be the owner. Seasons and matches live inside your league."
                            : "Enter the invite code from your league, or start your own."}
                    </p>
                </div>

                {!showCreate ? (
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-semibold">Invite code</label>
                        <div className="relative">
                            <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="ABCD1234"
                                autoFocus
                                autoCapitalize="characters"
                                spellCheck={false}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background border border-border text-sm font-mono tracking-widest outline-none focus:border-primary"
                            />
                        </div>

                        {previewing && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Looking up that code…
                            </p>
                        )}

                        {preview && (
                            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3">
                                <div className="shrink-0 size-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                                    <Users size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{preview.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full cursor-pointer"
                            disabled={!preview || busy}
                            onClick={() => join(trimmed)}
                        >
                            {joining && <Loader2 size={16} className="animate-spin" />}
                            Join league
                        </Button>

                        <button
                            type="button"
                            onClick={() => { if (!newName.trim()) setNewName(randomLeagueName()); setSeasonName(generateSeasonName()); setShowCreate(true); }}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                            <UserPlus size={14} />
                            No code? Create your own league
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-semibold">League name</label>
                        <div className="relative">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. The Foundry - CCD"
                                autoFocus
                                className="w-full pl-3 pr-11 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                            />
                            <button
                                type="button"
                                onClick={() => setNewName(randomLeagueName())}
                                title="Surprise me"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <Dices size={18} />
                            </button>
                        </div>
                        <label className="text-sm font-semibold mt-1">First season</label>
                        <div className="relative">
                            <input
                                value={seasonName}
                                onChange={(e) => setSeasonName(e.target.value)}
                                placeholder="e.g. Season 1"
                                className="w-full pl-3 pr-11 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                            />
                            <button
                                type="button"
                                onClick={() => setSeasonName(generateSeasonName())}
                                title="Surprise me"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <Dices size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-1">
                            Matches are recorded against a season, so we'll start one for you.
                        </p>

                        <Button className="w-full cursor-pointer" disabled={!newName.trim() || busy} onClick={handleCreate}>
                            {creating && <Loader2 size={16} className="animate-spin" />}
                            Create league
                        </Button>
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            ← I have an invite code
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={() => { void logout(); }}
                className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
                <LogOut size={15} />
                Sign out
            </button>
        </div>
    );
}
