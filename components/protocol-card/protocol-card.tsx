"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Undo2, Gauge } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Protocol } from "@/lib/protocols";
import { getProtocolStatusLabel, getProtocolStatusVariant } from "@/lib/protocols";

interface ProtocolCardProps {
  protocol: Protocol;
  hasReturn: boolean;
}

const statusStyles = {
  warning: "bg-amber-500/90 text-white",
  success: "bg-emerald-500/90 text-white",
} as const;

function formatDate(iso: string | null) {
  if (!iso) return { day: "—", time: "" };
  const d = new Date(iso);
  const day = d.toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" });
  const time = d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
  return { day, time };
}

function getDayCount(pickup: string | null, dropoff: string | null): number | null {
  if (!pickup || !dropoff) return null;
  const ms = new Date(dropoff).getTime() - new Date(pickup).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function ProtocolCard({ protocol, hasReturn }: ProtocolCardProps) {
  const statusLabel = getProtocolStatusLabel(protocol, hasReturn);
  const statusVariant = getProtocolStatusVariant(protocol, hasReturn);
  const isHandover = protocol.type === "handover";

  const thumb = protocol.car_photos?.[0];
  const pickup = formatDate(protocol.protocol_datetime);
  const dropoff = formatDate(protocol.expected_return_datetime);
  const days = getDayCount(protocol.protocol_datetime, protocol.expected_return_datetime);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-secondary bg-primary shadow-xs transition-shadow hover:shadow-sm">
      {/* Car image */}
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-secondary">
        {thumb ? (
          <Image
            src={thumb}
            alt={protocol.car_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-quaternary">
            Bez fotky
          </div>
        )}

        <span
          className={cn(
            "absolute left-3 top-3 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm",
            statusStyles[statusVariant],
          )}
        >
          {statusLabel}
        </span>

        {protocol.mileage_km != null && protocol.mileage_km > 0 && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            <Gauge className="h-3.5 w-3.5" />
            {protocol.mileage_km.toLocaleString("sk-SK")} km
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-base font-semibold text-primary">
            {protocol.car_name || "Neznáme auto"}
          </p>
          <span className="shrink-0 text-xs font-medium text-tertiary">
            {protocol.car_license_plate}
          </span>
        </div>

        <p className="mt-0.5 text-sm text-secondary">
          {protocol.customer_first_name} {protocol.customer_last_name}
          {protocol.reservation_number && (
            <span className="text-tertiary"> &middot; {protocol.reservation_number}</span>
          )}
        </p>

        {/* Date timeline */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-primary bg-secondary px-4 py-2.5">
          <div className="text-center">
            <p className="text-xs font-medium text-tertiary">Prevzatie</p>
            <p className="text-sm font-semibold text-primary">{pickup.day}</p>
            <p className="text-xs text-tertiary">{pickup.time}</p>
          </div>

          <div className="flex items-center gap-1.5 text-tertiary">
            <ArrowRight className="h-3.5 w-3.5" />
            {days != null && (
              <span className="text-xs font-medium">
                {days} {days === 1 ? "deň" : days < 5 ? "dni" : "dní"}
              </span>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs font-medium text-tertiary">Vrátenie</p>
            <p className="text-sm font-semibold text-primary">{dropoff.day}</p>
            <p className="text-xs text-tertiary">{dropoff.time}</p>
          </div>
        </div>

        {/* Location */}
        {protocol.location && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-tertiary">
            <MapPin className="h-3.5 w-3.5" />
            <span>{protocol.location}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/protokol/${protocol.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-secondary px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover hover:text-primary"
          >
            Detail
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {isHandover && !hasReturn && (
            <Link
              href={`/protokol/${protocol.id}/vratenie`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-solid px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-solid_hover"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Vrátenie
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
