"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

import { SignaturePad } from "@/components/signature-pad/signature-pad";
import { uploadSignature } from "@/lib/upload";

interface UserSettingsModalProps {
  user: User;
  onClose: () => void;
}

export function UserSettingsModal({ user, onClose }: UserSettingsModalProps) {
  const [signature, setSignature] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Guard: block overlay-close for a short window after SignaturePad's
  // fullscreen signing modal unmounts. On iOS, the unmount can deliver a
  // phantom pointer/click to the overlay underneath the just-removed modal.
  const closeBlockedUntilRef = useRef(0);

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // load current saved signature
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/signature");
        if (!res.ok) return;
        const data: { signedUrl: string | null } = await res.json();
        if (cancelled) return;
        setSignature(data.signedUrl ?? "");
      } catch {
        // ignore — empty signature is fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSignatureChange(value: string) {
    setSignature(value);
    setDirty(true);
    // Block overlay close for 400ms: when SignaturePad's fullscreen modal
    // unmounts and passes the value here, iOS can fire a phantom click on the
    // overlay that would immediately close this modal before the user can save.
    closeBlockedUntilRef.current = Date.now() + 400;
  }

  const handleOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (Date.now() < closeBlockedUntilRef.current) return;
      onClose();
    },
    [onClose],
  );

  async function handleSave() {
    if (saving || removing) return;
    if (!signature) {
      toast.error("Najprv sa podpíšte");
      return;
    }
    setSaving(true);
    try {
      let path: string;

      if (signature.startsWith("data:")) {
        // newly drawn signature → upload PNG to a per-user folder
        path = await uploadSignature(
          signature,
          `employee-signatures/${user.id}`,
        );
      } else {
        // unchanged signed URL → reuse existing storage path
        const match = signature.match(
          /\/storage\/v1\/object\/(?:sign|public)\/protocol-photos\/([^?]+)/,
        );
        if (!match) {
          toast.error("Neplatný formát podpisu");
          setSaving(false);
          return;
        }
        path = decodeURIComponent(match[1]);
      }

      const res = await fetch("/api/me/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Uloženie zlyhalo");
      }

      toast.success("Podpis uložený");
      setDirty(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uloženie zlyhalo");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (saving || removing) return;
    if (!confirm("Naozaj odstrániť uložený podpis?")) return;
    setRemoving(true);
    try {
      const res = await fetch("/api/me/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: null }),
      });
      if (!res.ok) throw new Error("Odstránenie zlyhalo");
      setSignature("");
      setDirty(false);
      toast.success("Podpis odstránený");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odstránenie zlyhalo");
    } finally {
      setRemoving(false);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-settings-title"
      style={{ position: "fixed", inset: 0, zIndex: 9000 }}
      className="flex items-center justify-center bg-black/50 p-4"
      onPointerDown={handleOverlayPointerDown}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-primary shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
          <h2
            id="user-settings-title"
            className="text-md font-semibold text-primary"
          >
            Nastavenia účtu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary"
            aria-label="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* User identity */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "Používateľ"}
              </p>
              <p className="truncate text-xs text-tertiary">{user.email}</p>
            </div>
          </div>

          {/* Saved signature */}
          <div>
            <p className="mb-1 text-sm font-medium text-secondary">
              Môj podpis
            </p>
            <p className="mb-3 text-xs text-tertiary">
              Bude sa automaticky vyplnený ako podpis prenajímateľa pri každom
              novom protokole. Pri konkrétnom protokole ho môžete vždy nahradiť
              cez „Podpísať znova".
            </p>

            {loading ? (
              <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-secondary text-sm text-tertiary">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Načítavam...
              </div>
            ) : (
              <SignaturePad
                label=""
                value={signature}
                onChange={handleSignatureChange}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-secondary px-5 py-4">
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading || saving || removing || !signature}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-error-primary transition-colors hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Odstrániť
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary_hover"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || removing || !dirty || !signature}
              className="flex items-center gap-2 rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Uložiť
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
