import { skipToken } from "@reduxjs/toolkit/query";
import { useGetPlayersQuery, usePostMatchMutation, useGetActiveSeasonQuery, useGetSeasonLeaderboardQuery } from "../../apis/foosball/foosball";
import type { Match, PlayerTeam } from "../../apis/foosball/types";
import usePlayerContext from "~/context/PlayerContext/usePlayerContext";
import { useCurrentLeague } from "~/lib/useCurrentLeague";
import { CurrentLeagueBadge } from "~/components/CurrentLeagueBadge";
import { useCallback, useEffect, useState } from "react";
import { toast } from "~/lib/toast";
import { Button } from "~/components/ui/button";
import { ArrowLeftRight, Scale, X, Gamepad2, Trophy, Egg, Play } from "lucide-react";
import {useAuth0} from "@auth0/auth0-react";

export function meta() {
  return [{ title: "Eloball — Play" }];
}

export default function Game() {
  const leagueId = useCurrentLeague();
  const { data: players, isLoading: playersLoading } = useGetPlayersQuery(leagueId ?? skipToken);
  const { data: activeSeason } = useGetActiveSeasonQuery(leagueId ?? skipToken);
  const { data: leaderboard } = useGetSeasonLeaderboardQuery(activeSeason?.id ?? skipToken);
  const { players: selected, addPlayer, removePlayer } = usePlayerContext();
  const [postMatch, { isLoading: submitting, isSuccess }] = usePostMatchMutation();
  const [isEgg, setIsEgg] = useState(false);
  const [started, setStarted] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "elo">("name");

  // Per-player rating = their latestElo in the active season (1000 if they haven't played it).
  const eloById = new Map((leaderboard ?? []).map(e => [e.playerId, e.latestElo ?? e.startingElo]));
  const eloOf = (id: number) => eloById.get(id) ?? 1000;

  useEffect(() => {
    if (isSuccess) {
      toast.success(isEgg ? "🥚 Egg recorded! 10-0 — brutal." : "Match recorded! ELO updated.");
      selected.forEach(p => removePlayer(p.player.id));
      setIsEgg(false);
      setStarted(false);
    }
  }, [isSuccess]);

  const team1 = selected.filter(p => p.team === 1);
  const team2 = selected.filter(p => p.team === 2);
  const canSubmit = team1.length > 0 && team2.length > 0 && selected.length >= 2;
  const canCalibrate = selected.length >= 3 && selected.length <= 4;

  const team1Elo = team1.reduce((sum, p) => sum + eloOf(p.player.id), 0);
  const team2Elo = team2.reduce((sum, p) => sum + eloOf(p.player.id), 0);
  const startingTeam: 1 | 2 | null =
    team1.length > 0 && team2.length > 0 && team1Elo !== team2Elo
      ? (team1Elo < team2Elo ? 1 : 2)
      : null;


  const teamName = (team: number) => (team === 1 ? "Red" : "Blue");

  // Put a player on a team. Switches team if already picked; if the team is full,
  // swaps out the most recently added player on that team.
  const setTeam = (player: { id: number; name: string }, team: number) => {
    const current = selected.find(p => p.player.id === player.id);
    if (current?.team === team) {
      removePlayer(player.id);
      return;
    }
    const teamPlayers = team === 1 ? team1 : team2;
    if (teamPlayers.length >= 2) {
      const bumped = teamPlayers[teamPlayers.length - 1];
      removePlayer(bumped.player.id);
      toast.info(`${bumped.player.name} swapped out of ${teamName(team)}`);
    }
    if (current) removePlayer(player.id);
    addPlayer({ player, team });
  };

  const calibrateTeams = useCallback(() => {
    if (!canCalibrate) return;
    const sorted = [...selected].sort((a, b) => eloOf(a.player.id) - eloOf(b.player.id));
    let updated: PlayerTeam[] = [];

    if (selected.length === 4) {
      updated = [
        { ...sorted[3], team: 1 }, { ...sorted[0], team: 1 },
        { ...sorted[1], team: 2 }, { ...sorted[2], team: 2 },
      ];
    } else {
      updated = [
        { ...sorted[2], team: 1 },
        { ...sorted[0], team: 2 }, { ...sorted[1], team: 2 },
      ];
    }
    selected.forEach(p => removePlayer(p.player.id));
    updated.forEach(p => addPlayer(p));
    toast.success("Teams balanced!");
  }, [selected, removePlayer, addPlayer, canCalibrate]);

  const swapTeams = useCallback(() => {
    if (selected.length < 2) return;
    const updated = selected.map(p => ({ ...p, team: p.team === 1 ? 2 : 1 }));
    selected.forEach(p => removePlayer(p.player.id));
    updated.forEach(p => addPlayer(p));
  }, [selected, removePlayer, addPlayer]);

  const handleStart = () => {
    if (canSubmit) setStarted(true);
  };

  const handleCancel = () => {
    setStarted(false);
    setIsEgg(false);
  };

  const handleSubmit = (teamWonId: number) => {
    const matches: Match[] = selected.map(p => ({
      playerId: p.player.id,
      teamId: p.team
    }));
    if (canSubmit && leagueId != null) {
      postMatch({ matches, teamWonId, leagueId, egg: isEgg });
    }
  };

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Gamepad2 size={40} className="text-primary animate-bounce" />
      </div>
    );
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "da", { sensitivity: "base" });
  const sortedPlayers = players
    ? [...players].sort((a, b) => sortBy === "elo" ? (eloOf(b.id) - eloOf(a.id)) || byName(a, b) : byName(a, b))
    : [];
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        {activeSeason && (
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-bold">
            <Trophy size={14} />
            {activeSeason.name}
          </span>
        )}
        <CurrentLeagueBadge inline />
      </div>
      {/* Team Display — Bonzini-inspired with wood/green field vibe */}
      <div className="rounded-2xl bg-gradient-to-b from-emerald-800 to-emerald-900 p-4 mb-4 shadow-lg relative overflow-hidden">
        {/* Field lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-full bg-white/10"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/10 pointer-events-none"></div>

        <div className="grid grid-cols-2 gap-3 relative">
          {/* Team Red */}
          <div>
            <h3 className="font-extrabold text-sm text-red-300 mb-2 text-center uppercase tracking-wider">
              Team Red{!started && startingTeam === 1 && <span className="ml-2 align-middle inline-block rounded-full bg-red-500 text-white text-[10px] px-2 py-0.5">Starts</span>}
            </h3>
            <div className="space-y-2">
              {[0, 1].map(slot => {
                const p = team1[slot];
                return (
                  <div key={`r${slot}`} className={`rounded-xl p-3 h-[66px] flex items-center transition-all ${
                    p
                      ? "bg-red-500/25 border border-red-400/40 backdrop-blur-sm"
                      : "border border-dashed border-white/15"
                  }`}>
                    {p ? (
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="font-bold text-sm text-white">{p.player.name}</p>
                          <p className="text-sm font-extrabold tabular-nums text-white/70 mt-0.5">{eloOf(p.player.id)}</p>
                        </div>
                        {!started && (
                          <button onClick={() => removePlayer(p.player.id)} className="text-white/40 hover:text-white p-1">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/25 mx-auto">Player {slot + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team Blue */}
          <div>
            <h3 className="font-extrabold text-sm text-blue-300 mb-2 text-center uppercase tracking-wider">
              Team Blue{!started && startingTeam === 2 && <span className="ml-2 align-middle inline-block rounded-full bg-blue-500 text-white text-[10px] px-2 py-0.5">Starts</span>}
            </h3>
            <div className="space-y-2">
              {[0, 1].map(slot => {
                const p = team2[slot];
                return (
                  <div key={`b${slot}`} className={`rounded-xl p-3 h-[66px] flex items-center transition-all ${
                    p
                      ? "bg-blue-500/25 border border-blue-400/40 backdrop-blur-sm"
                      : "border border-dashed border-white/15"
                  }`}>
                    {p ? (
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="font-bold text-sm text-white">{p.player.name}</p>
                          <p className="text-sm font-extrabold tabular-nums text-white/70 mt-0.5">{eloOf(p.player.id)}</p>
                        </div>
                        {!started && (
                          <button onClick={() => removePlayer(p.player.id)} className="text-white/40 hover:text-white p-1">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/25 mx-auto">Player {slot + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions inside the field */}
        {started ? (
          <div className="flex items-center justify-center gap-2 mt-3 relative rounded-xl bg-white/15 backdrop-blur-sm py-2 text-white font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Match in Progress
          </div>
        ) : (
          <div className="flex gap-2 mt-3 relative">
            <Button
              onClick={calibrateTeams}
              disabled={!canCalibrate || submitting}
              className="flex-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold border-0 backdrop-blur-sm"
            >
              <Scale size={16} className="mr-1.5" />
              Calibrate
            </Button>
            <Button
              onClick={swapTeams}
              disabled={selected.length < 2 || submitting}
              className="rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold border-0 backdrop-blur-sm"
            >
              <ArrowLeftRight size={16} className="mr-1.5" />
              Switch
            </Button>
          </div>
        )}
      </div>

      {started ? (
        <>
          {/* Egg toggle — flag a 10-0 shutout */}
          <button
            type="button"
            onClick={() => setIsEgg(v => !v)}
            disabled={submitting}
            aria-pressed={isEgg}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 mb-3 text-sm font-extrabold border-2 transition-all active:scale-95 cursor-pointer ${
              isEgg
                ? "bg-amber-400 border-amber-500 text-amber-950 shadow-md shadow-amber-400/30"
                : "bg-card border-border text-muted-foreground hover:border-amber-400/50"
            }`}
          >
            <Egg size={18} className={isEgg ? "text-amber-950" : "text-amber-500"} />
            {isEgg ? "Egg! 10–0 shutout" : "Mark as Egg (10–0)"}
          </button>

          {/* Post Match — Red Won / Blue Won */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Button
              onClick={() => handleSubmit(1)}
              disabled={!canSubmit || submitting}
              className="rounded-2xl py-5 text-base font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all active:scale-95"
            >
              <Trophy size={18} className="mr-2" />
              Red Won
            </Button>
            <Button
              onClick={() => handleSubmit(2)}
              disabled={!canSubmit || submitting}
              className="rounded-2xl py-5 text-base font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Trophy size={18} className="mr-2" />
              Blue Won
            </Button>
          </div>

          {/* Cancel Match — return to setup */}
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="w-full rounded-2xl py-3 mb-8 text-sm font-bold text-muted-foreground border border-border hover:bg-muted/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Cancel Match
          </button>
        </>
      ) : (
        /* Start Match — begin playing */
        <Button
          onClick={handleStart}
          disabled={!canSubmit}
          className="w-full rounded-2xl py-5 mb-8 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Play size={18} className="mr-2" />
          Start Match
        </Button>
      )}

      {/* Player Selection Grid */}
      {!started && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Add players to Red or Blue team</h2>
          <div className="inline-flex rounded-lg border border-border overflow-hidden divide-x divide-border bg-background text-[11px] font-bold uppercase tracking-wide" role="group" aria-label="Sort players">
            {(["name", "elo"] as const).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                aria-pressed={sortBy === key}
                className={`px-2.5 py-1 cursor-pointer transition-colors ${
                  sortBy === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {key === "name" ? "A–Z" : "ELO"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedPlayers.map(player => {
            const teamEntry = selected.find(p => p.player.id === player.id);
            const onRed = teamEntry?.team === 1;
            const onBlue = teamEntry?.team === 2;
            const redFull = !onRed && team1.length >= 2;
            const blueFull = !onBlue && team2.length >= 2;

            const segment = (team: 1 | 2, active: boolean, full: boolean) => {
              const label = team === 1 ? "Red" : "Blue";
              const activeCls = team === 1 ? "bg-red-500 text-white" : "bg-blue-500 text-white";
              const idleCls = team === 1
                ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                : "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10";
              const fullCls = team === 1
                ? "text-red-500/50 hover:bg-red-500/10"
                : "text-blue-500/50 hover:bg-blue-500/10";
              return (
                <button
                  type="button"
                  onClick={() => setTeam(player, team)}
                  disabled={submitting}
                  aria-pressed={active}
                  aria-label={active ? `Remove ${player.name} from ${label}` : full ? `Swap ${player.name} onto ${label}` : `Add ${player.name} to ${label}`}
                  title={full ? `${label} is full — tap to swap in` : undefined}
                  className={`min-h-9 min-w-14 px-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    active ? activeCls : full ? fullCls : idleCls
                  }`}
                >
                  {full ? "Full" : label}
                </button>
              );
            };

            return (
              <div
                key={player.id}
                className={`rounded-xl border-2 px-3 py-2 transition-all ${
                  onRed
                    ? "border-red-400 bg-red-50 dark:bg-red-500/10"
                    : onBlue
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10"
                      : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <p className="flex-1 min-w-0 font-bold text-sm truncate">{player.name}</p>
                  <p className={`text-sm font-extrabold tabular-nums shrink-0 ${teamEntry ? "" : "text-muted-foreground"}`}>
                    {eloOf(player.id)}
                  </p>
                  <div className="inline-flex rounded-lg border border-border overflow-hidden shrink-0 divide-x divide-border bg-background">
                    {segment(1, onRed, redFull)}
                    {segment(2, onBlue, blueFull)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
