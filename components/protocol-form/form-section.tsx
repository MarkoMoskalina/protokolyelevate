interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-secondary bg-primary p-4 sm:p-6">
      <h2 className="text-md font-semibold text-primary">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-tertiary">{description}</p>
      )}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}
