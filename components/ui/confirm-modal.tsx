"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmVariant = "danger" | "default";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Potvrdiť",
  cancelLabel = "Zrušiť",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isDanger = variant === "danger";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{ position: "fixed", inset: 0, zIndex: 9100 }}
      className="flex items-center justify-center bg-black/50 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-primary shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Zavrieť"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-1 items-start gap-4 overflow-y-auto px-5 py-5 pr-12">
          {isDanger && (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-modal-title"
              className="text-md font-semibold text-primary"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-tertiary">{description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-secondary px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:py-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            data-danger={isDanger || undefined}
            style={
              isDanger
                ? { backgroundColor: "#dc2626", color: "#ffffff" }
                : undefined
            }
            onPointerEnter={(e) => {
              if (loading || !isDanger) return;
              e.currentTarget.style.backgroundColor = "#b91c1c";
            }}
            onPointerLeave={(e) => {
              if (!isDanger) return;
              e.currentTarget.style.backgroundColor = "#dc2626";
            }}
            className={
              isDanger
                ? "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
                : "flex w-full items-center justify-center gap-2 rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-solid_hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
            }
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
