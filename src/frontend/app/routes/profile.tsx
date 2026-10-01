import { useAuth } from "~/auth/AuthProvider";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "~/lib/toast";
import {
    KeyRound,
    Share2,
    Globe,
    Lock,
    QrCode,
    Ticket,
    Check,
    Clock,
    Crown,
    Dices,
    Gamepad2,
    Loader2,
    LogOut,
    Mail,
    Pencil,
    Plus,
    Settings2,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    TriangleAlert,
    UserMinus,
    Users,
} from "lucide-react";
import {
    useGetMeQuery,
    useRenamePlayerMutation,
    useGetMyLeaguesQuery,
    useGetLeagueMembersQuery,
    useGetActiveSeasonQuery,
    useGetSeasonLeaderboardQuery,
    useCreateLeagueMutation,
    useSetLeagueVisibilityMutation,
    useGetPublicLeaguesQuery,
    useRenameLeagueMutation,
    useJoinLeagueMutation,
    useLeaveLeagueMutation,
    useClaimOwnershipMutation,
    useDelegateOwnershipMutation,
    useRemoveMemberMutation,
    useDeleteLeagueMutation,
} from "../../apis/foosball/foosball";
import type { MyLeague } from "../../apis/foosball/types";
import { setCurrentLeague } from "~/leagueSlice";
import { useCurrentLeague } from "~/lib/useCurrentLeague";
import { CurrentLeagueBadge } from "~/components/CurrentLeagueBadge";
import { randomLeagueName } from "~/lib/leagueName";
import { generateSeasonName } from "~/lib/seasonName";
import { InviteDialog } from "~/components/InviteDialog";
import { ShareAppDialog } from "~/components/ShareAppDialog";
import { ChangePasswordDialog } from "~/components/ChangePasswordDialog";
import { DeleteAccountDialog } from "~/components/DeleteAccountDialog";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";

export function meta() {
    return [{ title: "Eloball — Profile" }];
}

function initialsFrom(name: string | undefined, email: string | undefined): string {
    const source = (name ?? email ?? "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

function formatRelative(iso: string | undefined): string | null {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const diffSec = Math.round((Date.now() - then) / 1000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const abs = Math.abs(diffSec);
    if (abs < 60) return rtf.format(-diffSec, "second");
    if (abs < 3600) return rtf.format(-Math.round(diffSec / 60), "minute");
    if (abs < 86400) return rtf.format(-Math.round(diffSec / 3600), "hour");
    if (abs < 2592000) return rtf.format(-Math.round(diffSec / 86400), "day");
    if (abs < 31536000) return rtf.format(-Math.round(diffSec / 2592000), "month");
    return rtf.format(-Math.round(diffSec / 31536000), "year");
}

function Avatar({ src, name, email }: { src: string | undefined; name: string | undefined; email: string | undefined }) {
    const [failed, setFailed] = useState(false);
    if (src && !failed) {
        return (
            <img
                src={src}
                alt={name ?? "Avatar"}
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
                className="size-20 rounded-full object-cover mx-auto mb-4 border border-border/50 shadow-sm"
            />
        );
    }
    return (
        <div className="size-20 rounded-full mx-auto mb-4 border border-border/50 shadow-sm bg-gradient-to-br from-sky-500 to-violet-500 text-white flex items-center justify-center text-xl font-bold tracking-wide select-none">
            {initialsFrom(name, email)}
        </div>
    );
}

/** Owner's member-management dialog: delegate ownership or remove members. */
function ManageMembersDialog({ league, myPlayerId, onClose }: { league: MyLeague | null; myPlayerId: number | undefined; onClose: () => void }) {
    const { data: members } = useGetLeagueMembersQuery(league?.id ?? skipToken);
    const [delegateOwnership, { isLoading: delegating }] = useDelegateOwnershipMutation();
    const [removeMember, { isLoading: removing }] = useRemoveMemberMutation();
    const busy = delegating || removing;

    const handleDelegate = async (playerId: number, name: string) => {
        if (!league) return;
        try {
            await delegateOwnership({ id: league.id, playerId }).unwrap();
            toast.success(`${name} is now the owner`);
            onClose();
        } catch {
            toast.error("Couldn't transfer ownership.");
        }
    };

    const handleRemove = async (playerId: number, name: string) => {
        if (!league) return;
        try {
            await removeMember({ id: league.id, playerId }).unwrap();
            toast.success(`Removed ${name}`);
        } catch {
            toast.error("Couldn't remove that member.");
        }
    };

    return (
        <Dialog open={league !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-4">
                <DialogHeader>
                    <DialogTitle>Manage {league?.name}</DialogTitle>
                    <DialogDescription>Transfer ownership or remove members.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[60vh]">
                    {(members ?? []).map((m) => (
                        <div key={m.playerId} className="flex items-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5">
                            <span className="flex-1 min-w-0 font-semibold text-sm truncate">{m.name}</span>
                            {m.role === "Owner" ? (
                                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                                    <Crown size={11} /> Owner
                                </span>
                            ) : (
                                <>
                                    <Button size="sm" variant="outline" className="cursor-pointer" disabled={busy} onClick={() => handleDelegate(m.playerId, m.name)}>
                                        <Crown size={13} /> Make owner
                                    </Button>
                                    <Button size="sm" variant="outline" className="cursor-pointer hover:bg-destructive hover:text-white hover:border-destructive" disabled={busy || m.playerId === myPlayerId} onClick={() => handleRemove(m.playerId, m.name)}>
                                        <UserMinus size={13} />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Profile() {
    const { user, isLoading, logout } = useAuth();
    const dispatch = useDispatch();
    const currentLeagueId = useCurrentLeague();

    const { data: me } = useGetMeQuery();
    const [renamePlayer, { isLoading: renaming }] = useRenamePlayerMutation();

    const { data: myLeagues } = useGetMyLeaguesQuery();
    const [joinLeague] = useJoinLeagueMutation();
    const [leaveLeague] = useLeaveLeagueMutation();
    const [createLeague, { isLoading: creating }] = useCreateLeagueMutation();
    const [setVisibility] = useSetLeagueVisibilityMutation();
    const [renameLeague, { isLoading: renamingLeague }] = useRenameLeagueMutation();
    const [claimOwnership] = useClaimOwnershipMutation();
    const [deleteLeague] = useDeleteLeagueMutation();

    // Player's rating in the current league's active season.
    const { data: activeSeason } = useGetActiveSeasonQuery(currentLeagueId ?? skipToken);
    const { data: activeLb } = useGetSeasonLeaderboardQuery(activeSeason?.id ?? skipToken);
    const myElo = activeLb?.find((e) => e.playerId === me?.id)?.latestElo ?? null;

    // Player rename
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    // League dialogs
    const [joinOpen, setJoinOpen] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    // Only fetched while the join dialog is open.
    const { data: publicLeagues } = useGetPublicLeaguesQuery(undefined, { skip: !joinOpen });
    const [inviteTarget, setInviteTarget] = useState<MyLeague | null>(null);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newLeagueName, setNewLeagueName] = useState("");
    const [newSeasonName, setNewSeasonName] = useState("Season 1");
    const [leaveTarget, setLeaveTarget] = useState<MyLeague | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MyLeague | null>(null);
    const [renameLeagueTarget, setRenameLeagueTarget] = useState<MyLeague | null>(null);
    const [leagueNameValue, setLeagueNameValue] = useState("");
    const [manageTarget, setManageTarget] = useState<MyLeague | null>(null);


    const handleRename = async () => {
        const name = renameValue.trim();
        if (!name || name === me?.name) return setRenameOpen(false);
        try {
            await renamePlayer({ name }).unwrap();
            toast.success(`Renamed to ${name}`);
            setRenameOpen(false);
        } catch {
            toast.error("Couldn't rename your player.");
        }
    };

    const handleSwitch = (l: MyLeague) => {
        dispatch(setCurrentLeague(l.id));
        toast.success(`Switched to ${l.name}`);
    };

    const handleJoin = async () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) return;
        try {
            const joined = await joinLeague(code).unwrap();
            dispatch(setCurrentLeague(joined.id));
            toast.success(`Joined ${joined.name}`);
            setJoinCode("");
            setJoinOpen(false);
        } catch {
            toast.error("That invite code isn't valid.");
        }
    };

    const handleJoinPublic = async (id: number, name: string) => {
        try {
            const joined = await joinLeague({ leagueId: id }).unwrap();
            dispatch(setCurrentLeague(joined.id));
            toast.success(`Joined ${name}`);
            setJoinOpen(false);
        } catch {
            toast.error("Couldn't join that league.");
        }
    };

    const handleVisibility = async (league: MyLeague) => {
        try {
            await setVisibility({ id: league.id, isPublic: !league.isPublic }).unwrap();
            toast.success(league.isPublic
                ? `${league.name} is invite-only again`
                : `${league.name} is now open for anyone to join`);
        } catch {
            toast.error("Couldn't change who can join.");
        }
    };

    const pickFallbackLeague = (excludeId: number) =>
        (myLeagues ?? []).find((l) => l.id !== excludeId)?.id ?? null;

    const handleLeave = async () => {
        if (!leaveTarget) return;
        try {
            await leaveLeague(leaveTarget.id).unwrap();
            if (currentLeagueId === leaveTarget.id) dispatch(setCurrentLeague(pickFallbackLeague(leaveTarget.id)));
            toast.success(`Left ${leaveTarget.name}`);
            setLeaveTarget(null);
        } catch (e) {
            toast.error((e as { data?: string })?.data ?? "Couldn't leave the league.");
        }
    };

    const handleCreate = async () => {
        const name = newLeagueName.trim();
        if (!name) return;
        try {
            const created = await createLeague({ name, seasonName: newSeasonName.trim() || undefined }).unwrap();
            dispatch(setCurrentLeague(created.id));
            toast.success(`Created ${created.name}`);
            setCreateOpen(false);
            setNewLeagueName("");
            setNewSeasonName("Season 1");
        } catch {
            toast.error("Couldn't create the league.");
        }
    };

    const handleRenameLeague = async () => {
        const name = leagueNameValue.trim();
        if (!renameLeagueTarget || !name) return;
        try {
            await renameLeague({ id: renameLeagueTarget.id, name }).unwrap();
            toast.success("League renamed");
            setRenameLeagueTarget(null);
        } catch {
            toast.error("Couldn't rename the league.");
        }
    };

    const handleClaim = async (l: MyLeague) => {
        try {
            await claimOwnership(l.id).unwrap();
            toast.success(`You're now the owner of ${l.name}`);
        } catch {
            toast.error("Couldn't claim ownership.");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteLeague(deleteTarget.id).unwrap();
            if (currentLeagueId === deleteTarget.id) dispatch(setCurrentLeague(pickFallbackLeague(deleteTarget.id)));
            toast.success(`Deleted ${deleteTarget.name}`);
            setDeleteTarget(null);
        } catch (e) {
            toast.error((e as { data?: string })?.data ?? "Couldn't delete the league.");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!user) return null;

    const currentLeague = myLeagues?.find((l) => l.id === currentLeagueId) ?? null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="text-center mb-8 animate-slide-up">
                <Avatar src={undefined} name={me?.name} email={user.email} />
                <h1 className="text-2xl md:text-3xl font-extrabold">{me?.name ?? "Player"}</h1>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                {currentLeague && (
                    <div className="mt-3">
                        <CurrentLeagueBadge inline />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                {/* Account */}
                <section className="bg-card rounded-2xl border border-border/50 p-5 animate-slide-up" style={{ animationDelay: "60ms" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Mail size={14} className="text-muted-foreground" />
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Account</h2>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{user.email}</span>
                        {user.emailConfirmed ? (
                            <span title="Email confirmed" className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                                <ShieldCheck size={11} /> Confirmed
                            </span>
                        ) : (
                            <span title="Email not confirmed" className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                                <ShieldAlert size={11} /> Unconfirmed
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setPasswordOpen(true)}>
                            <KeyRound size={14} /> Change password
                        </Button>
                    </div>
                </section>

                {/* Player */}
                <section className="bg-card rounded-2xl border border-border/50 p-5 animate-slide-up" style={{ animationDelay: "90ms" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Gamepad2 size={14} className="text-muted-foreground" />
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Player</h2>
                    </div>
                    {me ? (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{me.name}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {myElo != null ? `${myElo} ELO${currentLeague ? ` · ${currentLeague.name}` : ""}` : "Unranked this season"}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="cursor-pointer transition-transform active:scale-95" onClick={() => { setRenameValue(me.name); setRenameOpen(true); }}>
                                <Pencil size={14} /> Rename
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No player linked.</p>
                    )}
                </section>

                {/* Leagues */}
                <section className="bg-card rounded-2xl border border-border/50 p-5 animate-slide-up" style={{ animationDelay: "120ms" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Shield size={14} className="text-muted-foreground" />
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Leagues</h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        {(myLeagues ?? []).map((league) => {
                            const isActive = league.id === currentLeagueId;
                            const isOwner = league.role === "Owner";
                            return (
                                <div
                                    key={league.id}
                                    className={`rounded-xl border p-4 transition-all ${isActive ? "bg-sky-500/5 border-sky-500/50 ring-1 ring-sky-500/40" : "bg-background border-border/50"}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`shrink-0 size-9 rounded-lg flex items-center justify-center ${isActive ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-muted text-muted-foreground"}`}>
                                            <Shield size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold truncate">{league.name}</span>
                                                {isActive && (
                                                    <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 rounded-full px-2 py-0.5">
                                                        <Check size={11} /> Current
                                                    </span>
                                                )}
                                                <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${isActive ? "" : "ml-auto"} ${isOwner ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" : "bg-muted text-muted-foreground"}`}>
                                                    {isOwner && <Crown size={10} />}{league.role}
                                                </span>
                                            </div>
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Users size={12} />
                                                {league.memberCount} {league.memberCount === 1 ? "member" : "members"}
                                            </span>

                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                {!isActive && (
                                                    <Button size="sm" className="cursor-pointer" onClick={() => handleSwitch(league)}>Open</Button>
                                                )}
                                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setInviteTarget(league)}>
                                                    <QrCode size={13} /> Invite
                                                </Button>
                                                {isOwner && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => { setLeagueNameValue(league.name); setRenameLeagueTarget(league); }}>
                                                            <Pencil size={13} /> Rename
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setManageTarget(league)}>
                                                            <Settings2 size={13} /> Members
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="cursor-pointer"
                                                            title={league.isPublic
                                                                ? "Anyone can find and join this league"
                                                                : "Only people with the invite code can join"}
                                                            onClick={() => handleVisibility(league)}
                                                        >
                                                            {league.isPublic ? <><Globe size={13} /> Public</> : <><Lock size={13} /> Private</>}
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="cursor-pointer hover:bg-destructive hover:text-white hover:border-destructive disabled:opacity-40" disabled={league.memberCount > 1} title={league.memberCount > 1 ? "Remove all other members first" : undefined} onClick={() => setDeleteTarget(league)}>
                                                            <Trash2 size={13} /> Delete
                                                        </Button>
                                                    </>
                                                )}
                                                {!league.hasOwner && (
                                                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleClaim(league)}>
                                                        <Crown size={13} /> Claim ownership
                                                    </Button>
                                                )}
                                                {!isOwner && (
                                                    <Button size="sm" variant="outline" className="cursor-pointer hover:bg-destructive hover:text-white hover:border-destructive ml-auto" onClick={() => setLeaveTarget(league)}>
                                                        Leave
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setJoinOpen(true)}>
                            <Ticket size={14} /> Join with code
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setNewLeagueName(randomLeagueName()); setNewSeasonName(generateSeasonName()); setCreateOpen(true); }}>
                            <Shield size={14} /> Create league
                        </Button>
                    </div>
                </section>

                {/* Invite people to the app itself, not to a league. They land on signup and are
                    walked through creating their own league. */}
                <section className="bg-card rounded-2xl border border-border/50 p-5 animate-slide-up" style={{ animationDelay: "150ms" }}>
                    <div className="flex items-center gap-2 mb-1">
                        <Share2 size={14} className="text-muted-foreground" />
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Spread Eloball</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Share a link to Eloball, and they can join and start their own league. Or
                        share an invite to a league above instead.
                    </p>
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShareOpen(true)}>
                        <QrCode size={14} /> Get QR code to share
                    </Button>
                </section>

                <section className="bg-card rounded-2xl border border-destructive/40 p-5 animate-slide-up" style={{ animationDelay: "165ms" }}>
                    <div className="flex items-center gap-2 mb-1">
                        <TriangleAlert size={14} className="text-destructive" />
                        <h2 className="text-sm font-bold text-destructive uppercase tracking-wide">Danger zone</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Delete your login and leave every league. Your name stays in past matches so
                        everyone else's history still adds up.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer bg-background text-destructive border-destructive/50 hover:bg-destructive hover:text-white"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 size={14} /> Delete account
                    </Button>
                </section>

                <div className="mt-2 flex justify-center animate-slide-up" style={{ animationDelay: "180ms" }}>
                    <button
                        onClick={() => { void logout(); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground cursor-pointer transition-all active:scale-95 hover:bg-destructive hover:text-white"
                    >
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </div>

            <InviteDialog league={inviteTarget} onClose={() => setInviteTarget(null)} />
            <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
            <ShareAppDialog open={shareOpen} onClose={() => setShareOpen(false)} />
            <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />

            {/* Join with an invite code */}
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Join a league</DialogTitle>
                        <DialogDescription>Enter the invite code you were given.</DialogDescription>
                    </DialogHeader>
                    <input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleJoin(); } }}
                        autoFocus
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="ABCD1234"
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm font-mono tracking-widest outline-none focus:border-primary"
                    />
                    {(publicLeagues?.filter((l) => !l.isMember).length ?? 0) > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <p className="text-sm font-semibold">Or join an open league</p>
                            <div className="max-h-52 overflow-y-auto flex flex-col gap-1.5 -mx-1 px-1">
                                {publicLeagues!.filter((l) => !l.isMember).map((l) => (
                                    <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-2.5">
                                        <div className="shrink-0 size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                                            <Globe size={15} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{l.name}</p>
                                            <p className="text-xs text-muted-foreground">{l.memberCount} {l.memberCount === 1 ? "member" : "members"}</p>
                                        </div>
                                        <Button size="sm" className="cursor-pointer shrink-0" onClick={() => handleJoinPublic(l.id, l.name)}>Join</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setJoinOpen(false)}>Cancel</Button>
                        <Button className="cursor-pointer" disabled={joinCode.trim().length < 6} onClick={handleJoin}>Join</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create league */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a league</DialogTitle>
                        <DialogDescription>You'll be the owner. You can rename or delete it later.</DialogDescription>
                    </DialogHeader>
                    <label className="text-sm font-semibold -mb-1">League name</label>
                    <div className="relative">
                        <input
                            value={newLeagueName}
                            onChange={(e) => setNewLeagueName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                            autoFocus
                            placeholder="League name"
                            className="w-full pl-3 pr-11 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => setNewLeagueName(randomLeagueName())}
                            title="Surprise me"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            <Dices size={18} />
                        </button>
                    </div>
                    <label className="text-sm font-semibold -mb-1">First season name</label>
                    <div className="relative">
                        <input
                            value={newSeasonName}
                            onChange={(e) => setNewSeasonName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                            placeholder="First season name"
                            className="w-full pl-3 pr-11 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                        />
                        <button
                            type="button"
                            onClick={() => setNewSeasonName(generateSeasonName())}
                            title="Surprise me"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            <Dices size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-1">
                        Matches are recorded against a season, so we'll start one for you.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button className="cursor-pointer" disabled={!newLeagueName.trim() || creating} onClick={handleCreate}>
                            {creating && <Loader2 size={16} className="animate-spin" />} Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename league */}
            <Dialog open={renameLeagueTarget !== null} onOpenChange={(open) => !open && setRenameLeagueTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename league</DialogTitle>
                    </DialogHeader>
                    <input
                        value={leagueNameValue}
                        onChange={(e) => setLeagueNameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRenameLeague(); } }}
                        autoFocus
                        placeholder="League name"
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setRenameLeagueTarget(null)}>Cancel</Button>
                        <Button className="cursor-pointer" disabled={!leagueNameValue.trim() || renamingLeague} onClick={handleRenameLeague}>
                            {renamingLeague && <Loader2 size={16} className="animate-spin" />} Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage members (owner) */}
            <ManageMembersDialog league={manageTarget} myPlayerId={me?.id} onClose={() => setManageTarget(null)} />

            {/* Leave */}
            <Dialog open={leaveTarget !== null} onOpenChange={(open) => !open && setLeaveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leave {leaveTarget?.name}?</DialogTitle>
                        <DialogDescription>You'll stop appearing on this league's leaderboards. You can rejoin later.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setLeaveTarget(null)}>Cancel</Button>
                        <Button variant="destructive" className="cursor-pointer" onClick={handleLeave}>Leave league</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete */}
            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
                        <DialogDescription>This permanently deletes the league and all its seasons and matches. This can't be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" className="cursor-pointer" onClick={handleDelete}>Delete league</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename player */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename player</DialogTitle>
                        <DialogDescription>This changes your player name everywhere — leaderboards, matches and stats.</DialogDescription>
                    </DialogHeader>
                    <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRename(); } }}
                        autoFocus
                        placeholder="Player name"
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setRenameOpen(false)}>Cancel</Button>
                        <Button className="cursor-pointer" disabled={!renameValue.trim() || renaming} onClick={handleRename}>
                            {renaming && <Loader2 size={16} className="animate-spin" />} Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
