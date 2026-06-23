import type { Route } from "./+types/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";

type AuthMode = "signin" | "signup";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign in | Resumind" },
    { name: "description", content: "Sign in to access Resumind." },
  ];
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const redirectIfSignedIn = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && session?.user) {
        navigate("/", { replace: true });
      }
    };

    redirectIfSignedIn();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const authResponse =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

    setIsSubmitting(false);

    if (authResponse.error) {
      setError(authResponse.error.message);
      return;
    }

    if (mode === "signup" && !authResponse.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    navigate("/", { replace: true });
  };

  const handleGoogleSignup = async () => {
    setError("");
    setMessage("");
    setIsGoogleSubmitting(true);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    setIsGoogleSubmitting(false);

    if (googleError) {
      setError(googleError.message);
    }
  };

  return (
    <main className="auth-page bg-[url('/images/bg-auth.svg')] bg-cover">
      <section className="auth-shell">
        <div className="auth-header">
          <h1>{mode === "signup" ? "Create Your Account" : "Welcome Back"}</h1>
          <p>
            {mode === "signup"
              ? "Sign up to start tracking applications and resume ratings."
              : "Sign in to continue to your resume workspace."}
          </p>
        </div>
        <div className="auth-panel">
          <div className="auth-toggle" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-div">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-div">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}

            <button
              type="submit"
              className="auth-button"
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "signup"
                  ? "Sign up with email"
                  : "Sign in with email"}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <p>or</p>
            <span />
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting || isGoogleSubmitting}
          >
            <img
              src="/icons/googleicon.svg"
              alt="Google"
              aria-hidden="true"
              className="size-5"
            />
            {isGoogleSubmitting
              ? "Opening Google..."
              : mode === "signup"
                ? "Sign up with Google"
                : "Sign in with Google"}
          </button>
        </div>
      </section>
    </main>
  );
}
