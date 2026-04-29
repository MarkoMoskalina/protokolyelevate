import Link from "next/link";
import { Mail, MailOpen } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCompanyInfo } from "@/lib/company";

export const metadata = {
  title: "Zobrazenie protokolu | Elevate Cars",
  description:
    "Pre zobrazenie odovzdávacieho alebo preberacieho protokolu otvorte link z emailu, ktorý vám poslala autopožičovňa.",
};

export default async function PublicLandingPage() {
  // we still need company contact info — fetch from settings via admin client
  const admin = createAdminClient();
  const company = await fetchCompanyInfo(admin);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-secondary bg-primary p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-secondary dark:bg-brand-900/30">
              <MailOpen className="h-7 w-7" />
            </div>
            <h1 className="text-display-xs font-semibold text-primary">
              Zobrazenie protokolu
            </h1>
            <p className="mt-3 text-sm text-secondary">
              Pre zobrazenie protokolu otvorte <strong>link z emailu</strong>,
              ktorý vám poslala autopožičovňa Elevate Cars po odovzdaní alebo
              prevzatí vozidla.
            </p>

            <div className="mt-6 rounded-lg border border-secondary bg-secondary p-4 text-left">
              <p className="text-sm font-semibold text-primary">
                Email vám neprišiel?
              </p>
              <p className="mt-1 text-sm text-tertiary">
                Skontrolujte priečinok spamu, alebo nás kontaktujte:
              </p>

              {(company.email || company.phone) && (
                <div className="mt-3 flex flex-col gap-2">
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {company.email}
                    </a>
                  )}
                  {company.phone && (
                    <a
                      href={`tel:${company.phone}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {company.phone}
                    </a>
                  )}
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-tertiary">
              Linky na zobrazenie protokolu majú z bezpečnostných dôvodov
              obmedzenú platnosť 90 dní od vytvorenia protokolu.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-tertiary">
          <Link href="https://elevatecars.sk" className="hover:underline">
            elevatecars.sk
          </Link>
        </p>
      </div>
    </div>
  );
}
