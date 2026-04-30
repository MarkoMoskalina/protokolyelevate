import {
  Calendar,
  CalendarCheck,
  Car,
  Fuel,
  Gauge,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { DetailRow, DetailSection } from "./detail-section";
import { PhotoGallery } from "./photo-gallery";
import type { ProtocolDetail } from "@/lib/queries/protocol-detail";

interface ProtocolDetailViewProps {
  protocol: ProtocolDetail;
  /** Whether we are showing this to the public (customer) — hides internal data */
  isPublic?: boolean;
}

const depositMethodLabel: Record<string, string> = {
  cash: "Hotovosť",
  bank_transfer: "Bankový prevod",
  card_hold: "Zadržané na karte",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("sk-SK")} o ${d.toLocaleTimeString("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function ProtocolDetailView({
  protocol,
  isPublic = false,
}: ProtocolDetailViewProps) {
  const isReturn = protocol.type === "return";
  const title = isReturn ? "Preberací protokol" : "Odovzdávací protokol";

  // Customer documents — only for admin view
  const customerDocs: { url: string; caption: string }[] = isPublic
    ? []
    : [
        protocol.customer_id_card_front_url
          ? {
              url: protocol.customer_id_card_front_url,
              caption: "OP — predná strana",
            }
          : null,
        protocol.customer_id_card_back_url
          ? {
              url: protocol.customer_id_card_back_url,
              caption: "OP — zadná strana",
            }
          : null,
        protocol.customer_driver_license_url
          ? {
              url: protocol.customer_driver_license_url,
              caption: "Vodičský preukaz",
            }
          : null,
      ].filter((v): v is { url: string; caption: string } => !!v);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-xl border border-secondary bg-primary p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-tertiary">
              {title}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-primary">
              {protocol.car_name}{" "}
              <span className="text-tertiary">·</span>{" "}
              <span className="text-secondary">
                {protocol.car_license_plate}
              </span>
            </h1>
            <p className="mt-1 text-sm text-tertiary">
              Č. protokolu:{" "}
              <span className="font-mono uppercase">
                {protocol.id.slice(0, 8)}
              </span>
              {protocol.reservation_number && (
                <>
                  {" · Rezervácia: "}
                  <span className="font-mono uppercase">
                    {protocol.reservation_number}
                  </span>
                </>
              )}
            </p>
          </div>

          {!isPublic && (
            <div className="rounded-lg border border-secondary bg-secondary px-3 py-2 text-center">
              <p className="text-xs font-medium text-tertiary">Prístupový kód</p>
              <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-primary">
                {protocol.access_code}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Customer */}
      <DetailSection title="Zákazník">
        <DetailRow
          label={<><User className="mr-1 inline h-3.5 w-3.5" /> Meno</>}
          value={`${protocol.customer_first_name} ${protocol.customer_last_name}`}
        />
        <DetailRow
          label={<><Mail className="mr-1 inline h-3.5 w-3.5" /> Email</>}
          value={protocol.customer_email}
        />
        <DetailRow
          label={<><Phone className="mr-1 inline h-3.5 w-3.5" /> Telefón</>}
          value={protocol.customer_phone || "—"}
        />

        {customerDocs.length > 0 && (
          <div className="mt-2">
            <p className="mb-2 text-xs font-medium text-tertiary">
              Doklady
            </p>
            <PhotoGallery
              photos={customerDocs.map((d) => d.url)}
              captions={customerDocs.map((d) => d.caption)}
              columns={3}
              aspect="aspect-[3/2]"
            />
          </div>
        )}
      </DetailSection>

      {/* Vehicle + dates */}
      <DetailSection title="Vozidlo a prenájom">
        <DetailRow
          label={<><Car className="mr-1 inline h-3.5 w-3.5" /> Vozidlo</>}
          value={`${protocol.car_name} (${protocol.car_license_plate})`}
        />
        <DetailRow
          label={
            <>
              <Calendar className="mr-1 inline h-3.5 w-3.5" />{" "}
              {isReturn ? "Vrátenie" : "Odovzdanie"}
            </>
          }
          value={formatDateTime(protocol.protocol_datetime)}
        />
        {!isReturn && protocol.expected_return_datetime && (
          <DetailRow
            label={
              <>
                <CalendarCheck className="mr-1 inline h-3.5 w-3.5" /> Predpokladané vrátenie
              </>
            }
            value={formatDateTime(protocol.expected_return_datetime)}
          />
        )}
        {protocol.location && (
          <DetailRow
            label={<><MapPin className="mr-1 inline h-3.5 w-3.5" /> Miesto</>}
            value={protocol.location}
          />
        )}
        {!isReturn && protocol.allowed_km != null && (
          <DetailRow
            label={
              <>
                <Gauge className="mr-1 inline h-3.5 w-3.5" /> Povolený nájazd
              </>
            }
            value={`${protocol.allowed_km.toLocaleString("sk-SK")} km`}
          />
        )}
      </DetailSection>

      {/* Condition */}
      <DetailSection title={isReturn ? "Stav pri vrátení" : "Stav pri odovzdaní"}>
        <DetailRow
          label={
            <>
              <Gauge className="mr-1 inline h-3.5 w-3.5" /> Stav tachometra
            </>
          }
          value={
            protocol.mileage_km != null
              ? `${protocol.mileage_km.toLocaleString("sk-SK")} km`
              : "—"
          }
        />
        <DetailRow
          label={<><Fuel className="mr-1 inline h-3.5 w-3.5" /> Stav paliva</>}
          value={protocol.fuel_level || "—"}
        />

        {(protocol.mileage_photo_url || protocol.fuel_photo_url) && (
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {protocol.mileage_photo_url && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-tertiary">
                  Tachometer
                </p>
                <PhotoGallery
                  photos={[protocol.mileage_photo_url]}
                  columns={2}
                  aspect="aspect-[4/3]"
                />
              </div>
            )}
            {protocol.fuel_photo_url && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-tertiary">
                  Stav paliva
                </p>
                <PhotoGallery
                  photos={[protocol.fuel_photo_url]}
                  columns={2}
                  aspect="aspect-[4/3]"
                />
              </div>
            )}
          </div>
        )}

        {/* Mileage summary for return protocols (handover -> return -> driven -> exceeded) */}
        {isReturn && protocol.linked_handover && (() => {
          const lh = protocol.linked_handover;
          const startKm = lh.mileage_km;
          const endKm = protocol.mileage_km;
          if (startKm == null || endKm == null) return null;

          const driven = Math.max(0, endKm - startKm);
          const allowed = lh.allowed_km ?? 0;
          const exceeded = Math.max(0, driven - allowed);
          const overLimit = exceeded > 0;
          const price = protocol.km_exceeded_price;

          return (
            <div
              className={`rounded-lg border p-3 text-sm ${
                overLimit
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30"
                  : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
              }`}
            >
              <p
                className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                  overLimit
                    ? "text-amber-800 dark:text-amber-200"
                    : "text-emerald-800 dark:text-emerald-200"
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                Nájazd počas prenájmu
              </p>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-tertiary">Stav pri odovzdaní</p>
                  <p className="font-mono text-sm font-semibold text-primary">
                    {startKm.toLocaleString("sk-SK")} km
                  </p>
                </div>
                <div>
                  <p className="text-tertiary">Stav pri vrátení</p>
                  <p className="font-mono text-sm font-semibold text-primary">
                    {endKm.toLocaleString("sk-SK")} km
                  </p>
                </div>
                <div>
                  <p className="text-tertiary">Najazdených</p>
                  <p
                    className={`font-mono text-sm font-bold ${
                      overLimit
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-emerald-900 dark:text-emerald-100"
                    }`}
                  >
                    {driven.toLocaleString("sk-SK")} km
                  </p>
                </div>
                {allowed > 0 && (
                  <div>
                    <p className="text-tertiary">Povolený nájazd</p>
                    <p className="font-mono text-sm font-semibold text-primary">
                      {allowed.toLocaleString("sk-SK")} km
                    </p>
                  </div>
                )}
              </div>

              {overLimit && (
                <div className="mt-3 border-t border-amber-300/50 pt-2 dark:border-amber-800/50">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Prekročenie:{" "}
                    <strong>{exceeded.toLocaleString("sk-SK")} km</strong>
                    {protocol.extra_km_rate != null && (
                      <> × {formatMoney(protocol.extra_km_rate)}/km</>
                    )}
                  </p>
                  {price != null && (
                    <p className="mt-0.5 text-sm font-bold text-amber-900 dark:text-amber-100">
                      K úhrade: {formatMoney(price)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </DetailSection>

      {/* Car photos */}
      <DetailSection
        title={`Fotky vozidla (${protocol.car_photos?.length ?? 0})`}
      >
        <PhotoGallery photos={protocol.car_photos ?? []} columns={3} />
      </DetailSection>

      {/* Damages */}
      <DetailSection title={`Poškodenia (${protocol.damages_signed.length})`}>
        {protocol.damages_signed.length === 0 ? (
          <p className="text-sm text-quaternary">
            Bez zaznamenaných poškodení
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {protocol.damages_signed.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-secondary bg-secondary p-3"
              >
                <p className="text-sm font-medium text-primary">
                  {i + 1}. {d.description || "(bez popisu)"}
                </p>
                {d.photo_urls.length > 0 && (
                  <div className="mt-2">
                    <PhotoGallery
                      photos={d.photo_urls}
                      columns={4}
                      aspect="aspect-square"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Finance — only for admin (customer sees this on PDF).
          For return protocols, deposit lives on the source handover, so we
          fall back to `linked_handover` when the return row's columns are null. */}
      {!isPublic &&
        (() => {
          const fromReturn = protocol.deposit_amount != null;
          const lh = protocol.linked_handover;
          const depositAmount = fromReturn
            ? protocol.deposit_amount
            : lh?.deposit_amount ?? null;
          const depositMethod = fromReturn
            ? protocol.deposit_method
            : lh?.deposit_method ?? null;
          const fromHandover = !fromReturn && lh != null && (lh.deposit_amount != null || lh.deposit_method != null);

          return (
            <DetailSection title="Financie">
              <DetailRow
                label="Depozit"
                value={
                  depositAmount != null ? formatMoney(depositAmount) : "—"
                }
              />
              <DetailRow
                label="Spôsob"
                value={
                  depositMethod
                    ? depositMethodLabel[depositMethod] || depositMethod
                    : "—"
                }
              />
              {fromHandover && (
                <p className="text-xs italic text-tertiary">
                  Údaje sú prevzaté z odovzdávacieho protokolu
                </p>
              )}
            </DetailSection>
          );
        })()}

      {/* Signatures */}
      <DetailSection title="Podpisy">
        <div className="grid gap-3 sm:grid-cols-2">
          {!isPublic && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-tertiary">
                Prenajímateľ
              </p>
              {protocol.signature_landlord_url ? (
                <PhotoGallery
                  photos={[protocol.signature_landlord_url]}
                  columns={2}
                  aspect="aspect-[3/1]"
                />
              ) : (
                <p className="text-sm text-quaternary">—</p>
              )}
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-medium text-tertiary">
              {isPublic ? "Váš podpis" : "Nájomca"}
            </p>
            {protocol.signature_tenant_url ? (
              <PhotoGallery
                photos={[protocol.signature_tenant_url]}
                columns={2}
                aspect="aspect-[3/1]"
              />
            ) : (
              <p className="text-sm text-quaternary">—</p>
            )}
          </div>
        </div>
      </DetailSection>

      {/* Internal notes — admin only */}
      {!isPublic && protocol.internal_notes && (
        <DetailSection title="Interné poznámky">
          <p className="whitespace-pre-wrap text-sm text-secondary">
            {protocol.internal_notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
