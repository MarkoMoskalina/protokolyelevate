import type { Database } from "@/lib/database.types";

export type Protocol = Database["public"]["Tables"]["handover_protocols"]["Row"];

export type ProtocolWithReturn = Protocol & {
  return_protocol?: Protocol | null;
};

export type DashboardTab = "active" | "completed" | "all";

export function getProtocolStatusLabel(protocol: Protocol, hasReturn: boolean) {
  if (protocol.type === "return") return "Vrátené";
  if (hasReturn) return "Vrátené";
  return "Odovzdané";
}

export function getProtocolStatusVariant(protocol: Protocol, hasReturn: boolean) {
  if (protocol.type === "return") return "success" as const;
  if (hasReturn) return "success" as const;
  return "warning" as const;
}
