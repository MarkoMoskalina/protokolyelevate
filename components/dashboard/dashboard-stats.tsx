import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  CalendarDays,
  ArrowRight,
  FilePlus,
} from "lucide-react";

import type { DashboardStats } from "@/lib/queries/stats";
import { formatDateTime } from "@/lib/utils";

interface DashboardStatsProps {
  stats: DashboardStats;
  userName: string;
}

export function DashboardStatsView({ stats, userName }: DashboardStatsProps) {
  const greeting = getGreeting();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-display-xs font-semibold text-primary">
          {greeting}, {userName}
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          Prehľad protokolov vozidiel ElevateCars
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Celkovo"
          value={stats.totalProtocols}
          icon={FileText}
        />
        <StatCard
          label="Prebiehajúce"
          value={stats.activeProtocols}
          icon={Clock}
          href="/?tab=active"
          accentColor="warning"
        />
        <StatCard
          label="Dokončené"
          value={stats.completedProtocols}
          icon={CheckCircle}
          href="/?tab=completed"
          accentColor="success"
        />
        <StatCard
          label="Tento mesiac"
          value={stats.thisMonthProtocols}
          icon={CalendarDays}
        />
      </div>

      {/* Quick action */}
      <div className="mb-8">
        <Link
          href="/novy"
          className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4 shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
            <FilePlus className="h-5 w-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">Vytvoriť nový protokol</p>
            <p className="text-xs text-tertiary">Odovzdávací alebo preberací protokol</p>
          </div>
          <ArrowRight className="h-4 w-4 text-tertiary" />
        </Link>
      </div>

      {/* Recent protocols */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Posledné protokoly</h2>
          <Link
            href="/?tab=active"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Zobraziť všetky
          </Link>
        </div>

        {stats.recentProtocols.length === 0 ? (
          <div className="rounded-xl border border-secondary bg-primary p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-tertiary" />
            <p className="mt-2 text-sm text-tertiary">
              Zatiaľ žiadne protokoly
            </p>
          </div>
        ) : (
          <div className="divide-y divide-secondary rounded-xl border border-secondary bg-primary shadow-xs">
            {stats.recentProtocols.map((protocol) => (
              <div
                key={protocol.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <FileText className="h-4 w-4 text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-primary">
                    {protocol.customer_first_name} {protocol.customer_last_name}
                  </p>
                  <p className="truncate text-xs text-tertiary">
                    {protocol.car_name} · {protocol.car_license_plate}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-tertiary">
                    {formatDateTime(protocol.created_at)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      protocol.type === "return"
                        ? "text-success-primary"
                        : "text-warning-primary"
                    }`}
                  >
                    {protocol.type === "return" ? "Preberací" : "Odovzdávací"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accentColor,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  href?: string;
  accentColor?: "warning" | "success";
}) {
  const iconColor =
    accentColor === "warning"
      ? "text-warning-primary"
      : accentColor === "success"
        ? "text-success-primary"
        : "text-brand-600";

  const content = (
    <div className="flex flex-col gap-2 rounded-xl border border-secondary bg-primary p-4 shadow-xs transition-colors hover:border-brand-200">
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {href && <ArrowRight className="h-3.5 w-3.5 text-tertiary" />}
      </div>
      <div>
        <p className="text-display-xs font-semibold text-primary">{value}</p>
        <p className="text-xs text-tertiary">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Dobré ráno";
  if (hour < 18) return "Dobrý deň";
  return "Dobrý večer";
}
