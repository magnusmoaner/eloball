import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./authApi";
import type { Me } from "./authApi";

interface AuthContextValue {
    user: Me | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    /** True once signed in but before a player has been claimed or created. */
    needsPlayer: boolean;
    login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
    logout: () => Promise<void>;
    /** Re-reads the session — call after claiming a player so the shell moves on. */
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Me | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setUser(await api.fetchMe());
        } catch {
            // Server unreachable — treat as signed out rather than hanging on a spinner forever.
            setUser(null);
        }
    }, []);

    // One request at boot replaces Auth0's silent-auth round trip: the cookie either resolves to
    // an account or it doesn't.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const me = await api.fetchMe().catch(() => null);
                if (!cancelled) setUser(me);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = useCallback(
        async (email: string, password: string, rememberMe: boolean) => {
            await api.login(email, password, rememberMe);
            await refresh();
        },
        [refresh],
    );

    const logout = useCallback(async () => {
        await api.logout();
        setUser(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: user != null,
            isLoading,
            needsPlayer: user != null && user.playerId == null,
            login,
            logout,
            refresh,
        }),
        [user, isLoading, login, logout, refresh],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
