import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-error-primary">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border bg-primary px-3.5 py-2.5 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20",
        error ? "border-error" : "border-primary",
        props.readOnly && "bg-secondary text-secondary cursor-default",
        className,
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border bg-primary px-3.5 py-2.5 text-sm text-primary placeholder:text-placeholder outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20",
        error ? "border-error" : "border-primary",
        className,
      )}
      rows={3}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border bg-primary px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20",
        error ? "border-error" : "border-primary",
        !props.value && "text-placeholder",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
