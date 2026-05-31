"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTimeSkip } from "./store";
import { IconAlbums, IconChevron, IconCheck } from "./icons";

/**
 * The album switcher is a single morphing surface: the trigger pill *is* the
 * panel. Opening it grows the same container (Motion `layout`) and unfolds the
 * list out of it — no detached dropdown, no gap.
 */
export default function AlbumMenu() {
  const { albums, albumId, setAlbum } = useTimeSkip();
  const [open, setOpen] = useState(false);
  const current = albums.find((a) => a.id === albumId) ?? albums[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      {/* invisible sizer reserves the collapsed footprint so the header never reflows */}
      <div aria-hidden className="invisible flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 sm:pr-3">
        <IconAlbums width={14} height={14} />
        <span className="hidden max-w-[9rem] truncate text-[0.8rem] font-medium sm:inline">
          {current.title}
        </span>
        <IconChevron width={14} height={14} />
      </div>

      {/* click-away */}
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}

      <motion.div
        layout
        transition={{ type: "spring", stiffness: 440, damping: 36, mass: 0.7 }}
        style={{ borderRadius: 16 }}
        className="absolute left-0 top-0 z-50 overflow-hidden border border-line-strong bg-paper-raised/95 shadow-2xl backdrop-blur-2xl"
      >
        <motion.button
          layout="position"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 py-1.5 pl-2.5 pr-2 text-ink-soft transition-colors hover:text-ink sm:pr-3"
        >
          <IconAlbums width={14} height={14} className="text-ink-faint" />
          <span className="hidden max-w-[9rem] truncate text-left text-[0.8rem] font-medium text-ink sm:inline">
            {current.title}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="flex">
            <IconChevron width={14} height={14} className="text-ink-faint" />
          </motion.span>
        </motion.button>

        {open && (
          <div className="w-[15.5rem] border-t border-line p-1.5">
            {albums
              .filter((album) => album.id === "reddead")
              .map((album, i) => {
                const active = album.id === albumId;
                return (
                  <motion.button
                    layout="position"
                    key={album.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.045, ease: [0.22, 1, 0.36, 1], duration: 0.32 }}
                    onClick={() => {
                      setAlbum(album.id);
                      setOpen(false);
                    }}
                    className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-paper-sunk"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-clay">
                      {active && <IconCheck width={14} height={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`font-display text-[0.98rem] leading-tight ${active ? "text-ink" : "text-ink-soft group-hover:text-ink"}`}>
                          {album.title}
                        </span>
                        <span className="u-mono shrink-0 text-[0.62rem] text-ink-faint">
                          {String(album.count).padStart(2, "0")}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">
                        {album.blurb}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            
            <div className="flex w-full items-center gap-3 px-3 py-2 text-left select-none border-t border-line/50 mt-1.5 pt-2">
              <span className="w-4 shrink-0" />
              <span className="font-display text-xs italic text-ink-faint">
                More albums soon...
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
