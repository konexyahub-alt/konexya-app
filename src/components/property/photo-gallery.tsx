"use client";

import { useRef, useState } from "react";

type Photo = { url: string; alt: string };

/** Galeria com rolagem lateral e contador (1/12). Fotos de terceiros usam <img> simples. */
export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="grid h-[300px] place-items-center bg-paper-2 text-xs font-semibold text-muted-2">
        Sem fotos
      </div>
    );
  }
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-[300px] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        aria-label={`Fotos de ${title}`}
      >
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.url + i}
            src={p.url}
            alt={p.alt}
            loading={i === 0 ? "eager" : "lazy"}
            className="h-full w-full flex-none snap-center object-cover"
          />
        ))}
      </div>
      <span className="num absolute bottom-3 right-4 rounded-full bg-black px-2.5 py-0.5 text-[11.5px] font-semibold text-white">
        {index + 1}/{photos.length}
      </span>
    </div>
  );
}
