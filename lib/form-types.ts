export type ProtocolMode = "handover" | "return";

export interface ProtocolFormData {
  // Mode
  mode: ProtocolMode;

  // Source
  protocol_id: string | null;
  reservation_id: string | null;
  car_id: string | null;

  // Return-only: link to the original handover + reference values
  handover_protocol_id: string | null;
  handover_mileage_km: number | null;
  handover_allowed_km: number | null;
  extra_km_rate: number | null;

  // Customer
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;

  // Customer documents (File = new upload, string = existing URL from customer record)
  customer_id_card_front: File | string | null;
  customer_id_card_back: File | string | null;
  customer_driver_license: File | string | null;

  // Vehicle
  car_name: string;
  car_license_plate: string;
  reservation_number: string;

  // Dates
  protocol_datetime: string;
  expected_return_datetime: string;

  // Location
  location: string;

  // Vehicle condition
  mileage_km: string;
  mileage_photo: File | string | null;
  fuel_level: "1/4" | "2/4" | "3/4" | "4/4" | "";
  fuel_photo: File | string | null;

  // KM allowance
  allowed_km: string;

  // Car photos (File = new upload, string = existing URL)
  car_photos: (File | string)[];

  // Damages
  damages: DamageEntry[];

  // Finances
  deposit_amount: string;
  deposit_method: "cash" | "bank_transfer" | "card_hold" | "";

  // Notes
  internal_notes: string;

  // Signatures (base64 data URLs)
  signature_landlord: string;
  signature_tenant: string;
}

export interface DamageEntry {
  id: string;
  description: string;
  photos: (File | string)[];
}

export const EMPTY_FORM: ProtocolFormData = {
  mode: "handover",
  protocol_id: null,
  reservation_id: null,
  car_id: null,
  handover_protocol_id: null,
  handover_mileage_km: null,
  handover_allowed_km: null,
  extra_km_rate: null,
  customer_first_name: "",
  customer_last_name: "",
  customer_email: "",
  customer_phone: "",
  customer_id_card_front: null,
  customer_id_card_back: null,
  customer_driver_license: null,
  car_name: "",
  car_license_plate: "",
  reservation_number: "",
  protocol_datetime: new Date().toISOString().slice(0, 16),
  expected_return_datetime: "",
  location: "",
  mileage_km: "",
  mileage_photo: null,
  fuel_level: "",
  fuel_photo: null,
  allowed_km: "",
  car_photos: [],
  damages: [],
  deposit_amount: "",
  deposit_method: "",
  internal_notes: "",
  signature_landlord: "",
  signature_tenant: "",
};

/**
 * Lightweight validation for "predpripravený" (draft) protocols.
 * Only customer/car/datetime are required — fotky, mileage, fuel a podpisy
 * sa doplnia keď príde zákazník.
 */
export function validateDraft(data: ProtocolFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.customer_first_name.trim()) errors.customer_first_name = "Povinné pole";
  if (!data.customer_last_name.trim()) errors.customer_last_name = "Povinné pole";
  if (!data.customer_email.trim()) errors.customer_email = "Povinné pole";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email))
    errors.customer_email = "Neplatný email";

  if (!data.car_name.trim()) errors.car_name = "Povinné pole";
  if (!data.car_license_plate.trim()) errors.car_license_plate = "Povinné pole";
  if (!data.protocol_datetime) errors.protocol_datetime = "Povinné pole";

  return errors;
}

export function validateForm(data: ProtocolFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.customer_first_name.trim()) errors.customer_first_name = "Povinné pole";
  if (!data.customer_last_name.trim()) errors.customer_last_name = "Povinné pole";
  if (!data.customer_email.trim()) errors.customer_email = "Povinné pole";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email))
    errors.customer_email = "Neplatný email";

  if (!data.customer_id_card_front) errors.customer_id_card_front = "Nahrajte prednú stranu OP";
  if (!data.customer_id_card_back) errors.customer_id_card_back = "Nahrajte zadnú stranu OP";
  if (!data.customer_driver_license) errors.customer_driver_license = "Nahrajte vodičský preukaz";

  if (!data.car_name.trim()) errors.car_name = "Povinné pole";
  if (!data.car_license_plate.trim()) errors.car_license_plate = "Povinné pole";
  if (!data.protocol_datetime) errors.protocol_datetime = "Povinné pole";

  if (!data.mileage_photo) errors.mileage_photo = "Nahrajte fotku tachometra";
  if (!data.mileage_km) errors.mileage_km = "Povinné pole";
  else if (isNaN(Number(data.mileage_km)) || Number(data.mileage_km) < 0)
    errors.mileage_km = "Neplatná hodnota";

  if (!data.fuel_photo) errors.fuel_photo = "Nahrajte fotku paliva";
  if (!data.fuel_level) errors.fuel_level = "Vyberte stav paliva";

  if (data.car_photos.length < 4) errors.car_photos = "Nahrajte min. 4 fotky auta";

  if (!data.signature_landlord) errors.signature_landlord = "Podpis prenajímateľa je povinný";
  if (!data.signature_tenant) errors.signature_tenant = "Podpis nájomcu je povinný";

  return errors;
}

/**
 * Validation for return (preberací) protocol.
 * Customer details and documents are inherited from the handover protocol,
 * so we only require the new return-specific data: km/fuel state, car photos,
 * and signatures. Customer email is still verified (used for sending the PDF).
 */
export function validateReturnForm(data: ProtocolFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.customer_email.trim()) errors.customer_email = "Povinné pole";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email))
    errors.customer_email = "Neplatný email";

  if (!data.protocol_datetime) errors.protocol_datetime = "Povinné pole";

  if (!data.mileage_photo) errors.mileage_photo = "Nahrajte fotku tachometra";
  if (!data.mileage_km) errors.mileage_km = "Povinné pole";
  else if (isNaN(Number(data.mileage_km)) || Number(data.mileage_km) < 0)
    errors.mileage_km = "Neplatná hodnota";
  else if (
    data.handover_mileage_km != null &&
    Number(data.mileage_km) < data.handover_mileage_km
  ) {
    errors.mileage_km = `Stav nemôže byť nižší ako pri odovzdaní (${data.handover_mileage_km} km)`;
  }

  if (!data.fuel_photo) errors.fuel_photo = "Nahrajte fotku paliva";
  if (!data.fuel_level) errors.fuel_level = "Vyberte stav paliva";

  if (data.car_photos.length < 4) errors.car_photos = "Nahrajte min. 4 fotky auta";

  if (!data.signature_landlord) errors.signature_landlord = "Podpis prenajímateľa je povinný";
  if (!data.signature_tenant) errors.signature_tenant = "Podpis nájomcu je povinný";

  return errors;
}

/**
 * Compute the km exceedance for a return protocol.
 * Returns null if any of the required inputs are missing.
 */
export function computeKmExceedance(data: ProtocolFormData): {
  driven: number;
  exceeded: number;
  rate: number | null;
  price: number | null;
} | null {
  if (data.handover_mileage_km == null) return null;
  const current = Number(data.mileage_km);
  if (!Number.isFinite(current)) return null;
  const driven = Math.max(0, current - data.handover_mileage_km);
  const allowed = data.handover_allowed_km ?? 0;
  const exceeded = Math.max(0, driven - allowed);
  const rate = data.extra_km_rate ?? null;
  const price = rate != null ? Math.round(exceeded * rate * 100) / 100 : null;
  return { driven, exceeded, rate, price };
}
