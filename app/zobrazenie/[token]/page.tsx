import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProtocolDetail } from "@/lib/queries/protocol-detail";
import { fetchCompanyInfo } from "@/lib/company";
import {
  cookieNameForToken,
  isAccessExpired,
  isValidTokenFormat,
  verifyAccessCookie,
} from "@/lib/public-access";

import { ProtocolDetailView } from "@/components/protocol-detail/protocol-detail-view";
import { PublicProtocolActions } from "@/components/public/public-protocol-actions";
import { PublicCodeGate } from "@/components/public/public-code-gate";
import { PublicExpiredView } from "@/components/public/public-expired-view";

export const metadata = {
  title: "Detail protokolu | Elevate Cars",
};

interface PublicProtocolPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicProtocolPage({
  params,
}: PublicProtocolPageProps) {
  const { token: rawToken } = await params;
  const token = rawToken.toLowerCase();

  if (!isValidTokenFormat(token)) notFound();

  const admin = createAdminClient();

  // Step 1: look up the protocol by token (admin client because this is public)
  const { data: meta } = await admin
    .from("handover_protocols")
    .select("id, status, access_expires_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!meta || meta.status === "draft") notFound();

  // Step 2: expiry check
  const expired = isAccessExpired(meta.access_expires_at);
  const company = await fetchCompanyInfo(admin);

  if (expired) {
    return (
      <PublicExpiredView
        contactEmail={company.email}
        contactPhone={company.phone}
      />
    );
  }

  // Step 3: cookie check — already verified the 6-digit code on this device?
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(cookieNameForToken(token))?.value;
  const verified = verifyAccessCookie(token, cookieValue);

  if (!verified) {
    return (
      <PublicCodeGate
        token={token}
        contactEmail={company.email}
      />
    );
  }

  // Step 4: cookie is valid — load full protocol with signed URLs
  const protocol = await fetchProtocolDetail(admin, meta.id);
  if (!protocol) notFound();

  // friendly "valid until" string
  const validUntilStr = protocol.access_expires_at
    ? new Date(protocol.access_expires_at).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-dvh bg-secondary">
      <header className="border-b border-secondary bg-primary">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-primary">Elevate Cars</span>
          <Link
            href="/zobrazenie"
            className="inline-flex items-center gap-1 text-xs font-medium text-tertiary transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Iný protokol
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <PublicProtocolActions pdfSignedUrl={protocol.pdf_signed_url} />

        <div className="mt-4">
          <ProtocolDetailView protocol={protocol} isPublic />
        </div>

        <div className="mt-8 flex flex-col items-center gap-1 text-center text-xs text-tertiary">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Tento protokol bol vygenerovaný systémom Elevate Cars.
          </p>
          {validUntilStr && (
            <p>
              Platnosť tohto linku uplynie{" "}
              <strong className="text-secondary">{validUntilStr}</strong>.
            </p>
          )}
          {(company.email || company.phone) && (
            <p className="mt-1">
              Pre otázky kontaktujte autopožičovňu:
              {company.email && (
                <>
                  {" "}
                  <a
                    href={`mailto:${company.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {company.email}
                  </a>
                </>
              )}
              {company.email && company.phone && " · "}
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  {company.phone}
                </a>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
