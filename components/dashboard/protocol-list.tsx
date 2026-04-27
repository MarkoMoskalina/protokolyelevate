import { FileText } from "lucide-react";

import { ProtocolCard } from "@/components/protocol-card/protocol-card";
import type { Protocol } from "@/lib/protocols";

interface ProtocolListProps {
  protocols: { protocol: Protocol; hasReturn: boolean }[];
}

export function ProtocolList({ protocols }: ProtocolListProps) {
  if (protocols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <FileText className="h-6 w-6 text-quaternary" />
        </div>
        <div>
          <p className="text-sm font-medium text-secondary">
            Žiadne protokoly
          </p>
          <p className="mt-1 text-xs text-tertiary">
            Vytvorte nový protokol tlačidlom vyššie
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {protocols.map(({ protocol, hasReturn }) => (
        <ProtocolCard
          key={protocol.id}
          protocol={protocol}
          hasReturn={hasReturn}
        />
      ))}
    </div>
  );
}
