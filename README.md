# Eloball

Eloball is a foosball ELO rating tracker. Players sign up, join a league, and record 1v1 and 2v2 results; every match updates each player's rating for the current season. A league runs any number of seasons, and each new season starts everyone at 1000.

## Features

- **Accounts** — email and password sign-up with email confirmation, password reset, "remember me" (30-day sliding session), and self-service account deletion
- **Leagues** — every player belongs to at least one league. Join with an invite link or QR code, browse public leagues, or create your own. Owners can rename, rotate the invite code, make the league public, hand over ownership, and remove members
- **Match recording** — pick players onto Red and Blue, 1v1 or 2v2, and flag an egg (a 10–0 shutout)
- **Leaderboard** — the current season's standings, with eggs given and received
- **Seasons** — any league member can start and end seasons; past seasons keep their full leaderboards and an ELO chart
- **Stats** — per-player records, including eggs delivered and received
- **Sharing** — a QR code for a league invite, or for Eloball itself, that can be copied as an image, downloaded or printed
- **Dark mode** — follows the system setting

## Tech stack

**Frontend** — React 19, React Router v7 (SPA mode), TypeScript, Tailwind CSS v4, shadcn/ui, Redux Toolkit / RTK Query, Recharts. Hosted on Azure Static Web Apps at `eloball.billigeterninger.dk`.

**Backend** — .NET 8 Web API with Entity Framework Core and SQL Server. Authentication is ASP.NET Core Identity with a cookie session. Email goes through [Resend](https://resend.com). Hosted on Azure App Service at `api.billigeterninger.dk`.

## How accounts and players fit together

```
AspNetUsers ──1:0..1──> userProfile ──0..1:1──> player ──> playerMatch / playerSeason
 (login)                 (the link)              (who you are in the game)   leagueMembership
```

A login is linked to one player. A new user either claims an existing player from a league they hold the invite for, or creates a new one. Deleting an account removes the login, the profile and every league membership, but keeps the player and its matches, because everyone else's ratings were earned against them.

Accounts that predate the move off Auth0 still have their `userProfile` row. When such a user signs up again with the same email, the first request after login links the new account back to their player and history.

## Project structure

```
migrations/                       # Forward-only SQL migrations, applied on API startup
src/
├── api/                          # .NET 8 backend
│   ├── Auth/                     # ProfileResolver (login → player), Identity email sender
│   ├── Controllers/              # Auth, League, Player, Match, Season, Health
│   ├── Database/                 # EF Core context and entities
│   ├── MigrationRunner.cs        # DbUp: runs /migrations on startup
│   └── Program.cs
└── frontend/                     # React SPA
    ├── apis/foosball/            # RTK Query API + shared types
    ├── app/
    │   ├── auth/                 # AuthProvider, auth API calls
    │   ├── components/           # QR sharing, dialogs, onboarding, shadcn/ui
    │   ├── routes/               # leaderboard, game, seasons, stats, profile,
    │   │                         # login, signup, password reset, confirm email, join
    │   └── root.tsx              # App shell: auth and league gates, navigation
    └── index.css                 # Tailwind + design tokens
```

## API

All endpoints are under `/api` and need a signed-in session unless marked public. League, player, season and match data is only visible to members of that league.

| Area | Endpoints |
|------|-----------|
| Auth | `POST auth/login`, `POST auth/logout`, `GET auth/me`, `POST auth/delete-account` |
| Identity (public) | `POST identity/register`, `GET identity/confirmEmail`, `POST identity/resendConfirmationEmail`, `POST identity/forgotPassword`, `POST identity/resetPassword`. Signed in: `POST identity/manage/info` (change password) |
| Leagues | `GET league/mine`, `GET league/public`, `GET league/preview?code=` (public), `POST league`, `POST league/join`, `GET league/{id}/members`, `GET league/{id}/invite`, plus owner actions: rename, rotate invite, visibility, delegate, remove member, delete |
| Players | `GET player?leagueId=`, `GET player/me`, `PUT player/me`, `GET player/unclaimed`, `POST player/claim`, `POST player` |
| Seasons | `GET season?leagueId=`, `GET season/active?leagueId=`, `GET season/{id}`, `GET season/{id}/leaderboard`, `POST season`, `POST season/{id}/end` |
| Matches | `POST match` |

## Local development

Prerequisites: Docker, the .NET 8 SDK and Node 20.

```bash
# 1. SQL Server
docker compose up -d

# 2. API on http://localhost:5260. Pending migrations run on startup.
#    The local connection string is in appsettings.Development.json.
cd src/api
dotnet user-secrets set "Resend:ApiKey" "re_..."   # optional, see below
dotnet run

# 3. Frontend on http://localhost:5173
cd src/frontend
pnpm install
pnpm dev
```

`scripts/setup-db.sh` loads a production dump from `database/` into the local database. Dumps contain real user data, so keep them out of git.

**Email locally.** Without a Resend key, the API runs in Development with a no-op sender: sign-up works, but no confirmation email is sent. Either set a key, or set `Auth:RequireConfirmedEmail` to `false` so unconfirmed accounts can log in.

**Checks.** `pnpm typecheck` in `src/frontend`, `dotnet build` in `src/api`.

## Configuration

| Setting | Where | Notes |
|---------|-------|-------|
| `ConnectionStrings:DefaultConnection` | `appsettings.Development.json` / App Service | SQL Server |
| `Resend:ApiKey` | user-secrets / App Service as `Resend__ApiKey` | **Required outside Development**: the API won't start without it |
| `Resend:From` | `appsettings.json` | Sending address. Its domain must be verified in Resend |
| `Frontend:BaseUrl` | `appsettings.json` | Where links in emails point |
| `Cors:AllowedOrigins` | `appsettings.json` | Must list the SPA origin; the session cookie needs credentialed CORS |
| `Auth:RequireConfirmedEmail` | optional, default `true` | Emergency switch if email delivery breaks |
| `RunMigrationsOnStartup` | optional, default `true` | Set to `false` to run migrations out-of-band |
| `VITE_API_URL` | `src/frontend/.env*` | API base URL used by the SPA |

## Deployment

Pushing to `master` runs two GitHub Actions workflows: `deploy-api.yml` (App Service) and `deploy-frontend.yml` (Static Web Apps, only when `src/frontend/**` changes). On startup the API applies any new scripts in `migrations/`, tracked in `dbo.SchemaVersions`. If a migration fails, the API doesn't start.

## License

MIT
