"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, FileText } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./sidebar";

export function ProtectedShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      <Suspense>
        <Sidebar
          user={user}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSignOut={handleSignOut}
        />
      </Suspense>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-50 border-b border-secondary bg-primary/80 backdrop-blur-sm lg:hidden">
          <div className="flex h-14 items-center px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href="/"
              className="ml-3 flex items-center gap-2 text-md font-semibold text-primary"
            >
              <FileText className="h-5 w-5 text-brand-600" />
              <span>Protokoly</span>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
