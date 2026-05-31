"use client";

import { AnimatePresence, motion } from "motion/react";
import ViewSwitcher from "./ViewSwitcher";
import AlbumMenu from "./AlbumMenu";
import { useTimeSkip } from "./store";
import { IconBookmarkFilled } from "./icons";

export default function Header() {
  const { favorites, setView } = useTimeSkip();
  const count = favorites.size;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center px-5 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
        <span className="font-display text-[1.15rem] font-medium leading-none tracking-tight text-ink sm:text-[1.3rem]">
          Timeskip
        </span>
        <span className="hidden h-4 w-px bg-line-strong sm:block" />
        <AlbumMenu />
      </div>

      <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
        <ViewSwitcher />
      </div>

      <div className="pointer-events-auto ml-auto flex items-center gap-3">
        <AnimatePresence>
          {count > 0 && (
            <motion.button
              type="button"
              onClick={() => setView("grid")}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="hidden items-center gap-1.5 rounded-full border border-line-strong bg-paper-raised/60 px-3 py-1.5 text-ink-soft backdrop-blur-md transition hover:text-ink sm:flex"
              aria-label={`${count} saved`}
            >
              <IconBookmarkFilled width={13} height={13} className="text-clay" />
              <span className="u-mono text-xs tabular-nums">{count}</span>
            </motion.button>
          )}
        </AnimatePresence>

        <a
          href="https://james006.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1 text-sm text-ink-faint transition-colors hover:text-ink"
        >
          <span className="u-mono tracking-wide">james006</span>
          <span className="text-[0.7em] text-clay transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px">
            ↗
          </span>
        </a>
      </div>
    </header>
  );
}
