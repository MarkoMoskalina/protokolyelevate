import { requireAdmin } from "@/lib/auth";
import { getCurrentEmployeeSignedSignatureUrl } from "@/lib/queries/employee-signature";

import { NewProtocolClient } from "./new-protocol-client";

export default async function NewProtocolPage() {
  const { user, supabase } = await requireAdmin();

  const defaultLandlordSignature = await getCurrentEmployeeSignedSignatureUrl(
    supabase,
    user.id,
  );

  return (
    <NewProtocolClient defaultLandlordSignature={defaultLandlordSignature} />
  );
}
