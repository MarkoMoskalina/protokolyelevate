import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface DashboardStats {
  totalProtocols: number;
  activeProtocols: number;
  completedProtocols: number;
  thisMonthProtocols: number;
  recentProtocols: {
    id: string;
    customer_first_name: string;
    customer_last_name: string;
    car_name: string;
    car_license_plate: string;
    created_at: string;
    type: "handover" | "return";
  }[];
}

export async function fetchDashboardStats(
  supabase: SupabaseClient<Database>,
): Promise<DashboardStats> {
  const { data: handovers, error: hErr } = await supabase
    .from("handover_protocols")
    .select("id, created_at")
    .eq("type", "handover");

  if (hErr) throw hErr;

  const { data: returns, error: rErr } = await supabase
    .from("handover_protocols")
    .select("id, handover_protocol_id")
    .eq("type", "return");

  if (rErr) throw rErr;

  const returnHandoverIds = new Set(
    (returns ?? []).map((r) => r.handover_protocol_id),
  );

  const allHandovers = handovers ?? [];
  const totalProtocols = allHandovers.length;
  const completedProtocols = allHandovers.filter((h) =>
    returnHandoverIds.has(h.id),
  ).length;
  const activeProtocols = totalProtocols - completedProtocols;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthProtocols = allHandovers.filter(
    (h) => h.created_at >= startOfMonth,
  ).length;

  const { data: recent, error: recentErr } = await supabase
    .from("handover_protocols")
    .select(
      "id, customer_first_name, customer_last_name, car_name, car_license_plate, created_at, type",
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentErr) throw recentErr;

  return {
    totalProtocols,
    activeProtocols,
    completedProtocols,
    thisMonthProtocols,
    recentProtocols: (recent ?? []) as DashboardStats["recentProtocols"],
  };
}
