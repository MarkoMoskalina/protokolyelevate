import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifyRateLimit } from "@/lib/rate-limit";
import {
  buildAccessCookieValue,
  codesMatch,
  isAccessExpired,
  isValidCodeFormat,
  isValidTokenFormat,
} from "@/lib/public-access";

export const runtime = "nodejs";

/**
 * Verify a public protocol access attempt.
 *
 * Body: { token: string (64-hex), code: string (6 digits) }
 *
 * Behaviour:
 *   - Rate-limited to 5 attempts per 15 minutes per IP (Upstash sliding window).
 *   - Always returns identical { error } body for any failure to avoid
 *     leaking which check failed (token vs code vs expiry).
 *   - On success: sets an HTTP-only signed cookie scoped to this token and
 *     returns { ok: true }. Client then navigates to /zobrazenie/<token>.
 */
export async function POST(request: Request) {
  const genericError = NextResponse.json(
    { error: "Kód nie je platný alebo platnosť linku vypršala" },
    { status: 400 },
  );

  try {
    // --- Rate limiting (fail-open if Redis is unavailable) ---
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const rateLimit = getVerifyRateLimit();
    if (rateLimit) {
      try {
        const { success } = await rateLimit.limit(ip);
        if (!success) {
          return NextResponse.json(
            { error: "Príliš veľa pokusov. Skúste to znova o 15 minút." },
            { status: 429 },
          );
        }
      } catch {
        // Redis unavailable — allow request through (fail-open)
      }
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim().toLowerCase();
    const code = String(body.code || "").trim();

    if (!isValidTokenFormat(token)) return genericError;
    if (!isValidCodeFormat(code)) return genericError;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("handover_protocols")
      .select("id, access_code, access_expires_at, status")
      .eq("access_token", token)
      .neq("status", "draft")
      .maybeSingle();

    if (error || !data) return genericError;
    if (!codesMatch(code, data.access_code)) return genericError;
    if (isAccessExpired(data.access_expires_at)) {
      return NextResponse.json(
        { error: "Platnosť linku vypršala", expired: true },
        { status: 410 },
      );
    }

    // success — issue signed cookie scoped to this token
    const cookie = buildAccessCookieValue(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/zobrazenie/${token}`,
      maxAge: cookie.maxAge,
    });
    return res;
  } catch (err) {
    console.error("verify access error", err);
    return genericError;
  }
}
