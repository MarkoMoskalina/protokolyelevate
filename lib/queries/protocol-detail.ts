import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { Protocol } from "@/lib/protocols";

export interface DamageItem {
  description: string;
  photo_urls: string[];
}

export interface LinkedHandoverInfo {
  id: string;
  protocol_datetime: string | null;
  mileage_km: number | null;
  fuel_level: string | null;
  allowed_km: number | null;
  deposit_amount: number | null;
  deposit_method: string | null;
}

export interface ProtocolDetail extends Protocol {
  /** All photo fields with raw paths replaced by signed URLs */
  damages_signed: DamageItem[];
  /** PDF signed URL (or null if not generated yet) */
  pdf_signed_url: string | null;
  /** For return protocols: snapshot of the linked handover (deposit, allowance, etc.) */
  linked_handover: LinkedHandoverInfo | null;
}

/**
 * Sign multiple paths from a private bucket. Paths starting with `http`
 * are treated as already-signed/public URLs and passed through.
 */
async function signMany(
  supabase: SupabaseClient<Database>,
  bucket: string,
  paths: string[],
  expirySec = 60 * 60,
): Promise<Map<string, string>> {
  const cleanPaths = paths.filter((p) => p && !p.startsWith("http"));
  const map = new Map<string, string>();
  if (cleanPaths.length === 0) return map;

  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(cleanPaths, expirySec);

  for (const item of data ?? []) {
    if (item.signedUrl && !item.error && item.path) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
}

/**
 * Fetch a protocol by ID and replace all `protocol-photos` paths with signed URLs
 * so they can be rendered directly. Damages are also expanded with signed URLs.
 */
export async function fetchProtocolDetail(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ProtocolDetail | null> {
  const { data: protocol, error } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !protocol) return null;

  // Collect every storage path that needs signing.
  const damages = (protocol.damages as unknown as DamageItem[] | null) || [];

  const photoPaths: string[] = [
    ...(protocol.car_photos ?? []),
    protocol.mileage_photo_url,
    protocol.fuel_photo_url,
    protocol.customer_id_card_front_url,
    protocol.customer_id_card_back_url,
    protocol.customer_driver_license_url,
    protocol.signature_landlord_url,
    protocol.signature_tenant_url,
    ...damages.flatMap((d) => d.photo_urls ?? []),
  ].filter((v): v is string => !!v);

  const signedMap = await signMany(supabase, "protocol-photos", photoPaths);

  const sign = (p: string | null | undefined): string | null => {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    return signedMap.get(p) ?? null;
  };

  // PDF lives in protocol-documents bucket
  let pdfSignedUrl: string | null = null;
  if (protocol.pdf_url) {
    const { data: pdfSigned } = await supabase.storage
      .from("protocol-documents")
      .createSignedUrl(protocol.pdf_url, 60 * 60);
    pdfSignedUrl = pdfSigned?.signedUrl ?? null;
  }

  // For return protocols, attach a snapshot of the source handover so the UI
  // can show deposit/allowance/handover-mileage without re-fetching client-side.
  let linkedHandover: LinkedHandoverInfo | null = null;
  if (protocol.type === "return" && protocol.handover_protocol_id) {
    const { data: h } = await supabase
      .from("handover_protocols")
      .select(
        "id, protocol_datetime, mileage_km, fuel_level, allowed_km, deposit_amount, deposit_method",
      )
      .eq("id", protocol.handover_protocol_id)
      .maybeSingle();
    if (h) linkedHandover = h;
  }

  return {
    ...protocol,
    car_photos: (protocol.car_photos ?? [])
      .map((p) => sign(p))
      .filter((v): v is string => !!v),
    mileage_photo_url: sign(protocol.mileage_photo_url),
    fuel_photo_url: sign(protocol.fuel_photo_url),
    customer_id_card_front_url: sign(protocol.customer_id_card_front_url),
    customer_id_card_back_url: sign(protocol.customer_id_card_back_url),
    customer_driver_license_url: sign(protocol.customer_driver_license_url),
    signature_landlord_url: sign(protocol.signature_landlord_url),
    signature_tenant_url: sign(protocol.signature_tenant_url),
    damages_signed: damages.map((d) => ({
      description: d.description,
      photo_urls: (d.photo_urls ?? [])
        .map((p) => sign(p))
        .filter((v): v is string => !!v),
    })),
    pdf_signed_url: pdfSignedUrl,
    linked_handover: linkedHandover,
  };
}

/**
 * Fetch a protocol by 6-digit access code (used for the public view).
 * Returns null if no match.
 */
export async function fetchProtocolByAccessCode(
  supabase: SupabaseClient<Database>,
  accessCode: string,
): Promise<ProtocolDetail | null> {
  const trimmed = accessCode.trim();
  if (!trimmed || trimmed.length !== 6) return null;

  const { data: row } = await supabase
    .from("handover_protocols")
    .select("id")
    .eq("access_code", trimmed)
    .neq("status", "draft")
    .maybeSingle();

  if (!row) return null;

  return fetchProtocolDetail(supabase, row.id);
}
