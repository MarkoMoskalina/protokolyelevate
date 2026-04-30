"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const hasNav = images.length > 1 && !!onIndexChange;

  const goPrev = useCallback(() => {
    if (!onIndexChange) return;
    onIndexChange(index <= 0 ? images.length - 1 : index - 1);
  }, [index, images.length, onIndexChange]);

  const goNext = useCallback(() => {
    if (!onIndexChange) return;
    onIndexChange(index >= images.length - 1 ? 0 : index + 1);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (hasNav && e.key === "ArrowLeft") goPrev();
      if (hasNav && e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext, hasNav]);

  const src = images[index];
  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
        className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image centered */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: "48px 12px" }}
      >
        <img
          src={src}
          alt=""
          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: 8 }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Prev */}
      {hasNav && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
          className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {hasNav && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
          className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Counter */}
      {hasNav && (
        <div
          style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
          className="rounded-full bg-white/10 px-3 py-1 text-sm text-white"
        >
          {index + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body,
  );
}
