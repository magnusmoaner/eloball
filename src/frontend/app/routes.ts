import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/leaderboard.tsx"),
    route("seasons", "routes/seasons.tsx"),
    route("seasons/:id", "routes/season-detail.tsx"),
    route("game", "routes/game.tsx"),
    route("stats", "routes/stats.tsx"),
    route("profile", "routes/profile.tsx"),

    // Signed-out flows. AppShell renders these without the app chrome or the onboarding gates.
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
    route("reset-password", "routes/reset-password.tsx"),
    route("confirm-email", "routes/confirm-email.tsx"),
    route("join/:code", "routes/join.tsx"),
] satisfies RouteConfig;
