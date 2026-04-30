import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const SIGNED_URL_TTL_SEC = 60 * 60;

/**
 * Loads the saved employee signature for the given user and returns a
 * short-lived signed URL pointing at it, or null if the user hasn't saved
 * one yet. The signed URL is what `<SignaturePad>` expects as its `value`
 * (it renders it inside `<img>`); the underlying storage path is later
 * extracted by the form's `uploadOrKeep` helper, so the protocol record
 * ends up referencing the same PNG without re-uploading.
 *
 * Errors are swallowed and return null — a missing/expired signature
 * should never block protocol creation.
 */
export async function getCurrentEmployeeSignedSignatureUrl(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data: settings, error } = await supabase
    .from("protocol_user_settings")
    .select("signature_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !settings?.signature_url) return null;

  const { data: signed } = await supabase.storage
    .from("protocol-photos")
    .createSignedUrl(settings.signature_url, SIGNED_URL_TTL_SEC);

  return signed?.signedUrl ?? null;
}
