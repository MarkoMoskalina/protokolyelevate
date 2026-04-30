"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const LENGTH = 6;

interface PublicCodeGateProps {
  token: string;
  contactEmail?: string;
}

/**
 * Step 2 of the public access flow: the user has a valid (non-expired) token
 * in the URL but still needs to type the 6-digit code from their email.
 *
 * On success we get a signed cookie scoped to /zobrazenie/<token> and we
 * router.refresh() so the server-rendered page re-runs with the cookie set.
 */
export function PublicCodeGate({ token, contactEmail }: PublicCodeGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("kod") || "";

  const [digits, setDigits] = useState<string[]>(() => {
    const arr = Array(LENGTH).fill("");
    const trimmed = initialCode.replace(/\D/g, "").slice(0, LENGTH);
    for (let i = 0; i < trimmed.length; i++) arr[i] = trimmed[i];
    return arr;
  });
  const [submitting, setSubmitting] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const autoSubmittedRef = useRef(false);

  function focusInput(idx: number) {
    inputsRef.current[idx]?.focus();
    inputsRef.current[idx]?.select();
  }

  function handleChange(idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[idx] = "";
      setDigits(next);
      return;
    }

    const next = [...digits];
    for (let i = 0; i < cleaned.length && idx + i < LENGTH; i++) {
      next[idx + i] = cleaned[i];
    }
    setDigits(next);

    const nextEmpty = next.findIndex((d, i) => i >= idx && !d);
    if (nextEmpty !== -1) focusInput(nextEmpty);
    else focusInput(LENGTH - 1);
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) focusInput(idx - 1);
    if (e.key === "ArrowLeft" && idx > 0) focusInput(idx - 1);
    if (e.key === "ArrowRight" && idx < LENGTH - 1) focusInput(idx + 1);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== LENGTH) {
      toast.error("Zadajte celý 6-ciferný kód");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Kód nie je platný");
        // small defence: clear digits and refocus on the first input
        setDigits(Array(LENGTH).fill(""));
        focusInput(0);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Spojenie zlyhalo, skúste to znova");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-submit if a valid code was passed in the URL (one-click email link)
  useEffect(() => {
    if (autoSubmittedRef.current) return;
    if (digits.every((d) => d) && initialCode) {
      autoSubmittedRef.current = true;
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-secondary bg-primary p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-secondary dark:bg-brand-900/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-display-xs font-semibold text-primary">
              Overenie prístupu
            </h1>
            <p className="mt-2 text-sm text-tertiary">
              Pre zobrazenie protokolu zadajte 6-ciferný kód z emailu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex justify-center gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={LENGTH}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-12 w-10 rounded-lg border border-primary bg-primary text-center font-mono text-lg font-bold text-primary outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 sm:h-14 sm:w-12 sm:text-xl"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || digits.some((d) => !d)}
              className="w-full rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Overujem..." : "Zobraziť protokol"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-tertiary">
          Kód ste nedostali alebo nefunguje?{" "}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-primary hover:underline"
            >
              Kontaktujte nás
            </a>
          ) : (
            "Kontaktujte autopožičovňu."
          )}
        </p>
      </div>
    </div>
  );
}
