"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { srcFor, type Photo } from "@/lib/photos";

/**
 * Progressive image. A tiny blurred placeholder fills the frame instantly, then
 * the full resolution fades in over it once decoded — no pop, no layout shift.
 * Pass `layoutId` to participate in the shared-element morph (grid/stack/detail);
 * leave it off in the spatial canvas, which lives inside a transform.
 */
export default function BlurImage({
  photo,
  width,
  layoutId,
  className = "",
  draggable = true,
}: {
  photo: Photo;
  width: number;
  layoutId?: string;
  className?: string;
  draggable?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  // Prefer the base64 LQIP from Supabase (no network); else a tiny remote thumb.
  const placeholder = photo.lqip ?? srcFor(photo, 24);

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{
          backgroundImage: `url(${placeholder})`,
          opacity: loaded ? 0 : 1,
          transition: "opacity 700ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      <motion.img
        layoutId={layoutId}
        transition={{ type: "spring", stiffness: 280, damping: 32 }}
        src={srcFor(photo, width)}
        alt={`${photo.title} — ${photo.place}`}
        draggable={draggable ? undefined : false}
        onLoad={() => setLoaded(true)}
        className={`relative block h-full w-full select-none object-cover ${className}`}
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 800ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </>
  );
}
