import { NextResponse } from "next/server";
import { Resend } from "resend";

import { fetchCompanyInfo } from "@/lib/company";
import { buildProtocolEmail } from "@/lib/email-templates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

const PDF_BUCKET = "protocol-documents";

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
 * Send the protocol PDF (read from `protocol-documents` bucket) to the customer
 * email via Resend. PDF must already be generated (call /pdf first).
 *
 * Response: { id }  (Resend message id)
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: protocol, error } = await admin
      .from("handover_protocols")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !protocol) {
      return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
    }

    if (!protocol.customer_email) {
      return NextResponse.json(
        { error: "Customer email is missing" },
        { status: 400 },
      );
    }

    if (!protocol.pdf_url) {
      return NextResponse.json(
        { error: "PDF not generated yet — call /pdf first" },
        { status: 400 },
      );
    }

    const { data: pdfBlob, error: dlError } = await admin.storage
      .from(PDF_BUCKET)
      .download(protocol.pdf_url);

    if (dlError || !pdfBlob) {
      return NextResponse.json(
        { error: `Failed to load PDF: ${dlError?.message || "unknown"}` },
        { status: 500 },
      );
    }

    const company = await fetchCompanyInfo(admin);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://protokoly.elevatecars.sk";

    const { subject, html, text } = buildProtocolEmail({
      protocol,
      appUrl,
      contactEmail: company.email,
      contactPhone: company.phone,
    });

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      "Elevate Cars <protokoly@elevatecars.sk>";

    const replyTo = company.email || undefined;

    const buffer = Buffer.from(await pdfBlob.arrayBuffer());

    const resend = new Resend(apiKey);

    const filename = `${protocol.type === "return" ? "preberaci" : "odovzdavaci"}-protokol-${protocol.access_code}.pdf`;

    const result = await resend.emails.send({
      from: fromAddress,
      to: [protocol.customer_email],
      replyTo,
      subject,
      html,
      text,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    if (result.error) {
      return NextResponse.json(
        { error: `Resend: ${result.error.message}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ id: result.data?.id ?? null });
  } catch (err) {
    console.error("Email send error", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }
}
