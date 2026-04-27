"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function DashboardSearch({ initialSearch }: { initialSearch: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialSearch);

  const handleSearch = useCallback(
    (term: string) => {
      setValue(term);
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
          params.set("q", term);
        } else {
          params.delete("q");
        }
        const qs = params.toString();
        router.push(qs ? `/?${qs}` : "/");
      });
    },
    [router, searchParams],
  );

  return (
    <div className="relative">
      <Search
        className={cn(
          "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
          isPending ? "text-brand-500 animate-pulse" : "text-quaternary",
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Hľadať meno, ŠPZ, číslo rez..."
        className="w-full rounded-lg border border-primary bg-primary py-2 pl-9 pr-9 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {value && (
        <button
          onClick={() => handleSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-quaternary hover:text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
