import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { CompanyInfo } from "@/components/pdf/protocol-pdf";

/**
 * Read contact details from public.settings -> company_info.
 * Only email and phone are used (branding is always "Elevate Cars").
 */
export async function fetchCompanyInfo(
  supabase: SupabaseClient<Database>,
): Promise<CompanyInfo> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "company_info")
    .single();

  if (!data?.value || typeof data.value !== "object") return {};
  const raw = data.value as Record<string, unknown>;

  const str = (k: string) =>
    typeof raw[k] === "string" ? (raw[k] as string) : undefined;

  return {
    email: str("email"),
    phone: str("phone"),
  };
}
