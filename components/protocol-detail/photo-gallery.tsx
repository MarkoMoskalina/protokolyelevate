"use client";

import { useState } from "react";

import { Lightbox } from "@/components/ui/lightbox";

interface PhotoGalleryProps {
  photos: string[];
  /** Optional captions, same length as photos */
  captions?: string[];
  /** Aspect ratio class, default 4/3 */
  aspect?: string;
  /** Number of columns at sm breakpoint, default 3 */
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
} as const;

export function PhotoGallery({
  photos,
  captions,
  aspect = "aspect-[4/3]",
  columns = 3,
}: PhotoGalleryProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="text-sm text-quaternary">Žiadne fotky</p>
    );
  }

  return (
    <>
      <div className={`grid gap-2 ${colsClass[columns]}`}>
        {photos.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setOpenIdx(i)}
            className={`group relative ${aspect} w-full overflow-hidden rounded-lg border border-secondary bg-secondary`}
          >
            <img
              src={src}
              alt={captions?.[i] || `Fotka ${i + 1}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {captions?.[i] && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-xs font-medium text-white">
                {captions[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {openIdx !== null && (
        <Lightbox
          images={photos}
          index={openIdx}
          onClose={() => setOpenIdx(null)}
          onIndexChange={photos.length > 1 ? setOpenIdx : undefined}
        />
      )}
    </>
  );
}
