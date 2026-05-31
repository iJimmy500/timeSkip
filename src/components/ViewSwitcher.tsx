"use client";

import { motion } from "motion/react";
import { useTimeSkip, type ViewMode } from "./store";
import { IconStack, IconSpatial, IconGrid } from "./icons";

const OPTIONS: { id: ViewMode; label: string; Icon: typeof IconStack }[] = [
  { id: "stack", label: "Stack", Icon: IconStack },
  { id: "spatial", label: "Spatial", Icon: IconSpatial },
  { id: "grid", label: "Grid", Icon: IconGrid },
];

export default function ViewSwitcher() {
  const { view, setView } = useTimeSkip();

  return (
    <div className="flex items-center gap-1 rounded-full border border-line-strong bg-paper-raised/70 p-1 backdrop-blur-md">
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = view === id;
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => setView(id)}
            whileTap={{ scale: 0.92 }}
            aria-pressed={active}
            className="relative flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition-colors duration-300 sm:px-3.5"
          >
            {active && (
              <motion.span
                layoutId="view-pill"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors duration-300 ${
                active ? "text-paper-raised" : "text-ink-faint"
              }`}
            >
              <Icon width={15} height={15} />
            </span>
            <span
              className={`relative z-10 hidden sm:inline transition-colors duration-300 ${
                active ? "text-paper-raised" : "text-ink-soft"
              }`}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
