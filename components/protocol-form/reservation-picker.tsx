"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Check,
  MapPin,
  ArrowRight,
  Bookmark,
  Pencil,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { ProtocolFormData, DamageEntry } from "@/lib/form-types";
import { uuid } from "@/lib/uuid";

interface DraftProtocol {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_id_card_front_url: string | null;
  customer_id_card_back_url: string | null;
  customer_driver_license_url: string | null;
  car_name: string;
  car_license_plate: string;
  car_id: string | null;
  reservation_id: string | null;
  reservation_number: string | null;
  protocol_datetime: string;
  expected_return_datetime: string | null;
  location: string | null;
  mileage_km: number | null;
  mileage_photo_url: string | null;
  fuel_level: string | null;
  fuel_photo_url: string | null;
  allowed_km: number | null;
  deposit_amount: number | null;
  deposit_method: string | null;
  car_photos: string[] | null;
  damages: { description: string; photo_urls: string[] }[] | null;
  signature_landlord_url: string | null;
  signature_tenant_url: string | null;
  internal_notes: string | null;
  updated_at: string;
}

interface Reservation {
  id: string;
  reservation_number: string | null;
  pickup_datetime: string | null;
  dropoff_datetime: string | null;
  status: string | null;
  total_price: number | null;
  total_allowed_km: number | null;
  km_per_day: number | null;
  extra_km_price: number | null;
  customer_id: string | null;
  car_id: string | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    id_card_front_url: string | null;
    id_card_back_url: string | null;
    driver_license_front_url: string | null;
  } | null;
  car: {
    model: string | null;
    license_plate: string | null;
    extra_km_price: number | null;
    deposit_amount: number | null;
    images: string[] | null;
    brand: { name: string | null } | null;
  } | null;
  pickup_location: { name: string | null } | null;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Potvrdená", className: "bg-emerald-500/90 text-white" },
  pending: { label: "Čakajúca", className: "bg-amber-500/90 text-white" },
  cancelled: { label: "Zrušená", className: "bg-red-500/90 text-white" },
};

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

function toLocalDateTimeString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPrice(price: number | null) {
  if (price == null) return null;
  return new Intl.NumberFormat("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
}

interface ReservationPickerProps {
  onSelect: (patch: Partial<ProtocolFormData>) => void;
  onSkip: () => void;
}

async function signMany(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[],
  expirySec = 60 * 60,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expirySec);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && !item.error) map[item.path ?? ""] = item.signedUrl;
  }
  return map;
}

export function ReservationPicker({ onSelect, onSkip }: ReservationPickerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [drafts, setDrafts] = useState<DraftProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [resumingDraft, setResumingDraft] = useState<string | null>(null);
  const [deletingDraft, setDeletingDraft] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<DraftProtocol | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: allProtocols } = await supabase
      .from("handover_protocols")
      .select("id, status, reservation_id, customer_first_name, customer_last_name, customer_email, customer_phone, customer_id_card_front_url, customer_id_card_back_url, customer_driver_license_url, car_name, car_license_plate, car_id, reservation_number, protocol_datetime, expected_return_datetime, location, mileage_km, mileage_photo_url, fuel_level, fuel_photo_url, allowed_km, deposit_amount, deposit_method, car_photos, damages, signature_landlord_url, signature_tenant_url, internal_notes, updated_at")
      .order("updated_at", { ascending: false });

    const draftRows = (allProtocols ?? []).filter((p) => p.status === "draft");
    const completedReservationIds = (allProtocols ?? [])
      .filter((p) => p.status !== "draft" && p.reservation_id)
      .map((p) => p.reservation_id) as string[];

    // Hide reservations that already have a draft (it shows up under "Predpripravené")
    const draftReservationIds = draftRows
      .map((p) => p.reservation_id)
      .filter(Boolean) as string[];

    const hiddenReservationIds = [
      ...new Set([...completedReservationIds, ...draftReservationIds]),
    ];

    const todayLocal = new Date();
    const todayStart = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()).toISOString();

    let query = supabase
      .from("reservations")
      .select(
        "id, reservation_number, pickup_datetime, dropoff_datetime, status, total_price, total_allowed_km, km_per_day, extra_km_price, customer_id, car_id, " +
        "customer:customers(first_name, last_name, email, phone, id_card_front_url, id_card_back_url, driver_license_front_url), " +
        "car:cars(model, license_plate, extra_km_price, deposit_amount, images, brand:brands(name)), " +
        "pickup_location:pickup_locations!pickup_location_id(name)"
      )
      .eq("status", "confirmed")
      .gte("pickup_datetime", todayStart)
      .order("pickup_datetime", { ascending: true })
      .limit(50);

    if (hiddenReservationIds.length > 0) {
      query = query.not("id", "in", `(${hiddenReservationIds.join(",")})`);
    }

    const { data } = await query;
    setReservations((data as unknown as Reservation[]) ?? []);
    setDrafts(draftRows as unknown as DraftProtocol[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = reservations.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const name = `${r.customer?.first_name ?? ""} ${r.customer?.last_name ?? ""}`.toLowerCase();
    const plate = (r.car?.license_plate ?? "").toLowerCase();
    const num = (r.reservation_number ?? "").toLowerCase();
    const carName = `${r.car?.brand?.name ?? ""} ${r.car?.model ?? ""}`.toLowerCase();
    return name.includes(term) || plate.includes(term) || num.includes(term) || carName.includes(term);
  });

  const confirmDeleteDraft = useCallback(async () => {
    const d = draftToDelete;
    if (!d) return;

    setDeletingDraft(d.id);
    try {
      const res = await fetch(`/api/protocols/${d.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || "Zmazanie sa nepodarilo");
        return;
      }
      // Optimistic UI removal so the row disappears immediately, then a full
      // refresh re-surfaces the freed reservation under "Dostupné rezervácie".
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      setDraftToDelete(null);
      toast.success("Predpripravený protokol bol zmazaný");
      await load();
    } catch (err) {
      console.error("Delete draft failed", err);
      toast.error("Zmazanie sa nepodarilo");
    } finally {
      setDeletingDraft(null);
    }
  }, [draftToDelete, load]);

  const handleResumeDraft = useCallback(
    async (d: DraftProtocol) => {
      setResumingDraft(d.id);
      const supabase = createClient();

      // Collect all storage paths inside protocol-photos that need signing for preview
      const ppPaths: string[] = [];
      const push = (p: string | null | undefined) => {
        if (p && !p.startsWith("http")) ppPaths.push(p);
      };
      push(d.customer_id_card_front_url);
      push(d.customer_id_card_back_url);
      push(d.customer_driver_license_url);
      push(d.mileage_photo_url);
      push(d.fuel_photo_url);
      push(d.signature_landlord_url);
      push(d.signature_tenant_url);
      (d.car_photos ?? []).forEach(push);
      (d.damages ?? []).forEach((dmg) => dmg.photo_urls.forEach(push));

      const ppMap = await signMany(supabase, "protocol-photos", ppPaths);
      const sign = (p: string | null | undefined) => {
        if (!p) return null;
        if (p.startsWith("http")) return p;
        return ppMap[p] ?? null;
      };

      const damages: DamageEntry[] = (d.damages ?? []).map((dmg) => ({
        id: uuid(),
        description: dmg.description,
        photos: dmg.photo_urls.map((p) => sign(p)).filter(Boolean) as string[],
      }));

      onSelect({
        protocol_id: d.id,
        reservation_id: d.reservation_id,
        car_id: d.car_id,
        customer_first_name: d.customer_first_name,
        customer_last_name: d.customer_last_name,
        customer_email: d.customer_email,
        customer_phone: d.customer_phone ?? "",
        customer_id_card_front: sign(d.customer_id_card_front_url),
        customer_id_card_back: sign(d.customer_id_card_back_url),
        customer_driver_license: sign(d.customer_driver_license_url),
        car_name: d.car_name,
        car_license_plate: d.car_license_plate,
        reservation_number: d.reservation_number ?? "",
        protocol_datetime: toLocalDateTimeString(d.protocol_datetime),
        expected_return_datetime: d.expected_return_datetime
          ? toLocalDateTimeString(d.expected_return_datetime)
          : "",
        location: d.location ?? "",
        mileage_km: d.mileage_km != null ? String(d.mileage_km) : "",
        mileage_photo: sign(d.mileage_photo_url),
        fuel_level: (d.fuel_level as ProtocolFormData["fuel_level"]) ?? "",
        fuel_photo: sign(d.fuel_photo_url),
        allowed_km: d.allowed_km != null ? String(d.allowed_km) : "",
        deposit_amount: d.deposit_amount != null ? String(d.deposit_amount) : "",
        deposit_method: (d.deposit_method as ProtocolFormData["deposit_method"]) ?? "",
        car_photos: (d.car_photos ?? []).map((p) => sign(p)).filter(Boolean) as string[],
        damages,
        signature_landlord: sign(d.signature_landlord_url) ?? "",
        signature_tenant: sign(d.signature_tenant_url) ?? "",
        internal_notes: d.internal_notes ?? "",
      });
    },
    [onSelect],
  );

  const handleSelect = useCallback(
    async (r: Reservation) => {
      setSelected(r.id);
      const carName = [r.car?.brand?.name, r.car?.model].filter(Boolean).join(" ");

      const docPaths = [
        r.customer?.id_card_front_url,
        r.customer?.id_card_back_url,
        r.customer?.driver_license_front_url,
      ].filter(Boolean) as string[];

      const signedMap = await signMany(createClient(), "customer-documents", docPaths);

      onSelect({
        reservation_id: r.id,
        car_id: r.car_id,
        customer_first_name: r.customer?.first_name ?? "",
        customer_last_name: r.customer?.last_name ?? "",
        customer_email: r.customer?.email ?? "",
        customer_phone: r.customer?.phone ?? "",
        car_name: carName,
        car_license_plate: r.car?.license_plate ?? "",
        reservation_number: r.reservation_number ?? "",
        expected_return_datetime: r.dropoff_datetime ? toLocalDateTimeString(r.dropoff_datetime) : "",
        protocol_datetime: r.pickup_datetime ? toLocalDateTimeString(r.pickup_datetime) : "",
        location: r.pickup_location?.name ?? "",
        allowed_km: r.total_allowed_km != null ? String(r.total_allowed_km) : "",
        deposit_amount: r.car?.deposit_amount != null ? String(r.car.deposit_amount) : "",
        customer_id_card_front: r.customer?.id_card_front_url
          ? signedMap[r.customer.id_card_front_url] ?? null
          : null,
        customer_id_card_back: r.customer?.id_card_back_url
          ? signedMap[r.customer.id_card_back_url] ?? null
          : null,
        customer_driver_license: r.customer?.driver_license_front_url
          ? signedMap[r.customer.driver_license_front_url] ?? null
          : null,
      });
    },
    [onSelect],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-primary">Nový protokol</h1>
      <p className="mb-6 text-sm text-tertiary">
        Vyberte rezerváciu alebo vytvorte protokol bez rezervácie
      </p>

      <button
        type="button"
        onClick={onSkip}
        className="mb-4 w-full rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary_hover"
      >
        Vytvoriť bez rezervácie
      </button>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quaternary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať meno, ŠPZ, číslo rez..."
          className="w-full rounded-lg border border-primary bg-primary py-2.5 pl-9 pr-4 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-tertiary">
          Načítavam rezervácie...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {drafts.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-semibold text-primary">Predpripravené</h2>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-secondary">
                  {drafts.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-tertiary">
                Pokračujte vo vyplnení s príchodom zákazníka
              </p>
              <div className="flex flex-col gap-2">
                {drafts.map((d) => {
                  const isResuming = resumingDraft === d.id;
                  const isDeleting = deletingDraft === d.id;
                  const isBusy = isResuming || isDeleting;
                  const updated = new Date(d.updated_at).toLocaleDateString("sk-SK", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-1 rounded-xl border border-secondary bg-primary pr-1 transition-all hover:border-brand/50 ${
                        isBusy ? "opacity-60" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleResumeDraft(d)}
                        disabled={isBusy}
                        className="flex flex-1 items-center gap-3 rounded-l-xl p-3 text-left disabled:cursor-not-allowed"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
                          <Pencil className="h-4 w-4 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-primary">
                            {d.car_name}
                            {d.car_license_plate && (
                              <span className="ml-1 text-xs font-medium text-tertiary">· {d.car_license_plate}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-secondary">
                            {d.customer_first_name} {d.customer_last_name}
                            {d.reservation_number && (
                              <span className="text-tertiary"> · {d.reservation_number}</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-tertiary">Uložené {updated}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-tertiary" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftToDelete(d)}
                        disabled={isBusy}
                        title="Zmazať predpripravený protokol"
                        aria-label="Zmazať predpripravený protokol"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-tertiary transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            {drafts.length > 0 && (
              <h2 className="mb-3 text-sm font-semibold text-primary">Dostupné rezervácie</h2>
            )}
            <div className="flex flex-col gap-3">
          {filtered.map((r) => {
            const isSelected = selected === r.id;
            const carName = [r.car?.brand?.name, r.car?.model].filter(Boolean).join(" ");
            const thumb = r.car?.images?.[0];
            const pickup = formatDate(r.pickup_datetime);
            const dropoff = formatDate(r.dropoff_datetime);
            const days = getDayCount(r.pickup_datetime, r.dropoff_datetime);
            const price = formatPrice(r.total_price);
            const status = STATUS_MAP[r.status ?? ""] ?? { label: r.status, className: "bg-gray-500/80 text-white" };

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelect(r)}
                className={`group relative overflow-hidden rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-secondary hover:border-brand/50"
                } bg-primary`}
              >
                {isSelected && (
                  <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-solid text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                )}

                <div className="relative aspect-[16/8] w-full overflow-hidden bg-secondary">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={carName}
                      fill
                      className="object-cover transition-transform group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 672px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-quaternary">
                      Bez fotky
                    </div>
                  )}

                  <span className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm ${status.className}`}>
                    {status.label}
                  </span>

                  {price && (
                    <span className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                      {price} &euro;
                    </span>
                  )}
                </div>

                <div className="px-4 pb-4 pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-semibold text-primary">{carName || "Neznáme auto"}</p>
                    {r.car?.license_plate && (
                      <span className="shrink-0 text-xs font-medium text-tertiary">{r.car.license_plate}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-secondary">
                    {r.customer?.first_name} {r.customer?.last_name}
                    {r.reservation_number && (
                      <span className="text-tertiary"> &middot; {r.reservation_number}</span>
                    )}
                  </p>

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

                  {r.pickup_location?.name && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-tertiary">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{r.pickup_location.name}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-tertiary">
              Žiadne dostupné rezervácie
            </p>
          )}
            </div>
          </section>
        </div>
      )}

      {selected && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => onSelect({})}
            className="w-full rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover"
          >
            Pokračovať s rezerváciou
          </button>
        </div>
      )}

      <ConfirmModal
        open={draftToDelete !== null}
        title="Zmazať predpripravený protokol?"
        description={
          draftToDelete
            ? `Naozaj chcete odstrániť predpripravený protokol pre ${
                draftToDelete.car_name || "auto"
              }${
                draftToDelete.car_license_plate
                  ? ` (${draftToDelete.car_license_plate})`
                  : ""
              }? Túto akciu nie je možné vrátiť späť.`
            : undefined
        }
        confirmLabel="Zmazať"
        cancelLabel="Zrušiť"
        variant="danger"
        loading={deletingDraft !== null}
        onConfirm={confirmDeleteDraft}
        onCancel={() => {
          if (deletingDraft) return;
          setDraftToDelete(null);
        }}
      />
    </div>
  );
}
