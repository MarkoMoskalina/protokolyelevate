import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { ProtocolForm } from "@/components/protocol-form/protocol-form";
import { getCurrentEmployeeSignedSignatureUrl } from "@/lib/queries/employee-signature";
import type { ProtocolFormData } from "@/lib/form-types";

interface ReturnProtocolPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Local-time formatter for <input type="datetime-local">.
 * `new Date(...).toISOString()` would convert to UTC and shift the displayed
 * time, so we use the local components instead. Default to "now".
 */
function nowAsLocalDateTimeString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ReturnProtocolPage({
  params,
}: ReturnProtocolPageProps) {
  const { id: handoverId } = await params;
  const { user, supabase } = await requireAdmin();

  // Load the source handover protocol
  const { data: handover, error } = await supabase
    .from("handover_protocols")
    .select("*")
    .eq("id", handoverId)
    .maybeSingle();

  if (error || !handover) notFound();

  // Only handover protocols can have a return created from them
  if (handover.type !== "handover") notFound();

  // If a return protocol already exists, redirect to its detail
  const { data: existingReturn } = await supabase
    .from("handover_protocols")
    .select("id")
    .eq("handover_protocol_id", handoverId)
    .maybeSingle();

  if (existingReturn) {
    redirect(`/protokol/${existingReturn.id}`);
  }

  // Resolve the per-km rate for the exceedance calculation:
  // 1) reservation.extra_km_price (preferred — that was the agreed rate)
  // 2) car.extra_km_price (fallback)
  let extraKmRate: number | null = null;
  if (handover.reservation_id) {
    const { data: res } = await supabase
      .from("reservations")
      .select("extra_km_price")
      .eq("id", handover.reservation_id)
      .maybeSingle();
    extraKmRate = res?.extra_km_price ?? null;
  }
  if (extraKmRate == null && handover.car_id) {
    const { data: car } = await supabase
      .from("cars")
      .select("extra_km_price")
      .eq("id", handover.car_id)
      .maybeSingle();
    extraKmRate = car?.extra_km_price ?? null;
  }

  const defaultLandlordSignature = await getCurrentEmployeeSignedSignatureUrl(
    supabase,
    user.id,
  );

  const initialData: Partial<ProtocolFormData> = {
    mode: "return",
    handover_protocol_id: handover.id,
    handover_mileage_km: handover.mileage_km,
    handover_allowed_km: handover.allowed_km,
    extra_km_rate: extraKmRate,

    // Carry over identifying info — readonly in the form
    reservation_id: handover.reservation_id,
    car_id: handover.car_id,
    customer_first_name: handover.customer_first_name,
    customer_last_name: handover.customer_last_name,
    customer_email: handover.customer_email,
    customer_phone: handover.customer_phone ?? "",
    car_name: handover.car_name,
    car_license_plate: handover.car_license_plate,
    reservation_number: handover.reservation_number ?? "",

    // The return is happening NOW; user can adjust if needed
    protocol_datetime: nowAsLocalDateTimeString(),
    location: handover.location ?? "",

    // Pre-fill landlord signature from the employee's saved signature.
    // The user can replace it with "Podpísať znova" if needed.
    ...(defaultLandlordSignature
      ? { signature_landlord: defaultLandlordSignature }
      : {}),
  };

  return <ProtocolForm initialData={initialData} />;
}
