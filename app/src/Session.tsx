import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { demoMode } from "./data";
const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export default function Session({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    "loading" | "signed-out" | "signed-in" | "error"
  >(demoMode ? "signed-in" : "loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function session() {
    setState("loading");
    setError("");
    try {
      const response = await fetch(`${base}/auth/session`, {
        credentials: "include",
      });
      if (response.status === 401) {
        setState("signed-out");
        return;
      }
      if (!response.ok)
        throw new Error(`Session check failed (${response.status}).`);
      setState("signed-in");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Cannot connect to authentication server.",
      );
      setState("error");
    }
  }
  useEffect(() => {
    if (!demoMode) void session();
  }, []);
  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch(`${base}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Email or password is incorrect."
            : `Sign-in failed (${response.status}).`,
        );
      setState("signed-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  if (state === "signed-in")
    return (
      <>
        {children}
        {!demoMode && (
          <button
            className="session-signout"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const response = await fetch(`${base}/auth/logout`, {
                  method: "POST",
                  credentials: "include",
                });
                if (!response.ok)
                  throw new Error("Sign out failed. Please retry.");
                setState("signed-out");
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out
          </button>
        )}
        {error && (
          <div className="session-error" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}
      </>
    );
  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-icon">
            <Activity size={24} />
          </span>
          rally<span>sync</span>
        </div>
        <span className="eyebrow">TOURNAMENT WORKSPACE</span>
        <h1>Welcome to the court.</h1>
        <p>Sign in to manage your tournaments and keep every rally in sync.</p>
        {state === "loading" ? (
          <p role="status">Checking your session…</p>
        ) : state === "error" ? (
          <button className="button" onClick={() => void session()}>
            Retry connection
          </button>
        ) : (
          <form onSubmit={signIn}>
            <label className="field">
              Email
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p>
              Need an account or password reset? Contact your platform
              administrator.
            </p>
          </form>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
