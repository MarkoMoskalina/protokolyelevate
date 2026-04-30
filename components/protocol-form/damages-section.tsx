"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/protocol-form/form-field";
import { MultiPhotoUpload } from "@/components/photo-upload/multi-photo-upload";
import type { DamageEntry } from "@/lib/form-types";
import { uuid } from "@/lib/uuid";

interface DamagesSectionProps {
  damages: DamageEntry[];
  onChange: (damages: DamageEntry[]) => void;
  /** Section label, defaults to "Poškodenia" */
  title?: string;
}

export function DamagesSection({
  damages,
  onChange,
  title = "Poškodenia",
}: DamagesSectionProps) {
  function addDamage() {
    onChange([
      ...damages,
      { id: uuid(), description: "", photos: [] },
    ]);
  }

  function removeDamage(id: string) {
    onChange(damages.filter((d) => d.id !== id));
  }

  function updateDamage(id: string, patch: Partial<DamageEntry>) {
    onChange(damages.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary">
        {title}
      </label>

      {damages.length > 0 && (
        <div className="flex flex-col gap-4 mb-3">
          {damages.map((damage, index) => (
            <div
              key={damage.id}
              className="rounded-lg border border-secondary bg-secondary/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-tertiary">
                  Poškodenie {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeDamage(damage.id)}
                  className="flex items-center gap-1 text-xs text-tertiary transition-colors hover:text-error-primary"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Odstrániť
                </button>
              </div>

              <Input
                value={damage.description}
                onChange={(e) =>
                  updateDamage(damage.id, { description: e.target.value })
                }
                placeholder="Popis poškodenia..."
              />

              <div className="mt-3">
                <MultiPhotoUpload
                  value={damage.photos}
                  onChange={(photos) =>
                    updateDamage(damage.id, { photos })
                  }
                  label="Fotky poškodenia"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addDamage}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-medium text-tertiary transition-colors hover:border-brand hover:text-brand-secondary"
      >
        <Plus className="h-4 w-4" />
        Pridať poškodenie
      </button>
    </div>
  );
}
