"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useTimeSkip } from "./store";
import { srcFor } from "@/lib/photos";
import { sharePhoto, downloadPhoto } from "@/lib/share";
import BlurImage from "./BlurImage";
import {
  IconClose,
  IconArrow,
  IconShare,
  IconDownload,
  IconBookmark,
  IconBookmarkFilled,
} from "./icons";

export default function PhotoDetail() {
  const { photos, openId, openRect, open, close, isFavorite, toggleFavorite, notify } = useTimeSkip();
  const index = photos.findIndex((p) => p.id === openId);
  const photo = index >= 0 ? photos[index] : null;
  const n = photos.length;
  const dragControls = useDragControls();

  const go = useCallback(
    (delta: number) => {
      if (index < 0) return;
      open(photos[(index + delta + n) % n].id);
    },
    [index, n, open, photos],
  );

  // Warm the neighbouring frames so prev/next never waits.
  useEffect(() => {
    if (index < 0) return;
    [1, -1].forEach((d) => {
      const img = new Image();
      img.src = srcFor(photos[(index + d + n) % n], 1400);
    });
  }, [index, n, photos]);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photo, close, go]);

  const onShare = async () => {
    if (!photo) return;
    const result = await sharePhoto(photo);
    if (result === "copied") notify("Link copied to clipboard");
    else if (result === "shared") notify("Shared");
    else if (result === "failed") notify("Couldn’t share — try again");
  };

  const onDownload = async () => {
    if (!photo) return;
    notify("Saving image…");
    const ok = await downloadPhoto(photo);
    if (!ok) notify("Opened image in a new tab");
  };

  const onSave = () => {
    if (!photo) return;
    toggleFavorite(photo.id);
    notify(isFavorite(photo.id) ? "Removed from saved" : "Saved to your collection");
  };

  // Build the transform that grows the popup out of the thumbnail it was opened
  // from (and, on exit, shrinks it back into that same spot).
  const r = openRect;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const originX = r ? r.x + r.width / 2 - vw / 2 : 0;
  const originY = r ? r.y + r.height / 2 - vh / 2 : 0;
  const originScale = r ? Math.min(Math.max(r.width / Math.min(vw * 0.92, 1024), 0.16), 0.5) : 0.92;
  const fromOrigin = { opacity: 0, x: originX, y: originY, scale: originScale };

  return (
    <AnimatePresence>
      {photo && (
        <motion.div key="detail" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) close();
            }}
            className="u-scroll relative grid max-h-[90dvh] w-full max-w-5xl gap-0 overflow-y-auto overflow-x-hidden rounded-2xl border border-line-strong bg-paper-raised shadow-2xl md:max-h-[88vh] md:grid-cols-[1.5fr_1fr] md:overflow-hidden"
            style={{ transformOrigin: "center center" }}
            initial={fromOrigin}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={fromOrigin}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
          >
            {/* Image */}
            <div className="relative flex max-h-[44vh] items-center justify-center overflow-hidden bg-paper-sunk md:max-h-[82vh]">
              {/* Mobile grab handle → swipe down to dismiss */}
              <span
                onPointerDown={(e) => dragControls.start(e)}
                className="absolute left-1/2 top-2.5 z-20 h-1.5 w-10 -translate-x-1/2 cursor-grab touch-none rounded-full bg-paper-raised/70 backdrop-blur-md md:hidden"
                aria-hidden
              />
              <BlurImage key={photo.id} photo={photo} width={1400} />
            </div>

            {/* Meta + actions */}
            <motion.div
              key={photo.id}
              className="flex flex-col justify-between gap-6 p-5 sm:p-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="u-mono u-label text-clay">
                    {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper-sunk"
                    aria-label="Close"
                  >
                    <IconClose width={18} height={18} />
                  </button>
                </div>

                <h2 className="mt-5 font-display text-3xl leading-tight tracking-tight text-ink">
                  {photo.title}
                </h2>

                <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="u-label text-ink-faint">Place</dt>
                    <dd className="text-ink-soft">{photo.place}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="u-label text-ink-faint">Moment</dt>
                    <dd className="u-mono text-ink-soft">{photo.stamp}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="u-label text-ink-faint">Frame</dt>
                    <dd className="u-mono uppercase text-ink-soft">{photo.orientation}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-8">
                <div className="flex gap-2.5">
                  <motion.button
                    type="button"
                    onClick={onSave}
                    whileTap={{ scale: 0.96 }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                      isFavorite(photo.id)
                        ? "bg-clay text-paper-raised"
                        : "bg-ink text-paper-raised hover:bg-ink-soft"
                    }`}
                  >
                    <motion.span
                      key={isFavorite(photo.id) ? "on" : "off"}
                      initial={{ scale: 0.4, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 16 }}
                      className="flex"
                    >
                      {isFavorite(photo.id) ? (
                        <IconBookmarkFilled width={16} height={16} />
                      ) : (
                        <IconBookmark width={16} height={16} />
                      )}
                    </motion.span>
                    {isFavorite(photo.id) ? "Saved" : "Save"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={onShare}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:bg-paper-sunk"
                    aria-label="Share"
                  >
                    <IconShare width={17} height={17} />
                  </button>
                  <button
                    type="button"
                    onClick={onDownload}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:bg-paper-sunk"
                    aria-label="Download"
                  >
                    <IconDownload width={17} height={17} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="flex items-center gap-1.5 text-sm text-ink-faint transition hover:text-ink"
                  >
                    <IconArrow width={15} height={15} className="rotate-180" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="flex items-center gap-1.5 text-sm text-ink-faint transition hover:text-ink"
                  >
                    Next
                    <IconArrow width={15} height={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
