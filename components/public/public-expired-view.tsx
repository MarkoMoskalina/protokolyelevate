import { Clock, Mail, Phone } from "lucide-react";

interface PublicExpiredViewProps {
  contactEmail?: string;
  contactPhone?: string;
}

export function PublicExpiredView({
  contactEmail,
  contactPhone,
}: PublicExpiredViewProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-secondary bg-primary p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-display-xs font-semibold text-primary">
              Platnosť linku vypršala
            </h1>
            <p className="mt-3 text-sm text-secondary">
              Tento link na zobrazenie protokolu už nie je platný. Linky majú
              obmedzenú platnosť 90 dní od vytvorenia protokolu z bezpečnostných
              dôvodov.
            </p>

            <div className="mt-6 rounded-lg border border-secondary bg-secondary p-4 text-left">
              <p className="text-sm font-semibold text-primary">
                Potrebujete kópiu protokolu?
              </p>
              <p className="mt-1 text-sm text-tertiary">
                Kontaktujte autopožičovňu Elevate Cars a my vám ho radi pošleme
                znova.
              </p>

              {(contactEmail || contactPhone) && (
                <div className="mt-3 flex flex-col gap-2">
                  {contactEmail && (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {contactEmail}
                    </a>
                  )}
                  {contactPhone && (
                    <a
                      href={`tel:${contactPhone}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-tertiary">
          Elevate Cars · autopožičovňa
        </p>
      </div>
    </div>
  );
}
