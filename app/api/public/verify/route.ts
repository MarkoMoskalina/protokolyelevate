import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
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
 *   - Always returns identical { error } body for any failure to avoid
 *     leaking which check failed (token vs code vs expiry).
 *   - On success: sets an HTTP-only signed cookie scoped to this token and
 *     returns { ok: true }. Client then navigates to /zobrazenie/<token>.
 *
 * NOTE: rate limiting is intentionally not implemented yet — that's a later
 * deliverable. With 256-bit tokens guessing the URL is intractable, but the
 * 6-digit code can still be brute forced from a known token (1M tries).
 */
export async function POST(request: Request) {
  const genericError = NextResponse.json(
    { error: "Kód nie je platný alebo platnosť linku vypršala" },
    { status: 400 },
  );

  try {
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
