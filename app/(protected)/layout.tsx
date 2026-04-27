import { requireAdmin } from "@/lib/auth";
import { ProtectedShell } from "@/components/layout/protected-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return <ProtectedShell user={user}>{children}</ProtectedShell>;
}
