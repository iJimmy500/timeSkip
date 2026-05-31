"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { TimeSkipProvider, useTimeSkip } from "./store";
import Header from "./Header";
import StackView from "./StackView";
import SpatialView from "./SpatialView";
import GridView from "./GridView";
import PhotoDetail from "./PhotoDetail";
import Toast from "./Toast";

function Stage() {
  const { view, albumId } = useTimeSkip();
  return (
    <main className="relative z-10 h-[100dvh] w-full overflow-hidden">
      <Header />
      <LayoutGroup>
        <AnimatePresence mode="wait">
          <motion.section
            key={`${view}:${albumId}`}
            className="h-full w-full"
            initial={{ opacity: 0, scale: view === "spatial" ? 1.03 : 0.985, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.99, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
          >
            {view === "stack" && <StackView />}
            {view === "spatial" && <SpatialView />}
            {view === "grid" && <GridView />}
          </motion.section>
        </AnimatePresence>

        <PhotoDetail />
      </LayoutGroup>
      <Toast />
    </main>
  );
}

export default function Experience() {
  return (
    <TimeSkipProvider>
      <Stage />
    </TimeSkipProvider>
  );
}
