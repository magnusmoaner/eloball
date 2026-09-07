/**
 * Thin fetch wrappers over the auth endpoints. Everything here relies on the session cookie, so
 * every call must send credentials — there is no token to attach.
 *
 * Login / logout / me are ours (`auth/*`); registration, confirmation and password reset are
 * ASP.NET Identity's own, mounted under `identity/*`.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "https://api.billigeterninger.dk/api/";

export interface Me {
    email: string;
    emailConfirmed: boolean;
    playerId: number | null;
    playerName: string | null;
}

/** Distinguishable because our /login surfaces SignInResult instead of a blanket 401. */
export type LoginErrorCode =
    | "invalid_credentials"
    | "email_not_confirmed"
    | "locked_out"
    | "network";

export class AuthError extends Error {
    constructor(readonly code: LoginErrorCode | string, message: string) {
        super(message);
    }
}

function url(path: string) {
    return API_BASE_URL + path;
}

async function post(path: string, body?: unknown): Promise<Response> {
    return fetch(url(path), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

/** Identity replies with a ProblemDetails whose `errors` map holds the useful text. */
async function identityError(res: Response, fallback: string): Promise<AuthError> {
    try {
        const data = await res.json();
        const detail = data?.detail as string | undefined;
        const errors = data?.errors as Record<string, string[]> | undefined;
        const first = errors ? Object.entries(errors)[0] : undefined;
        if (first) return new AuthError(first[0], first[1]?.[0] ?? fallback);
        if (detail) return new AuthError(data?.title ?? "error", detail);
    } catch {
        /* fall through */
    }
    return new AuthError("error", fallback);
}

export async function fetchMe(): Promise<Me | null> {
    const res = await fetch(url("auth/me"), { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) throw new AuthError("network", "Couldn't reach the server.");
    return res.json();
}

export async function login(email: string, password: string, rememberMe: boolean): Promise<void> {
    const res = await post("auth/login", { email, password, rememberMe });
    if (res.ok) return;

    let code = "invalid_credentials";
    try {
        code = (await res.json())?.error ?? code;
    } catch {
        /* keep the default */
    }
    throw new AuthError(code, messageForLogin(code));
}

function messageForLogin(code: string): string {
    switch (code) {
        case "email_not_confirmed":
            return "Confirm your email address before signing in.";
        case "locked_out":
            return "Too many failed attempts. Try again in a few minutes.";
        default:
            return "Wrong email or password.";
    }
}

export async function logout(): Promise<void> {
    await post("auth/logout");
}

export async function register(email: string, password: string): Promise<void> {
    const res = await post("identity/register", { email, password });
    if (!res.ok) throw await identityError(res, "Couldn't create your account.");
}

export async function resendConfirmation(email: string): Promise<void> {
    // Always 200, even for an unknown address — Identity refuses to confirm who is registered.
    await post("identity/resendConfirmationEmail", { email });
}

export async function forgotPassword(email: string): Promise<void> {
    await post("identity/forgotPassword", { email });
}

export async function resetPassword(email: string, resetCode: string, newPassword: string): Promise<void> {
    const res = await post("identity/resetPassword", { email, resetCode, newPassword });
    if (!res.ok) throw await identityError(res, "That reset link has expired. Request a new one.");
}

export async function confirmEmail(userId: string, code: string): Promise<void> {
    const res = await fetch(
        url(`identity/confirmEmail?userId=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}`),
        { credentials: "include" },
    );
    if (!res.ok) throw new AuthError("invalid_token", "That confirmation link is invalid or has expired.");
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const res = await post("identity/manage/info", { oldPassword, newPassword });
    if (!res.ok) throw await identityError(res, "Couldn't change your password.");
}
