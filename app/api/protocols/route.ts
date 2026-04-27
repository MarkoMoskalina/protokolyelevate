import { NextResponse } from "next/server";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type ProtocolStatus = "draft" | "completed";

function buildProtocolPayload(body: Record<string, unknown>, status: ProtocolStatus, userId: string) {
  const optionalInt = (v: unknown) =>
    v === undefined || v === null || v === "" ? null : parseInt(String(v), 10);
  const optionalFloat = (v: unknown) =>
    v === undefined || v === null || v === "" ? null : parseFloat(String(v));

  return {
    type: "handover" as const,
    reservation_id: (body.reservation_id as string) || null,
    car_id: (body.car_id as string) || null,
    customer_first_name: body.customer_first_name as string,
    customer_last_name: body.customer_last_name as string,
    customer_email: body.customer_email as string,
    customer_phone: (body.customer_phone as string) || null,
    customer_id_card_front_url: (body.customer_id_card_front_url as string) || null,
    customer_id_card_back_url: (body.customer_id_card_back_url as string) || null,
    customer_driver_license_url: (body.customer_driver_license_url as string) || null,
    car_name: body.car_name as string,
    car_license_plate: body.car_license_plate as string,
    reservation_number: (body.reservation_number as string) || null,
    protocol_datetime: body.protocol_datetime as string,
    expected_return_datetime: (body.expected_return_datetime as string) || null,
    location: (body.location as string) || null,
    mileage_km: optionalInt(body.mileage_km),
    mileage_photo_url: (body.mileage_photo_url as string) || null,
    fuel_level: ((body.fuel_level as string) || null) as "1/4" | "2/4" | "3/4" | "4/4" | null,
    fuel_photo_url: (body.fuel_photo_url as string) || null,
    allowed_km: optionalInt(body.allowed_km),
    deposit_amount: optionalFloat(body.deposit_amount),
    deposit_method: ((body.deposit_method as string) || null) as "cash" | "bank_transfer" | "card_hold" | null,
    car_photos: (body.car_photos ?? []) as string[],
    damages: (body.damages ?? []) as Json,
    signature_landlord_url: (body.signature_landlord_url as string) || null,
    signature_tenant_url: (body.signature_tenant_url as string) || null,
    internal_notes: (body.internal_notes as string) || null,
    status,
    created_by: userId,
  };
}

async function authorize() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const status: ProtocolStatus = body.status === "draft" ? "draft" : "completed";

    const protocolData = buildProtocolPayload(body, status, user.id);

    const { data, error } = await supabase
      .from("handover_protocols")
      .insert(protocolData)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to create protocol" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const id = body.id as string | undefined;
    if (!id) {
      return NextResponse.json({ error: "Missing protocol id" }, { status: 400 });
    }

    const status: ProtocolStatus = body.status === "draft" ? "draft" : "completed";
    const protocolData = buildProtocolPayload(body, status, user.id);

    // Don't overwrite created_by on update
    const { created_by: _ignored, ...updateData } = protocolData;
    void _ignored;

    const { data, error } = await supabase
      .from("handover_protocols")
      .update(updateData)
      .eq("id", id)
      .eq("status", "draft") // safety: only drafts can be updated this way
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to update protocol" },
      { status: 500 },
    );
  }
}
