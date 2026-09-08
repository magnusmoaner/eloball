import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { LeaderboardEntry, LeagueInvite, LeagueMember, LeaguePreview, MyLeague, Player, PlayerMatchRecord, Season, SubmitMatch } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.billigeterninger.dk/api/'

// Auth rides on the session cookie, so every request must carry credentials. There is no token to
// attach and nothing to refresh — the cookie either works or the call comes back 401.
const realBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
})

export const foosballApi = createApi({
    reducerPath: 'foosballApi',
    baseQuery: realBaseQuery,
    tagTypes: ["match", "season", "me", "league"],
    endpoints: (builder) => ({
        // League roster (members of the given league).
        getPlayers: builder.query<Player[], number>({
            query: (leagueId) => `player?leagueId=${leagueId}`,
            providesTags: ["match", "league"]
        }),
        // The player linked to the current account; 404 → needs onboarding.
        getMe: builder.query<Player, void>({
            query: () => 'player/me',
            providesTags: ["me"]
        }),
        // Scoped to one league, addressed either by an invite code you hold or by a league you
        // already belong to. There is deliberately no way to list every unclaimed player.
        getUnclaimedPlayers: builder.query<Player[], { code: string } | { leagueId: number }>({
            query: (arg) => 'code' in arg
                ? `player/unclaimed?code=${encodeURIComponent(arg.code)}`
                : `player/unclaimed?leagueId=${arg.leagueId}`,
            providesTags: ["me"]
        }),
        claimPlayer: builder.mutation<Player, { playerId: number; code?: string }>({
            query: (body) => ({ url: 'player/claim', method: 'POST', body }),
            invalidatesTags: ["me", "match"]
        }),
        createPlayer: builder.mutation<Player, { name: string }>({
            query: (body) => ({ url: 'player', method: 'POST', body }),
            invalidatesTags: ["me", "match"]
        }),
        renamePlayer: builder.mutation<Player, { name: string }>({
            query: (body) => ({ url: 'player/me', method: 'PUT', body }),
            invalidatesTags: ["me", "match"]
        }),
        postMatch: builder.mutation<void, SubmitMatch>({
            query: (match) => ({
                url: 'match',
                method: 'POST',
                body: match
            }),
            invalidatesTags: ["match", "season"]
        }),
        getSeasons: builder.query<Season[], number>({
            query: (leagueId) => `season?leagueId=${leagueId}`,
            providesTags: ["season"]
        }),
        getActiveSeason: builder.query<Season, number>({
            query: (leagueId) => `season/active?leagueId=${leagueId}`,
            providesTags: ["season"]
        }),
        getSeason: builder.query<Season, number>({
            query: (id) => `season/${id}`,
            providesTags: ["season"]
        }),
        getSeasonLeaderboard: builder.query<LeaderboardEntry[], number>({
            query: (id) => `season/${id}/leaderboard`,
            providesTags: ["season"]
        }),
        // Leaderboards for several seasons in one hook call. The number of seasons
        // can change between renders, so callers must not call a hook per season.
        getSeasonLeaderboards: builder.query<Record<number, LeaderboardEntry[]>, number[]>({
            async queryFn(ids, _api, _extra, fetchWithBQ) {
                const results = await Promise.all(ids.map(id => fetchWithBQ(`season/${id}/leaderboard`)));
                const out: Record<number, LeaderboardEntry[]> = {};
                for (let i = 0; i < ids.length; i++) {
                    const r = results[i];
                    if (r.error) return { error: r.error };
                    out[ids[i]] = r.data as LeaderboardEntry[];
                }
                return { data: out };
            },
            providesTags: ["season"]
        }),
        getPlayerMatches: builder.query<PlayerMatchRecord[], number>({
            query: (leagueId) => `player/playerMatches?leagueId=${leagueId}`,
            providesTags: ["match"]
        }),
        endSeason: builder.mutation<Season, number>({
            query: (id) => ({ url: `season/${id}/end`, method: 'POST' }),
            invalidatesTags: ["season", "match"]
        }),
        createSeason: builder.mutation<Season, { name: string; leagueId: number }>({
            query: (body) => ({ url: 'season', method: 'POST', body }),
            invalidatesTags: ["season", "match"]
        }),

        // --- Leagues ---
        getLeaguePreview: builder.query<LeaguePreview, string>({
            query: (code) => `league/preview?code=${encodeURIComponent(code)}`,
        }),
        getLeagueInvite: builder.query<LeagueInvite, number>({
            query: (id) => `league/${id}/invite`,
            providesTags: ["league"]
        }),
        rotateLeagueInvite: builder.mutation<LeagueInvite, number>({
            query: (id) => ({ url: `league/${id}/invite/rotate`, method: 'POST' }),
            invalidatesTags: ["league"]
        }),
        getMyLeagues: builder.query<MyLeague[], void>({
            query: () => 'league/mine',
            providesTags: ["league"]
        }),
        getLeagueMembers: builder.query<LeagueMember[], number>({
            query: (id) => `league/${id}/members`,
            providesTags: ["league"]
        }),
        createLeague: builder.mutation<{ id: number; name: string; inviteCode: string }, { name: string; seasonName?: string }>({
            query: (body) => ({ url: 'league', method: 'POST', body }),
            invalidatesTags: ["league", "season"]
        }),
        renameLeague: builder.mutation<{ id: number; name: string }, { id: number; name: string }>({
            query: ({ id, name }) => ({ url: `league/${id}`, method: 'PUT', body: { name } }),
            invalidatesTags: ["league"]
        }),
        joinLeague: builder.mutation<{ id: number; name: string }, string>({
            query: (code) => ({ url: 'league/join', method: 'POST', body: { code } }),
            invalidatesTags: ["league"]
        }),
        leaveLeague: builder.mutation<void, number>({
            query: (id) => ({ url: `league/${id}/leave`, method: 'POST' }),
            invalidatesTags: ["league"]
        }),
        claimOwnership: builder.mutation<void, number>({
            query: (id) => ({ url: `league/${id}/claim-ownership`, method: 'POST' }),
            invalidatesTags: ["league"]
        }),
        delegateOwnership: builder.mutation<void, { id: number; playerId: number }>({
            query: ({ id, playerId }) => ({ url: `league/${id}/delegate`, method: 'POST', body: { playerId } }),
            invalidatesTags: ["league"]
        }),
        removeMember: builder.mutation<void, { id: number; playerId: number }>({
            query: ({ id, playerId }) => ({ url: `league/${id}/members/${playerId}/remove`, method: 'POST' }),
            invalidatesTags: ["league"]
        }),
        deleteLeague: builder.mutation<void, number>({
            query: (id) => ({ url: `league/${id}`, method: 'DELETE' }),
            invalidatesTags: ["league", "season", "match"]
        }),
    }),
})

export const {
    useGetPlayersQuery,
    useGetMeQuery,
    useGetUnclaimedPlayersQuery,
    useClaimPlayerMutation,
    useCreatePlayerMutation,
    useRenamePlayerMutation,
    usePostMatchMutation,
    useGetSeasonsQuery,
    useGetActiveSeasonQuery,
    useGetSeasonQuery,
    useGetSeasonLeaderboardQuery,
    useGetSeasonLeaderboardsQuery,
    useGetPlayerMatchesQuery,
    useEndSeasonMutation,
    useCreateSeasonMutation,
    useGetLeaguePreviewQuery,
    useGetLeagueInviteQuery,
    useRotateLeagueInviteMutation,
    useGetMyLeaguesQuery,
    useGetLeagueMembersQuery,
    useCreateLeagueMutation,
    useRenameLeagueMutation,
    useJoinLeagueMutation,
    useLeaveLeagueMutation,
    useClaimOwnershipMutation,
    useDelegateOwnershipMutation,
    useRemoveMemberMutation,
    useDeleteLeagueMutation,
} = foosballApi
