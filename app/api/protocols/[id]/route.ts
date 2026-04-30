import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PHOTOS_BUCKET = "protocol-photos";

async function authorize() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

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

/**
 * Collect all storage paths in `protocol-photos` referenced by a draft protocol
 * row so we can purge them together with the row. We skip values that look like
 * external URLs (signed/public URLs from another bucket should never appear
 * here, but we guard anyway).
 */
function collectPhotoPaths(protocol: {
  customer_id_card_front_url: string | null;
  customer_id_card_back_url: string | null;
  customer_driver_license_url: string | null;
  mileage_photo_url: string | null;
  fuel_photo_url: string | null;
  signature_landlord_url: string | null;
  signature_tenant_url: string | null;
  car_photos: string[] | null;
  damages: unknown;
}): string[] {
  const paths: string[] = [];
  const push = (p: string | null | undefined) => {
    if (p && !p.startsWith("http")) paths.push(p);
  };

  push(protocol.customer_id_card_front_url);
  push(protocol.customer_id_card_back_url);
  push(protocol.customer_driver_license_url);
  push(protocol.mileage_photo_url);
  push(protocol.fuel_photo_url);
  push(protocol.signature_landlord_url);
  push(protocol.signature_tenant_url);
  (protocol.car_photos ?? []).forEach(push);

  if (Array.isArray(protocol.damages)) {
    for (const dmg of protocol.damages) {
      if (
        dmg &&
        typeof dmg === "object" &&
        "photo_urls" in dmg &&
        Array.isArray((dmg as { photo_urls: unknown }).photo_urls)
      ) {
        for (const url of (dmg as { photo_urls: unknown[] }).photo_urls) {
          if (typeof url === "string") push(url);
        }
      }
    }
  }

  return paths;
}

/**
 * Delete a draft protocol. Only drafts can be removed via this route — completed
 * protocols are part of the rental record and must be preserved. We also clean
 * up any uploaded photos in `protocol-photos` so storage doesn't accumulate
 * orphans.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing protocol id" }, { status: 400 });
    }

    const { data: protocol, error: fetchError } = await supabase
      .from("handover_protocols")
      .select(
        "id, status, customer_id_card_front_url, customer_id_card_back_url, customer_driver_license_url, mileage_photo_url, fuel_photo_url, signature_landlord_url, signature_tenant_url, car_photos, damages",
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!protocol) {
      return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
    }
    if (protocol.status !== "draft") {
      return NextResponse.json(
        { error: "Iba predpripravené protokoly je možné zmazať" },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("handover_protocols")
      .delete()
      .eq("id", id)
      .eq("status", "draft");

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const photoPaths = collectPhotoPaths(protocol);
    if (photoPaths.length > 0) {
      const admin = createAdminClient();
      const { error: storageError } = await admin.storage
        .from(PHOTOS_BUCKET)
        .remove(photoPaths);
      if (storageError) {
        console.warn(
          "[protocols/delete] storage cleanup failed",
          storageError.message,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[protocols/delete] failed", err);
    return NextResponse.json(
      { error: "Failed to delete protocol" },
      { status: 500 },
    );
  }
}
