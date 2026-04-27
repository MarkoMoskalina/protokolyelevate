"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Nesprávny email alebo heslo";
  if (message.includes("Email not confirmed"))
    return "Email ešte nebol overený";
  if (message.includes("Too many requests"))
    return "Príliš veľa pokusov, skúste neskôr";
  if (message.includes("User not found"))
    return "Účet s týmto emailom neexistuje";
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notAdmin, setNotAdmin] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotAdmin(false);

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Prihlásenie zlyhalo");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", authData.user.id)
      .single();

    if (!profile?.is_admin) {
      await supabase.auth.signOut();
      setNotAdmin(true);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  if (notAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-secondary bg-primary p-8 shadow-lg">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-primary">
                <ShieldAlert className="h-6 w-6 text-error-primary" />
              </div>
              <h1 className="text-lg font-semibold text-primary">
                Prístup zamietnutý
              </h1>
              <p className="text-sm text-tertiary">
                Táto aplikácia je určená výhradne pre zamestnancov ElevateCars.
                Váš účet nemá oprávnenie na prístup.
              </p>
              <div className="flex w-full flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setNotAdmin(false);
                    setEmail("");
                    setPassword("");
                  }}
                  className="w-full rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary_hover"
                >
                  Skúsiť iný účet
                </button>
                <a
                  href={process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://elevatecars.sk"}
                  className="w-full rounded-lg bg-brand-solid px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover"
                >
                  Prejsť na elevatecars.sk
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-secondary bg-primary p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-display-xs font-semibold text-primary">
              Protokoly
            </h1>
            <p className="mt-2 text-sm text-tertiary">
              Prihláste sa pre prístup k protokolom
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-error-primary px-3.5 py-2.5 text-sm text-error-primary">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="vas@email.sk"
                required
                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-secondary"
              >
                Heslo
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2.5 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Prihlasujem..." : "Prihlásiť sa"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-tertiary">
          Prístup len pre zamestnancov ElevateCars
        </p>
      </div>
    </div>
  );
}
