# Eloball

ELO rating system for foosball matches. Track players, submit match results, and view rankings.

## Frontend Stack

- **Framework**: React 19 + React Router v7 (SPA mode, SSR disabled)
- **Build**: Vite 5 with `npm` as package manager
- **Language**: TypeScript (strict mode, ES2022 target)
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style) + class-variance-authority
- **State**: Redux Toolkit / RTK Query (server state), React Context (local UI state)
- **Notifications**: Sonner toasts
- **Dark mode**: Supported via `.dark` class (next-themes)

## Commands

```bash
cd src/frontend
npm run dev          # Dev server
npm run build        # Production build
npm run typecheck    # Type checking
```

## Frontend Structure

```
src/frontend/
├── app/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives (Button, Card, Input, Sonner)
│   │   ├── PlayerCard/            # Player display with ELO bar + team selection
│   │   ├── SubmitMatchButton/     # Match submission form
│   │   └── welcome/               # Main page layout
│   ├── context/PlayerContext/     # Team selection state (addPlayer/removePlayer)
│   ├── lib/utils.ts               # cn() helper (clsx + tailwind-merge)
│   ├── routes/home.tsx            # Single route → Welcome component
│   ├── routes.ts                  # Route config
│   ├── store.ts                   # Redux store (RTK Query only)
│   └── root.tsx                   # App shell, providers, error boundary
├── apis/foosball/
│   ├── foosball.ts                # RTK Query API (baseUrl: https://api.billigeterninger.dk/api/)
│   └── types.ts                   # Shared types: Player, PlayerTeam, Match, SubmitMatch
└── public/                        # Static assets (logo.png, logo-dark.png)
```

## Conventions

- **Path alias**: `~` maps to `./app/*` — use for component/context imports
- **Component files**: PascalCase directories, camelCase filenames (e.g., `PlayerCard/playerCard.tsx`)
- **Exports**: Named exports for components (`export function PlayerCard`)
- **Types**: Defined in `apis/foosball/types.ts`, use `import type` for type-only imports
- **Styling**: Tailwind utility classes, use `cn()` for conditional class merging
- **Teams**: Team 1 = Red, Team 2 = Blue

## API Endpoints

- `GET /player` — All players
- `POST /match` — Submit match result (`{ teamWonId, matches: [{ playerId, teamId }] }`)

RTK Query handles caching and invalidation — submitting a match auto-refetches players.

## Backend (C# / .NET 8)

Located in `src/api/`. Uses Entity Framework Core with SQL Server. Not the current development focus.
