"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, RefreshCw, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface ProtocolDetailActionsProps {
  protocolId: string;
  protocolType: "handover" | "return";
  pdfSignedUrl: string | null;
  /** If this is a handover and a return protocol exists, its id (else null) */
  relatedReturnId?: string | null;
  /** If this is a return, the source handover protocol id */
  relatedHandoverId?: string | null;
}

export function ProtocolDetailActions({
  protocolId,
  protocolType,
  pdfSignedUrl,
  relatedReturnId = null,
  relatedHandoverId = null,
}: ProtocolDetailActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"pdf" | "email" | null>(null);

  async function regeneratePdf() {
    setBusy("pdf");
    const id = toast.loading("Regenerujem PDF...");
    try {
      const res = await fetch(`/api/protocols/${protocolId}/pdf`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "PDF zlyhalo");
      }
      toast.success("PDF bolo aktualizované", { id });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF zlyhalo", { id });
    } finally {
      setBusy(null);
    }
  }

  async function resendEmail() {
    setBusy("email");
    const id = toast.loading("Posielam email...");
    try {
      // Make sure PDF exists/refreshed before sending
      if (!pdfSignedUrl) {
        const pdfRes = await fetch(`/api/protocols/${protocolId}/pdf`, {
          method: "POST",
        });
        if (!pdfRes.ok) {
          const data = await pdfRes.json().catch(() => ({}));
          throw new Error(data.error || "PDF zlyhalo");
        }
      }

      const res = await fetch(`/api/protocols/${protocolId}/email`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Email zlyhal");
      }
      toast.success("Email bol odoslaný zákazníkovi", { id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email zlyhal", { id });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/?tab=active"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-tertiary transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Späť na zoznam
      </Link>

      <div className="flex flex-wrap gap-2">
        {pdfSignedUrl && (
          <a
            href={pdfSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-solid_hover"
          >
            <Download className="h-4 w-4" />
            Stiahnuť PDF
          </a>
        )}

        <button
          type="button"
          onClick={regeneratePdf}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${busy === "pdf" ? "animate-spin" : ""}`}
          />
          {pdfSignedUrl ? "Regenerovať PDF" : "Vygenerovať PDF"}
        </button>

        <button
          type="button"
          onClick={resendEmail}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover disabled:opacity-50"
        >
          <Send
            className={`h-4 w-4 ${busy === "email" ? "animate-pulse" : ""}`}
          />
          Poslať email znova
        </button>

        {protocolType === "handover" && !relatedReturnId && (
          <Link
            href={`/protokol/${protocolId}/vratenie`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Undo2 className="h-4 w-4" />
            Vytvoriť preberací protokol
          </Link>
        )}

        {protocolType === "handover" && relatedReturnId && (
          <Link
            href={`/protokol/${relatedReturnId}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <ArrowUpRight className="h-4 w-4" />
            Zobraziť preberací protokol
          </Link>
        )}

        {protocolType === "return" && relatedHandoverId && (
          <Link
            href={`/protokol/${relatedHandoverId}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover"
          >
            <ArrowUpRight className="h-4 w-4" />
            Zobraziť odovzdávací protokol
          </Link>
        )}
      </div>
    </div>
  );
}
