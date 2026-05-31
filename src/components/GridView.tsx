"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTimeSkip } from "./store";
import { dimensions, type Photo } from "@/lib/photos";
import { IconBookmarkFilled } from "./icons";
import BlurImage from "./BlurImage";

function ratio(photo: Photo) {
  const [w, h] = dimensions(photo.orientation);
  return { aspectRatio: `${w} / ${h}` };
}

export default function GridView() {
  const { photos, open, isFavorite, favorites } = useTimeSkip();
  const [savedOnly, setSavedOnly] = useState(false);
  const hasSaved = favorites.size > 0;
  const list = savedOnly ? photos.filter((p) => isFavorite(p.id)) : photos;

  return (
    <div className="u-scroll h-full w-full overflow-y-auto px-4 pb-16 pt-24 sm:px-8 sm:pt-28 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-end justify-between gap-4 border-b border-line-strong pb-4 sm:mb-10 sm:pb-5">
          <div>
            <h2 className="font-display text-[1.75rem] leading-none tracking-tight text-ink sm:text-4xl">
              {savedOnly ? "Saved" : "The collection"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {list.length} {list.length === 1 ? "moment" : "moments"}
              {savedOnly ? " you kept" : ", ordered as they were found"}.
            </p>
          </div>

          {hasSaved && (
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-paper-raised/60 p-1 backdrop-blur-md">
              {([["All", false], ["Saved", true]] as const).map(([label, val]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSavedOnly(val)}
                  className="relative rounded-full px-3 py-1 text-xs font-medium transition-colors"
                >
                  {savedOnly === val && (
                    <motion.span
                      layoutId="grid-filter-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className={`relative z-10 ${savedOnly === val ? "text-paper-raised" : "text-ink-soft"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
          {list.map((photo, i) => (
            <motion.button
              key={photo.id}
              type="button"
              onClick={(e) => open(photo.id, e.currentTarget.getBoundingClientRect())}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="group block w-full break-inside-avoid text-left"
            >
              <div
                className="relative overflow-hidden rounded-xl bg-paper-sunk u-grain-card transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:scale-[1.03]"
                style={ratio(photo)}
              >
                <BlurImage photo={photo} width={800} />
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                {isFavorite(photo.id) && (
                  <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-paper/80 text-clay backdrop-blur-md">
                    <IconBookmarkFilled width={13} height={13} />
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 px-0.5">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base leading-tight text-ink">
                    {photo.title}
                  </h3>
                  <p className="truncate text-[0.8rem] text-ink-faint">{photo.place}</p>
                </div>
                <span className="u-mono shrink-0 text-[0.65rem] text-ink-faint">{photo.stamp}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
