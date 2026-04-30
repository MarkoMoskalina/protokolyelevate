"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eraser, Pen, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
}

export function SignaturePad({ label, value, onChange, error }: SignaturePadProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleSave = useCallback((dataUrl: string) => {
    setModalOpen(false);
    requestAnimationFrame(() => {
      onChangeRef.current(dataUrl);
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        {label}
      </label>

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt={label}
            className="h-24 w-full rounded-lg border border-secondary bg-white object-contain"
          />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary py-2 text-xs font-medium text-secondary transition-colors hover:border-brand hover:text-brand-secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Podpísať znova
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-sm font-medium transition-colors",
            error
              ? "border-error text-error-primary"
              : "border-primary text-tertiary hover:border-brand hover:text-brand-secondary",
          )}
        >
          <Pen className="h-4 w-4" />
          Podpísať
        </button>
      )}

      {error && !value && <p className="mt-1 text-xs text-error-primary">{error}</p>}

      {modalOpen && (
        <SignatureModal
          label={label}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface SignatureModalProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

function SignatureModal({ label, onSave, onClose }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  // When `closing` is true the modal stops accepting input but stays mounted
  // for a few hundred ms. During that window the full-screen overlay swallows
  // any "ghost" click/touch that mobile browsers synthesize after the user's
  // tap on "Uložiť podpis". This prevents the click from falling through to
  // the buttons sitting underneath on the original page (e.g. "Uložiť ako
  // predpripravené").
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function applyContextDefaults(ctx: CanvasRenderingContext2D, dpr: number) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const targetWidth = Math.round(w * dpr);
      const targetHeight = Math.round(h * dpr);

      // IMPORTANT: assigning canvas.width / canvas.height (even to the same
      // value) wipes the bitmap. Mobile browsers fire spurious `resize`
      // events when the URL bar shows / hides, so we must skip the work
      // unless the pixel size actually changed. Otherwise the user's
      // signature gets cleared mid-drawing on the very first interaction
      // after a hard refresh, and the next "Uložiť podpis" tap saves an
      // empty PNG.
      if (canvas.width === targetWidth && canvas.height === targetHeight) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Snapshot current pixels so we can restore them after the resize
      // wipes the bitmap. Ignored when the canvas was empty (first run).
      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        const tmp = document.createElement("canvas");
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        const tmpCtx = tmp.getContext("2d");
        if (tmpCtx) {
          tmpCtx.drawImage(canvas, 0, 0);
          snapshot = tmp;
        }
      }

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      applyContextDefaults(ctx, dpr);

      if (snapshot) {
        // Re-paint the previous strokes scaled into the new canvas size.
        // Using setTransform to draw in device pixels, then restoring the
        // dpr scale for subsequent strokes.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, targetWidth, targetHeight);
        applyContextDefaults(ctx, dpr);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    },
    [],
  );

  const startDraw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      setHasStrokes(true);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getPos],
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [getPos],
  );

  const endDraw = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (e && "touches" in e) {
      e.preventDefault();
    }
  }, []);

  function handleReset() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  const hasStrokesRef = useRef(false);
  useEffect(() => {
    hasStrokesRef.current = hasStrokes;
  }, [hasStrokes]);

  const savingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Run a callback after a short delay during which an opaque, click-eating
  // overlay covers the entire viewport. This swallows any synthetic
  // click/touchend that mobile browsers fire after the user lifts their
  // finger, so it cannot fall through to the buttons on the page underneath.
  const runWithGhostClickGuard = useCallback((cb: () => void) => {
    setClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      cb();
    }, 350);
  }, []);

  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasStrokesRef.current) return;

    // Defensive: make sure the canvas actually contains visible pixels.
    // On mobile browsers a stray `resize` event can wipe the bitmap right
    // before the user taps "Uložiť" — without this guard we would save a
    // blank PNG and silently close the modal.
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const { width, height } = canvas;
      let hasInk = false;
      try {
        const data = ctx.getImageData(0, 0, width, height).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0) { hasInk = true; break; }
        }
      } catch {
        // getImageData can throw on tainted canvases; assume there's ink.
        hasInk = true;
      }
      if (!hasInk) {
        // The strokes were wiped (almost certainly by an URL-bar resize).
        // Reset the "has strokes" flag so the save button disables again
        // and the user can re-sign without a confusing silent failure.
        setHasStrokes(false);
        hasStrokesRef.current = false;
        return;
      }
    }

    savingRef.current = true;
    const dataUrl = canvas.toDataURL("image/png");
    runWithGhostClickGuard(() => onSave(dataUrl));
  }, [onSave, runWithGhostClickGuard]);

  const handleCancel = useCallback(() => {
    runWithGhostClickGuard(() => onClose());
  }, [onClose, runWithGhostClickGuard]);

  // iOS Safari sometimes drops the first synthetic `click` that follows a
  // recently-cancelled touch sequence on the canvas above. Triggering save
  // on `pointerup` makes the first tap reliable across browsers / devices.
  const handleSavePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave],
  );

  // Eat any event that bubbles up to the closing overlay so it never reaches
  // the underlying page.
  const eatEvent = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#fff" }}
      className="flex flex-col"
      aria-hidden={closing}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={closing}
          className="text-sm font-medium text-tertiary transition-colors hover:text-primary disabled:opacity-50"
        >
          Zrušiť
        </button>
        <span className="text-sm font-semibold text-primary">{label}</span>
        <button
          type="button"
          onClick={handleReset}
          disabled={closing}
          className="flex items-center gap-1 text-sm font-medium text-tertiary transition-colors hover:text-error-primary disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" />
          Odznova
        </button>
      </div>

      {/* Canvas area */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-quaternary">Podpíšte sa prstom alebo myšou</p>
          </div>
        )}
        {/* Baseline guide */}
        <div className="pointer-events-none absolute bottom-[30%] left-8 right-8 border-b border-dashed border-secondary" />
      </div>

      {/* Footer */}
      <div className="border-t border-secondary p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onPointerUp={handleSavePointerUp}
          onClick={handleSave}
          disabled={!hasStrokes || closing}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="w-full rounded-lg bg-brand-solid py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Uložiť podpis
        </button>
      </div>

      {/* Ghost-click guard. While the modal is closing we keep this overlay
          mounted on top of everything (including the modal content itself)
          to swallow any synthetic click/touchend that fires after the save
          tap. Without it, mobile Safari/Chrome will deliver that ghost
          click to whatever button now sits at the same screen coordinates,
          e.g. "Uložiť ako predpripravené". */}
      {closing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "transparent",
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
          }}
          onClickCapture={eatEvent}
          onMouseDownCapture={eatEvent}
          onMouseUpCapture={eatEvent}
          onPointerDownCapture={eatEvent}
          onPointerUpCapture={eatEvent}
          onTouchStartCapture={eatEvent}
          onTouchEndCapture={eatEvent}
        />
      )}
    </div>,
    document.body,
  );
}
