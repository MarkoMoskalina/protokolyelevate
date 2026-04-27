"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/ui/lightbox";

interface PhotoUploadProps {
  value: File | string | null;
  onChange: (file: File | string | null) => void;
  label: string;
  error?: string;
}

export function PhotoUpload({ value, onChange, label, error }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const previewUrl = localPreview ?? (typeof value === "string" ? value : null);

  function handleFile(file: File) {
    if (localPreview) URL.revokeObjectURL(localPreview);
    onChange(file);
    setLocalPreview(URL.createObjectURL(file));
  }

  function handleClear() {
    onChange(null);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </label>
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt={label}
            className="h-32 w-full cursor-pointer rounded-lg border border-secondary object-cover transition-opacity hover:opacity-90"
            onClick={() => setLightboxOpen(true)}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1.5 rounded-full bg-primary/80 p-1 shadow-xs backdrop-blur-sm transition-colors hover:bg-primary"
          >
            <X className="h-4 w-4 text-secondary" />
          </button>
          {lightboxOpen && (
            <Lightbox
              images={[previewUrl]}
              index={0}
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed py-4 text-xs transition-colors",
            error
              ? "border-error text-error-primary"
              : "border-primary text-tertiary hover:border-brand hover:text-brand-secondary",
          )}
        >
          <Camera className="h-5 w-5" />
          Nahrať fotku
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="mt-1 text-xs text-error-primary">{error}</p>}
    </div>
  );
}
