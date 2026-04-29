interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="rounded-xl border border-secondary bg-primary p-4 sm:p-6">
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

interface DetailRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 sm:grid sm:grid-cols-3 sm:gap-2">
      <span className="text-xs font-medium text-tertiary sm:text-sm">
        {label}
      </span>
      <span className="text-sm text-primary sm:col-span-2">
        {value || <span className="text-quaternary">—</span>}
      </span>
    </div>
  );
}
