"use client";

import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";

interface KmExceedanceSummaryProps {
  /** Reading at handover */
  handoverMileageKm: number | null;
  /** Allowed km between handover and return */
  allowedKm: number | null;
  /** Current input from the user (string from <Input type="number">) */
  currentMileageInput: string;
  /** Per-km rate from the reservation/car (€/km) */
  extraKmRate: number | null;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function KmExceedanceSummary({
  handoverMileageKm,
  allowedKm,
  currentMileageInput,
  extraKmRate,
}: KmExceedanceSummaryProps) {
  if (handoverMileageKm == null) return null;

  const current = Number(currentMileageInput);
  const hasInput = currentMileageInput !== "" && Number.isFinite(current);

  if (!hasInput) {
    return (
      <div className="rounded-lg border border-secondary bg-secondary p-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium text-secondary">
          <Gauge className="h-4 w-4" />
          Stav pri odovzdaní:{" "}
          <strong className="text-primary">
            {handoverMileageKm.toLocaleString("sk-SK")} km
          </strong>
        </p>
        {allowedKm != null && allowedKm > 0 && (
          <p className="mt-1 text-tertiary">
            Povolený nájazd:{" "}
            <strong className="text-secondary">
              {allowedKm.toLocaleString("sk-SK")} km
            </strong>
          </p>
        )}
      </div>
    );
  }

  if (current < handoverMileageKm) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900/40 dark:bg-red-950/30">
        <p className="flex items-start gap-2 font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Stav nemôže byť nižší ako pri odovzdaní (
          {handoverMileageKm.toLocaleString("sk-SK")} km)
        </p>
      </div>
    );
  }

  const driven = current - handoverMileageKm;
  const allowed = allowedKm ?? 0;
  const exceeded = Math.max(0, driven - allowed);
  const price = extraKmRate != null ? exceeded * extraKmRate : null;

  if (exceeded === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <p className="flex items-start gap-2 font-medium text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Najazdených {driven.toLocaleString("sk-SK")} km
          {allowed > 0 && (
            <> z {allowed.toLocaleString("sk-SK")} km povolených.</>
          )}
        </p>
        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
          Bez prekročenia limitu.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
      <p className="flex items-start gap-2 font-medium text-amber-800 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Prekročenie nájazdu
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
        <p>
          Najazdených: <strong>{driven.toLocaleString("sk-SK")} km</strong>
        </p>
        <p>
          Povolených: <strong>{allowed.toLocaleString("sk-SK")} km</strong>
        </p>
        <p>
          Prekročenie:{" "}
          <strong>{exceeded.toLocaleString("sk-SK")} km</strong>
          {extraKmRate != null && (
            <> × {formatMoney(extraKmRate)}/km</>
          )}
        </p>
        {price != null && (
          <p className="mt-2 border-t border-amber-300/50 pt-2 text-sm font-bold text-amber-900 dark:border-amber-800/50 dark:text-amber-100">
            K úhrade: {formatMoney(price)}
          </p>
        )}
      </div>
    </div>
  );
}
