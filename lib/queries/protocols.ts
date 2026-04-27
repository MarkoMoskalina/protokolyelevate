import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { DashboardTab, Protocol } from "@/lib/protocols";

interface FetchProtocolsParams {
  tab: DashboardTab;
  search?: string;
}

/**
 * Replace storage paths in `car_photos[0]` with signed URLs so <Image> can render thumbnails.
 * Bucket `protocol-photos` is private, so we sign for 1 hour.
 */
async function attachThumbnails(
  supabase: SupabaseClient<Database>,
  protocols: Protocol[],
): Promise<Protocol[]> {
  const thumbPaths = protocols
    .map((p) => p.car_photos?.[0])
    .filter((path): path is string => !!path && !path.startsWith("http"));

  if (thumbPaths.length === 0) return protocols;

  const { data: signed } = await supabase.storage
    .from("protocol-photos")
    .createSignedUrls(thumbPaths, 60 * 60);

  const signedMap = new Map<string, string>();
  for (const item of signed ?? []) {
    if (item.signedUrl && !item.error && item.path) {
      signedMap.set(item.path, item.signedUrl);
    }
  }

  return protocols.map((p) => {
    const path = p.car_photos?.[0];
    if (!path || path.startsWith("http")) return p;
    const signedUrl = signedMap.get(path);
    if (!signedUrl) return p;
    return {
      ...p,
      car_photos: [signedUrl, ...(p.car_photos ?? []).slice(1)],
    };
  });
}

export async function fetchDashboardProtocols(
  supabase: SupabaseClient<Database>,
  { tab, search }: FetchProtocolsParams,
) {
  let query = supabase
    .from("handover_protocols")
    .select("*")
    .eq("type", "handover")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `customer_first_name.ilike.${term},customer_last_name.ilike.${term},car_license_plate.ilike.${term},reservation_number.ilike.${term}`,
    );
  }

  const { data: handovers, error } = await query;

  if (error) throw error;
  if (!handovers) return [];

  const handoverIds = handovers.map((h) => h.id);

  let returnProtocols: Protocol[] = [];
  if (handoverIds.length > 0) {
    const { data } = await supabase
      .from("handover_protocols")
      .select("*")
      .eq("type", "return")
      .in("handover_protocol_id", handoverIds);

    returnProtocols = data ?? [];
  }

  const handoversWithThumbs = await attachThumbnails(supabase, handovers);

  const returnByHandoverId = new Map(
    returnProtocols.map((r) => [r.handover_protocol_id, r]),
  );

  const protocolsWithReturn = handoversWithThumbs.map((h) => ({
    protocol: h,
    hasReturn: returnByHandoverId.has(h.id),
  }));

  if (tab === "active") {
    return protocolsWithReturn.filter((p) => !p.hasReturn);
  }
  if (tab === "completed") {
    return protocolsWithReturn.filter((p) => p.hasReturn);
  }

  return protocolsWithReturn;
}
