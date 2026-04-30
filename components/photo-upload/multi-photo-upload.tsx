"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/ui/lightbox";

interface MultiPhotoUploadProps {
  value: (File | string)[];
  onChange: (files: (File | string)[]) => void;
  label: string;
  hint?: string;
  error?: string;
}

export function MultiPhotoUpload({
  value,
  onChange,
  label,
  hint,
  error,
}: MultiPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Object URLs for File previews, indexed by file identity (created lazily).
  const [objectUrls, setObjectUrls] = useState<Map<File, string>>(new Map());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const previews = value.map((item) => {
    if (typeof item === "string") return item;
    let url = objectUrls.get(item);
    if (!url) {
      url = URL.createObjectURL(item);
      // Cache for next render — defer state update to avoid render-time mutation
      queueMicrotask(() =>
        setObjectUrls((prev) => {
          if (prev.has(item)) return prev;
          const next = new Map(prev);
          next.set(item, url!);
          return next;
        }),
      );
    }
    return url;
  });

  const addFiles = useCallback(
    (newFiles: FileList) => {
      const files = Array.from(newFiles);
      onChange([...value, ...files]);
    },
    [value, onChange],
  );

  function removeFile(index: number) {
    const item = value[index];
    if (item instanceof File) {
      const url = objectUrls.get(item);
      if (url) URL.revokeObjectURL(url);
      setObjectUrls((prev) => {
        const next = new Map(prev);
        next.delete(item);
        return next;
      });
    }
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-tertiary">{hint}</p>}

      {previews.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, i) => (
            <div key={url} className="relative aspect-square">
              <img
                src={url}
                alt={`Fotka ${i + 1}`}
                className="h-full w-full cursor-pointer rounded-lg border border-secondary object-cover transition-opacity hover:opacity-90"
                onClick={() => setLightboxIndex(i)}
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 rounded-full bg-primary/80 p-0.5 shadow-xs backdrop-blur-sm transition-colors hover:bg-primary"
              >
                <X className="h-3.5 w-3.5 text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && previews.length > 0 && (
        <Lightbox
          images={previews}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.setAttribute("capture", "environment");
              inputRef.current.click();
            }
          }}
          className={cn(
            "flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-dashed py-3 text-xs transition-colors",
            error
              ? "border-error text-error-primary"
              : "border-primary text-tertiary hover:border-brand hover:text-brand-secondary",
          )}
        >
          <Camera className="h-5 w-5" />
          Fotoaparát
        </button>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
          className={cn(
            "flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-dashed py-3 text-xs transition-colors",
            error
              ? "border-error text-error-primary"
              : "border-primary text-tertiary hover:border-brand hover:text-brand-secondary",
          )}
        >
          <ImagePlus className="h-5 w-5" />
          Galéria
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-error-primary">{error}</p>}
    </div>
  );
}
