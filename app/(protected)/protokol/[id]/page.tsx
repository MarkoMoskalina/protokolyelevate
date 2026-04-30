import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchProtocolDetail } from "@/lib/queries/protocol-detail";
import { ProtocolDetailView } from "@/components/protocol-detail/protocol-detail-view";
import { ProtocolDetailActions } from "@/components/protocol-detail/protocol-detail-actions";

interface ProtocolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProtocolDetailPage({
  params,
}: ProtocolDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const protocol = await fetchProtocolDetail(supabase, id);
  if (!protocol) notFound();

  // For handover protocols, check if there's already a return one
  let returnProtocolId: string | null = null;
  if (protocol.type === "handover") {
    const { data: ret } = await supabase
      .from("handover_protocols")
      .select("id")
      .eq("handover_protocol_id", protocol.id)
      .maybeSingle();
    returnProtocolId = ret?.id ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <ProtocolDetailActions
        protocolId={protocol.id}
        protocolType={protocol.type as "handover" | "return"}
        pdfSignedUrl={protocol.pdf_signed_url}
        relatedReturnId={returnProtocolId}
        relatedHandoverId={
          protocol.type === "return" ? protocol.handover_protocol_id : null
        }
      />

      <div className="mt-4">
        <ProtocolDetailView protocol={protocol} />
      </div>
    </div>
  );
}
