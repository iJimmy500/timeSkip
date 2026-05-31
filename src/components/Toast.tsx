"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTimeSkip } from "./store";

export default function Toast() {
  const { toast } = useTimeSkip();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center sm:top-24">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="rounded-full border border-line-strong bg-ink px-4 py-2 text-sm font-medium text-paper-raised shadow-lg"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
