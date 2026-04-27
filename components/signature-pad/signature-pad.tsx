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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
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

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  function handleReset() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  const savingRef = useRef(false);

  function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) { savingRef.current = false; return; }
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }

  return createPortal(
    // Outer wrapper stops all events from reaching the form underneath
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#fff" }}
      className="flex flex-col"
      onSubmit={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-tertiary transition-colors hover:text-primary"
        >
          Zrušiť
        </button>
        <span className="text-sm font-semibold text-primary">{label}</span>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-sm font-medium text-tertiary transition-colors hover:text-error-primary"
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
          onClick={handleSave}
          disabled={!hasStrokes}
          className="w-full rounded-lg bg-brand-solid py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-solid_hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Uložiť podpis
        </button>
      </div>
    </div>,
    document.body,
  );
}
