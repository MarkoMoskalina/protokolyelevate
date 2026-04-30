import { Suspense } from "react";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardProtocols } from "@/lib/queries/protocols";
import { fetchDashboardStats } from "@/lib/queries/stats";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import { ProtocolList } from "@/components/dashboard/protocol-list";
import { DashboardStatsView } from "@/components/dashboard/dashboard-stats";
import type { DashboardTab } from "@/lib/protocols";

interface DashboardPageProps {
  searchParams: Promise<{ tab?: string; q?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const tab = params.tab as DashboardTab | undefined;
  const search = params.q || "";

  const supabase = await createClient();

  if (!tab) {
    const { user } = await requireAdmin();
    const stats = await fetchDashboardStats(supabase);
    const userName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";

    return <DashboardStatsView stats={stats} userName={userName} />;
  }

  const protocols = await fetchDashboardProtocols(supabase, { tab, search });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-lg font-semibold text-primary">
        {tab === "active" ? "Prebiehajúce protokoly" : tab === "completed" ? "História protokolov" : "Všetky protokoly"}
      </h1>

      <div className="mb-4">
        <Suspense>
          <DashboardSearch initialSearch={search} />
        </Suspense>
      </div>

      <ProtocolList protocols={protocols} />
    </div>
  );
}
