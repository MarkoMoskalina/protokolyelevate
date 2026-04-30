"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FilePlus,
  Clock,
  History,
  LogOut,
  X,
  ExternalLink,
  Settings,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { cn } from "@/lib/utils";
import { UserSettingsModal } from "@/components/layout/user-settings-modal";

interface SidebarProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  tab?: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Domov", icon: Home, exact: true },
  { href: "/novy", label: "Tvorba protokolu", icon: FilePlus },
  { href: "/?tab=active", label: "Prebiehajúce", icon: Clock, tab: "active" },
  { href: "/?tab=completed", label: "História", icon: History, tab: "completed" },
];

export function Sidebar({ user, open, onClose, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [settingsOpen, setSettingsOpen] = useState(false);

  function isActive(item: NavItem) {
    if (item.tab) {
      return pathname === "/" && currentTab === item.tab;
    }
    if (item.exact) {
      return pathname === "/" && !currentTab;
    }
    return pathname === item.href;
  }

  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 flex-col bg-primary border-r border-secondary shadow-xl",
          "lg:sticky lg:flex lg:top-0 lg:z-40 lg:h-dvh lg:shadow-none",
          open ? "flex" : "hidden lg:flex",
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-secondary px-4">
          <span className="text-md font-semibold text-primary">Protokoly</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <li key={item.href + (item.tab || "")}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-secondary hover:bg-secondary_hover hover:text-primary",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-tertiary")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* External link */}
        <div className="px-3 pb-2">
          <a
            href="https://www.elevatecars.sk/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover hover:text-primary"
          >
            <ExternalLink className="h-5 w-5 text-tertiary" />
            ElevateCars.sk
          </a>
        </div>

        {/* User footer */}
        <div className="border-t border-secondary p-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { onClose(); setSettingsOpen(true); }}
              className="flex flex-1 min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary_hover"
              title="Nastavenia účtu"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-primary">
                  {user.user_metadata?.full_name || user.email?.split("@")[0] || "Používateľ"}
                </p>
                <p className="flex items-center gap-1 text-xs text-tertiary">
                  <Settings className="h-3 w-3" />
                  Nastavenia
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="shrink-0 rounded-lg p-2 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary"
              title="Odhlásiť sa"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {settingsOpen && (
        <UserSettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}
