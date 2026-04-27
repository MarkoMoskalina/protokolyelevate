"use client";

import { Fuel } from "lucide-react";

import { cn } from "@/lib/utils";

const LEVELS = ["1/4", "2/4", "3/4", "4/4"] as const;
type FuelLevel = (typeof LEVELS)[number];

const FILL_WIDTH: Record<FuelLevel, string> = {
  "1/4": "w-1/4",
  "2/4": "w-2/4",
  "3/4": "w-3/4",
  "4/4": "w-full",
};

interface FuelLevelPickerProps {
  value: string;
  onChange: (level: FuelLevel) => void;
  error?: string;
}

export function FuelLevelPicker({ value, onChange, error }: FuelLevelPickerProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        Stav paliva
      </label>
      <div className="flex gap-2">
        {LEVELS.map((level) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 overflow-hidden rounded-lg border py-3 text-xs font-medium transition-all",
                isSelected
                  ? "border-brand bg-brand-primary text-brand-secondary"
                  : "border-primary text-tertiary hover:border-brand/50",
                error && !value && "border-error",
              )}
            >
              <div className="relative z-10 flex flex-col items-center gap-1">
                <Fuel className="h-4 w-4" />
                <span>{level}</span>
              </div>
              {isSelected && (
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-1 rounded-full bg-brand-solid",
                    FILL_WIDTH[level],
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-error-primary">{error}</p>}
    </div>
  );
}
