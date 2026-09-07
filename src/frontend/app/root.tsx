import {
    isRouteErrorResponse,
    Links,
    Meta,
    Navigate,
    Outlet,
    Scripts,
    ScrollRestoration,
    NavLink,
    useLocation,
} from "react-router";
import type {Route} from "./+types/root";
import "../index.css";
import {store} from '~/store'
import {Provider, useDispatch} from "react-redux";
import {Toaster} from "sonner";
import {Trophy, Calendar, Swords, BarChart3, Loader2, User} from "lucide-react";
import PlayerProvider from "~/context/PlayerContext/PlayerProvider";
import {AuthProvider, useAuth} from "~/auth/AuthProvider";
import {useGetMyLeaguesQuery} from "../apis/foosball/foosball";
import {useEffect} from "react";
import {setCurrentLeague} from "~/leagueSlice";
import {useCurrentLeague} from "~/lib/useCurrentLeague";
import {Onboarding} from "~/components/Onboarding";
import {LeagueOnboarding} from "~/components/LeagueOnboarding";
import {LeagueChooser} from "~/components/LeagueChooser";

/** Reachable signed out. The invite landing page is here too, so a QR scan works before sign-in. */
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/confirm-email"];

/** Of those, the ones a signed-in user has no business seeing. */
const SIGNED_OUT_ONLY = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Toasts use a custom renderer (see ~/lib/toast). Sonner here is only the
// positioning/animation engine; the visual is fully our own JSX.
const toasterWidth = { "--width": "min(420px, calc(100vw - 2rem))" } as React.CSSProperties;

export const links: Route.LinksFunction = () => [
    {rel: "preconnect", href: "https://fonts.googleapis.com"},
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap",
    },
];

const navItems = [
    {
        to: "/",
        label: "Leaderboard",
        icon: Trophy,
        activeBg: "bg-amber-500 text-white shadow-md",
        activeMobile: "bg-amber-500 text-white shadow-sm"
    },
    {
        to: "/game",
        label: "Play",
        icon: Swords,
        activeBg: "bg-orange-500 text-white shadow-md",
        activeMobile: "bg-orange-500 text-white shadow-sm"
    },
    {
        to: "/seasons",
        label: "Seasons",
        icon: Calendar,
        activeBg: "bg-emerald-500 text-white shadow-md",
        activeMobile: "bg-emerald-500 text-white shadow-sm"
    },
    {
        to: "/stats",
        label: "Stats",
        icon: BarChart3,
        activeBg: "bg-violet-500 text-white shadow-md",
        activeMobile: "bg-violet-500 text-white shadow-sm"
    },
    {
        to: "/profile",
        label: "Profile",
        icon: User,
        activeBg: "bg-sky-500 text-white shadow-md",
        activeMobile: "bg-sky-500 text-white shadow-sm"
    },
];

function AppShell({children}: { children: React.ReactNode }) {
    const {isAuthenticated, isLoading, needsPlayer} = useAuth();
    const dispatch = useDispatch();
    const {pathname} = useLocation();
    const hasFab = pathname === "/" || pathname === "/seasons";

    const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/join/");

    // Which leagues is this player in, and which one is open?
    const {data: myLeagues, isLoading: leaguesLoading} = useGetMyLeaguesQuery(undefined, {
        skip: !isAuthenticated || needsPlayer,
    });
    const currentLeagueId = useCurrentLeague();
    const validCurrent = currentLeagueId != null && (myLeagues?.some(l => l.id === currentLeagueId) ?? false);

    // Exactly one league → open it automatically.
    useEffect(() => {
        if (myLeagues && myLeagues.length === 1 && !validCurrent) {
            dispatch(setCurrentLeague(myLeagues[0].id));
        }
    }, [myLeagues, validCurrent, dispatch]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Signed-out pages render bare; everything else bounces to sign-in.
        return isPublic ? <>{children}</> : <Navigate to="/login" replace/>;
    }

    if (SIGNED_OUT_ONLY.includes(pathname)) {
        return <Navigate to="/" replace/>;
    }

    // /confirm-email and /join/:code stay reachable while signed in — the first so a link still
    // works, the second so scanning a QR code parks the invite before onboarding continues.
    if (isPublic) {
        return <>{children}</>;
    }

    // Onboarding is not skippable: no player, then no league, then the app.
    if (needsPlayer) {
        return <Onboarding/>;
    }

    if (leaguesLoading || !myLeagues) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (myLeagues.length === 0) {
        return <LeagueOnboarding/>;
    }

    if (!validCurrent) {
        // >1 league → pick one; exactly one is auto-selected by the effect above.
        if (myLeagues.length > 1) {
            return <LeagueChooser/>;
        }
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-muted-foreground"/>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
            {/* Desktop top nav */}
            <nav
                className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-24 items-start pt-4 justify-center px-6 bg-gradient-to-b from-background from-50% to-transparent pointer-events-none [&>*]:pointer-events-auto">
                <div className="flex items-center gap-2">
                    <NavLink
                        to="/"
                        aria-label="Eloball home"
                        className="h-11 w-11 rounded-full overflow-hidden shadow-sm ring-1 ring-border transition-transform hover:scale-105"
                    >
                        <img src="/favicon.png" alt="" className="h-full w-full object-cover dark:hidden"/>
                        <img src="/favicon-dark.png" alt="" className="h-full w-full object-cover hidden dark:block"/>
                    </NavLink>
                    <div className="flex items-center gap-1 bg-muted rounded-2xl p-1">
                    {navItems.map(({to, label, icon: Icon, activeBg}) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({isActive}) =>
                                `flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive
                                        ? activeBg
                                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                                }`
                            }
                        >
                            <Icon size={18}/>
                            {label}
                        </NavLink>
                    ))}
                    </div>
                </div>
            </nav>

            {/* Mobile brand mark */}
            <NavLink
                to="/"
                aria-label="Eloball home"
                className="md:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-full overflow-hidden shadow-sm ring-1 ring-border"
            >
                <img src="/favicon.png" alt="" className="h-full w-full object-cover dark:hidden"/>
                <img src="/favicon-dark.png" alt="" className="h-full w-full object-cover hidden dark:block"/>
            </NavLink>

            {/* Page content */}
            <main>{children}</main>

            {/* Mobile bottom gradient — extends above the nav to cover the FAB on routes that have one */}
            <div
                className={`md:hidden fixed left-0 right-0 bottom-0 pointer-events-none z-30 bg-gradient-to-t from-background to-transparent ${
                    hasFab ? "h-40 from-40%" : "h-16 from-60%"
                }`}
            />

            {/* Mobile bottom tabs */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map(({to, label, icon: Icon, activeMobile}) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({isActive}) =>
                                `flex flex-col items-center gap-0.5 flex-1 max-w-20 py-1.5 rounded-xl transition-all duration-200 ${
                                    isActive
                                        ? activeMobile
                                        : "text-muted-foreground"
                                }`
                            }
                        >
                            {({isActive}) => (
                                <>
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2}/>
                                    <span className="text-[10px] font-semibold">
                                        {label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}

export function Layout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <Meta/>
                <Links/>
            </head>
            <body className="bg-background text-foreground">
            <Provider store={store}>
                <AuthProvider>
                <PlayerProvider>
                    <AppShell>{children}</AppShell>
                    {/* Desktop: below the top nav. Mobile: above the bottom tab bar.
                        Two instances because Sonner can't flip top/bottom responsively. */}
                    <Toaster
                        position="top-center"
                        offset="88px"
                        className="eloball-hide-mobile"
                        style={toasterWidth}
                    />
                    <Toaster
                        position="bottom-center"
                        offset="84px"
                        mobileOffset="84px"
                        className="eloball-hide-desktop"
                        style={toasterWidth}
                    />
                </PlayerProvider>
                </AuthProvider>
            </Provider>
            <ScrollRestoration/>
            <Scripts/>
            </body>
        </html>
    );
}

export default function App() {
    return <Outlet/>;
}

export function ErrorBoundary({error}: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1 className="text-2xl font-bold">{message}</h1>
            <p className="mt-2">{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto mt-4 text-sm bg-muted rounded-lg">
          <code>{stack}</code>
        </pre>
            )}
        </main>
    );
}
