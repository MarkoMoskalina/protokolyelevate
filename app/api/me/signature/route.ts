import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SEC = 60 * 60;

/**
 * GET /api/me/signature
 *
 * Returns the saved employee signature for the currently authenticated user as
 * a short-lived signed URL plus the underlying storage path. The signed URL is
 * suitable for direct rendering in `<img>`; the path is round-tripped to the
 * server when starting a protocol so we don't re-upload the same PNG.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings, error } = await supabase
    .from("protocol_user_settings")
    .select("signature_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const path = settings?.signature_url ?? null;

  if (!path) {
    return NextResponse.json({ path: null, signedUrl: null });
  }

  const { data: signed } = await supabase.storage
    .from("protocol-photos")
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  return NextResponse.json({
    path,
    signedUrl: signed?.signedUrl ?? null,
  });
}

/**
 * PUT /api/me/signature
 *
 * Body: { path: string | null }
 *
 * Upserts the signature path for the current user. The PNG itself is uploaded
 * via the regular `/api/upload` endpoint first, then this endpoint just stores
 * the resulting path. Passing `path: null` clears the saved signature.
 */
export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = (body as { path?: unknown })?.path;

  if (path !== null && typeof path !== "string") {
    return NextResponse.json(
      { error: "`path` must be a string or null" },
      { status: 400 },
    );
  }

  // Defensive guard: only accept paths that live inside the
  // employee-signatures/<userId>/ folder. This prevents a malicious client
  // from pointing the row at someone else's storage objects.
  if (typeof path === "string" && path.length > 0) {
    const expectedPrefix = `employee-signatures/${user.id}/`;
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Invalid signature path" },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase
    .from("protocol_user_settings")
    .upsert(
      {
        user_id: user.id,
        signature_url: path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
