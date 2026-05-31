"use client";

import { useCallback, useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { useTimeSkip } from "./store";
import { dimensions, type Photo } from "@/lib/photos";
import { IconExpand, IconArrow } from "./icons";
import BlurImage from "./BlurImage";

const VISIBLE = 4; // how many cards peek in the deck
const TILTS = [-1.4, 1.1, -0.7, 1.8, -1.2, 0.6]; // gentle per-depth scatter

function cardStyle(photo: Photo) {
  const [w, h] = dimensions(photo.orientation);
  return { aspectRatio: `${w} / ${h}` };
}

/**
 * Card height that respects the viewport on both axes — the `calc(...)` term caps
 * the *width* (so wide landscape frames never overflow narrow phones), while the
 * vh/px terms cap the height on tall desktop screens.
 */
function deckHeight(photo: Photo) {
  const [w, h] = dimensions(photo.orientation);
  return `min(420px, 50vh, calc(86vw * ${h} / ${w}))`;
}

export default function StackView() {
  const { photos, open, openId } = useTimeSkip();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [dealt, setDealt] = useState(false);
  const n = photos.length;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-9, 9]);
  const frontOpacity = useTransform(x, [-260, 0, 260], [0.4, 1, 0.4]);

  // Pointer parallax — depth layers drift opposite the cursor, smoothed by a spring.
  const pmX = useSpring(useMotionValue(0), { stiffness: 120, damping: 20, mass: 0.6 });
  const pmY = useSpring(useMotionValue(0), { stiffness: 120, damping: 20, mass: 0.6 });
  const px1 = useTransform(pmX, (v) => v * 7);
  const px2 = useTransform(pmX, (v) => v * 13);
  const px3 = useTransform(pmX, (v) => v * 19);
  const py1 = useTransform(pmY, (v) => v * 5);
  const py2 = useTransform(pmY, (v) => v * 9);
  const py3 = useTransform(pmY, (v) => v * 13);
  const PX = [useMotionValue(0), px1, px2, px3];
  const PY = [useMotionValue(0), py1, py2, py3];

  const advance = useCallback(
    (delta: number) => {
      setDir(delta);
      setIndex((i) => (i + delta + n) % n);
      x.set(0);
    },
    [n, x],
  );

  // Deal the deck out once, after mount.
  useEffect(() => {
    const t = requestAnimationFrame(() => setDealt(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Keyboard flicking — ignored while the detail overlay owns the arrows.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openId) return;
      if (e.key === "ArrowRight") advance(1);
      else if (e.key === "ArrowLeft") advance(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, openId]);

  const onPointerMove = (e: React.PointerEvent) => {
    pmX.set((e.clientX / window.innerWidth - 0.5) * 2);
    pmY.set((e.clientY / window.innerHeight - 0.5) * 2);
  };
  const onPointerLeave = () => {
    pmX.set(0);
    pmY.set(0);
  };

  const current = photos[index];

  return (
    <div className="relative h-full w-full" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {/* Warm floor-glow so the deck reads as light spilling into the dark room */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "min(70vw, 560px)",
          height: "min(52vh, 460px)",
          background: "radial-gradient(ellipse at center, #e7c9a82e, transparent 68%)",
          filter: "blur(20px)",
        }}
      />

      {/* Deck — each card lives in its own full-bleed centering layer */}
      {photos.map((photo, i) => {
        const rel = (i - index + n) % n;
        if (rel >= VISIBLE) {
          return <div key={photo.id} className="hidden" aria-hidden />;
        }
        const isFront = rel === 0;
        const tilt = TILTS[(i + rel) % TILTS.length];

        return (
          <motion.div
            key={photo.id}
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{ zIndex: VISIBLE - rel, x: PX[rel], y: PY[rel] }}
          >
            <motion.div
              className="pointer-events-auto"
              style={{ height: deckHeight(photo) }}
              initial={{ scale: 0.84, y: 46, opacity: 0 }}
              animate={{
                scale: dealt ? 1 - rel * 0.05 : 0.84,
                y: dealt ? rel * 15 : 46,
                rotate: dealt ? (isFront ? 0 : tilt) : 0,
                opacity: dealt ? (rel >= VISIBLE - 1 ? 0 : 1) : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 440,
                damping: 38,
                mass: 0.8,
                delay: dealt ? rel * 0.03 : rel * 0.07,
              }}
            >
              <motion.button
                type="button"
                drag={isFront ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.65}
                style={isFront ? { x, rotate, opacity: frontOpacity } : undefined}
                onDragEnd={(_, info) => {
                  const power = info.offset.x + info.velocity.x * 0.12;
                  if (power < -110) advance(1);
                  else if (power > 110) advance(-1);
                }}
                onClick={(e) => {
                  // Treat a near-zero drag as a click → open the detail view.
                  if (Math.abs(x.get()) < 6) open(photo.id, e.currentTarget.getBoundingClientRect());
                  else e.preventDefault();
                }}
                whileTap={isFront ? { cursor: "grabbing" } : undefined}
                className="group relative block h-full overflow-hidden rounded-[14px] bg-paper-sunk u-grain-card outline-none"
                aria-label={`${photo.title}, ${photo.place}. Open.`}
                tabIndex={isFront ? 0 : -1}
              >
                <div className="relative h-full" style={cardStyle(photo)}>
                  <BlurImage photo={photo} width={1000} draggable={false} />
                  <span className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/10" />
                  {isFront && (
                    <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-paper/70 text-ink opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
                      <IconExpand width={15} height={15} />
                    </span>
                  )}
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Caption — floats below the centred deck */}
      <div className="absolute inset-x-0 bottom-[5vh] z-20 mx-auto flex w-full max-w-md flex-col items-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: dir * 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir * -10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-display text-2xl leading-tight tracking-tight text-ink">
              {current.title}
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2.5 text-ink-faint">
              <span className="font-display text-base italic text-ink-soft">{current.place}</span>
              <span className="h-1 w-1 rounded-full bg-ink-faint" />
              <span className="u-mono text-xs tracking-wide">{current.stamp}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-7 flex items-center gap-5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => advance(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:bg-ink hover:text-paper-raised"
            aria-label="Previous"
          >
            <IconArrow width={16} height={16} className="rotate-180" />
          </motion.button>

          {n <= 16 ? (
            <div className="flex items-center gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDir(i > index ? 1 : -1);
                    setIndex(i);
                    x.set(0);
                  }}
                  aria-label={`Go to ${p.title}`}
                  className="group/dot grid place-items-center p-1"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-5 bg-ink"
                        : "w-1.5 bg-ink-faint/50 group-hover/dot:bg-ink-faint"
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="u-mono tabular-nums text-sm text-ink-soft">
              {index + 1} <span className="text-ink-faint">/</span> {n}
            </span>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => advance(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-soft transition hover:bg-ink hover:text-paper-raised"
            aria-label="Next"
          >
            <IconArrow width={16} height={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
