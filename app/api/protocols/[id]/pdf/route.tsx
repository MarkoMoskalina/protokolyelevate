import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { ProtocolPdf } from "@/components/pdf/protocol-pdf";
import { fetchCompanyInfo } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_BUCKET = "protocol-documents";
const PHOTO_BUCKET = "protocol-photos";

/**
 * Convert a stored signature path/URL to a base64 data URL that
 * @react-pdf/renderer can embed directly. Returns null on any failure.
 */
async function loadSignatureAsDataUrl(
  admin: ReturnType<typeof createAdminClient>,
  value: string | null,
): Promise<string | null> {
  if (!value) return null;

  try {
    let path: string | null = null;

    const ppMatch = value.match(
      /\/storage\/v1\/object\/(?:sign|public)\/protocol-photos\/([^?]+)/,
    );
    if (ppMatch) {
      path = decodeURIComponent(ppMatch[1]);
    } else if (!value.startsWith("http")) {
      path = value;
    }

    let blob: Blob | null = null;

    if (path) {
      const { data } = await admin.storage.from(PHOTO_BUCKET).download(path);
      blob = data ?? null;
    } else {
      const res = await fetch(value);
      if (res.ok) blob = await res.blob();
    }

    if (!blob) return null;

    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = blob.type || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

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
 * Generate (or regenerate) the PDF for a given protocol, upload it
 * to the protocol-documents bucket and persist `pdf_url` (storage path).
 *
 * Response: { path, signedUrl }
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;

    const { id } = await params;
    const admin = createAdminClient();

    const { data: protocol, error } = await admin
      .from("handover_protocols")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !protocol) {
      return NextResponse.json(
        { error: "Protocol not found" },
        { status: 404 },
      );
    }

    const company = await fetchCompanyInfo(admin);

    const [signatureLandlord, signatureTenant] = await Promise.all([
      loadSignatureAsDataUrl(admin, protocol.signature_landlord_url),
      loadSignatureAsDataUrl(admin, protocol.signature_tenant_url),
    ]);

    const buffer = await renderToBuffer(
      <ProtocolPdf
        protocol={protocol}
        company={company}
        signatureLandlordDataUrl={signatureLandlord}
        signatureTenantDataUrl={signatureTenant}
      />,
    );

    const filename = `${protocol.id}/${protocol.type}-${Date.now()}.pdf`;

    const { error: uploadError } = await admin.storage
      .from(PDF_BUCKET)
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `PDF upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    await admin
      .from("handover_protocols")
      .update({ pdf_url: filename })
      .eq("id", protocol.id);

    const { data: signed } = await admin.storage
      .from(PDF_BUCKET)
      .createSignedUrl(filename, 60 * 60);

    return NextResponse.json({
      path: filename,
      signedUrl: signed?.signedUrl ?? null,
    });
  } catch (err) {
    console.error("PDF generation error", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 },
    );
  }
}

/**
 * Download the existing PDF (signed URL). If no `pdf_url`, returns 404.
 *
 * Response: { signedUrl }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;

    const { id } = await params;
    const admin = createAdminClient();

    const { data: protocol } = await admin
      .from("handover_protocols")
      .select("pdf_url")
      .eq("id", id)
      .single();

    if (!protocol?.pdf_url) {
      return NextResponse.json(
        { error: "PDF not generated yet" },
        { status: 404 },
      );
    }

    const { data: signed, error } = await admin.storage
      .from(PDF_BUCKET)
      .createSignedUrl(protocol.pdf_url, 60 * 60);

    if (error || !signed?.signedUrl) {
      return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: signed.signedUrl });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
