"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { useTimeSkip } from "./store";
import { dimensions, type Photo } from "@/lib/photos";
import { IconPlus, IconMinus, IconReframe } from "./icons";
import BlurImage from "./BlurImage";

const SPREAD_X = 900;
const SPREAD_Y = 580;
const CARD_BASE = 312;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2.6;
const MARGIN = 150; // how far content may travel before the edge resists

function cardSize(photo: Photo) {
  const [w, h] = dimensions(photo.orientation);
  const width = CARD_BASE * photo.scale;
  return { width, height: (width * h) / w };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Clamp a translate to a range, centring when the range inverts (content < viewport). */
function settle(v: number, lo: number, hi: number) {
  if (lo > hi) return (lo + hi) / 2;
  return clamp(v, lo, hi);
}

/** Elastic resistance once a translate passes its bound — the rubber-band feel. */
function rubber(v: number, lo: number, hi: number) {
  if (lo > hi) {
    const c = (lo + hi) / 2;
    return c + (v - c) * 0.22;
  }
  if (v < lo) return lo - (lo - v) * 0.35;
  if (v > hi) return hi + (v - hi) * 0.35;
  return v;
}

export default function SpatialView() {
  const { photos, open } = useTimeSkip();
  const viewport = useRef<HTMLDivElement>(null);

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const scale = useMotionValue(1);
  const [scaleLabel, setScaleLabel] = useState(100);
  const [hovered, setHovered] = useState<string | null>(null);

  const world = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of photos) {
      const { width, height } = cardSize(p);
      minX = Math.min(minX, p.x * SPREAD_X - width / 2);
      maxX = Math.max(maxX, p.x * SPREAD_X + width / 2);
      minY = Math.min(minY, p.y * SPREAD_Y - height / 2);
      maxY = Math.max(maxY, p.y * SPREAD_Y + height / 2);
    }
    return { minX, minY, maxX, maxY };
  }, [photos]);

  /** Allowed translate range for the current scale + viewport size. */
  const boundsFor = useCallback(
    (s: number) => {
      const rect = viewport.current?.getBoundingClientRect();
      const w = rect?.width ?? window.innerWidth;
      const h = rect?.height ?? window.innerHeight;
      return {
        left: MARGIN - s * world.maxX,
        right: w - MARGIN - s * world.minX,
        top: MARGIN - s * world.maxY,
        bottom: h - MARGIN - s * world.minY,
      };
    },
    [world],
  );

  // pointer + physics bookkeeping
  const drag = useRef({ active: false, moved: false, lx: 0, ly: 0, rx: 0, ry: 0, vx: 0, vy: 0, t: 0 });
  const raf = useRef<number | null>(null);
  const suppressClick = useRef(false);
  // multi-touch pinch
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; wx: number; wy: number } | null>(null);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  useEffect(() => {
    const unsub = scale.on("change", (s) => setScaleLabel(Math.round(s * 100)));
    return () => unsub();
  }, [scale]);

  const reframe = useCallback(() => {
    const rect = viewport.current?.getBoundingClientRect();
    if (!rect) return;
    stop();
    const pad = 56;
    const contentW = world.maxX - world.minX + pad * 2;
    const contentH = world.maxY - world.minY + pad * 2;
    const s = clamp(Math.min(rect.width / contentW, rect.height / contentH), MIN_SCALE, 1.25);
    const midX = (world.minX + world.maxX) / 2;
    const midY = (world.minY + world.maxY) / 2;
    scale.set(s);
    tx.set(rect.width / 2 - midX * s);
    ty.set(rect.height / 2 - midY * s);
  }, [world, scale, tx, ty]);

  useEffect(() => {
    reframe();
    const onResize = () => reframe();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reframe]);

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      stop();
      const s = scale.get();
      const s2 = clamp(s * factor, MIN_SCALE, MAX_SCALE);
      if (s2 === s) return;
      const nx = px - (px - tx.get()) * (s2 / s);
      const ny = py - (py - ty.get()) * (s2 / s);
      scale.set(s2);
      const b = boundsFor(s2);
      tx.set(settle(nx, b.left, b.right));
      ty.set(settle(ny, b.top, b.bottom));
    },
    [scale, tx, ty, boundsFor],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = viewport.current?.getBoundingClientRect();
      if (!rect) return;
      stop();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * 0.01), px, py);
      } else {
        const b = boundsFor(scale.get());
        tx.set(settle(tx.get() - e.deltaX, b.left, b.right));
        ty.set(settle(ty.get() - e.deltaY, b.top, b.bottom));
      }
    },
    [tx, ty, scale, zoomAt, boundsFor],
  );

  // Momentum + elastic snap-back, integrated in one loop.
  const fling = useCallback(() => {
    const friction = 0.92;
    const k = 0.12;
    const damp = 0.75;
    const step = () => {
      const d = drag.current;
      const b = boundsFor(scale.get());

      let nx = tx.get() + d.vx;
      const tX = settle(nx, b.left, b.right);
      if (nx !== tX) {
        d.vx += (tX - nx) * k;
        d.vx *= damp;
        nx = tx.get() + d.vx;
      }
      d.vx *= friction;

      let ny = ty.get() + d.vy;
      const tY = settle(ny, b.top, b.bottom);
      if (ny !== tY) {
        d.vy += (tY - ny) * k;
        d.vy *= damp;
        ny = ty.get() + d.vy;
      }
      d.vy *= friction;

      tx.set(nx);
      ty.set(ny);

      const settledX = Math.abs(nx - settle(nx, b.left, b.right)) < 0.4;
      const settledY = Math.abs(ny - settle(ny, b.top, b.bottom)) < 0.4;
      if (Math.abs(d.vx) < 0.06 && Math.abs(d.vy) < 0.06 && settledX && settledY) {
        tx.set(settle(nx, b.left, b.right));
        ty.set(settle(ny, b.top, b.bottom));
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [tx, ty, scale, boundsFor]);

  /** Smoothly animate the camera to a target translate + scale. */
  const glideTo = useCallback(
    (nx: number, ny: number, ns: number) => {
      stop();
      const opts = { type: "spring" as const, stiffness: 200, damping: 30 };
      animate(scale, ns, opts);
      animate(tx, nx, opts);
      animate(ty, ny, opts);
    },
    [scale, tx, ty],
  );

  /** Double-click a photo → frame it; double-click empty space → fit everything. */
  const zoomToCard = useCallback(
    (photo: Photo) => {
      const rect = viewport.current?.getBoundingClientRect();
      if (!rect) return;
      const { width, height } = cardSize(photo);
      const target = clamp(
        Math.min((rect.width * 0.72) / width, (rect.height * 0.72) / height),
        MIN_SCALE,
        MAX_SCALE,
      );
      const cx = photo.x * SPREAD_X;
      const cy = photo.y * SPREAD_Y;
      glideTo(rect.width / 2 - cx * target, rect.height / 2 - cy * target, target);
    },
    [glideTo],
  );

  const midpoint = () => {
    const pts = [...pointers.current.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };
  const spread = () => {
    const pts = [...pointers.current.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    stop();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // begin pinch: anchor on the world point under the current midpoint
      const rect = viewport.current!.getBoundingClientRect();
      const m = midpoint();
      const s = scale.get();
      pinch.current = {
        dist: spread(),
        wx: (m.x - rect.left - tx.get()) / s,
        wy: (m.y - rect.top - ty.get()) / s,
      };
      drag.current.active = false;
    } else {
      drag.current = {
        active: true, moved: false,
        lx: e.clientX, ly: e.clientY,
        rx: tx.get(), ry: ty.get(),
        vx: 0, vy: 0, t: performance.now(),
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // pinch zoom + two-finger pan
    if (pointers.current.size >= 2 && pinch.current) {
      const rect = viewport.current!.getBoundingClientRect();
      const m = midpoint();
      const ns = clamp((scale.get() * spread()) / pinch.current.dist, MIN_SCALE, MAX_SCALE);
      pinch.current.dist = spread();
      const mx = m.x - rect.left;
      const my = m.y - rect.top;
      const b = boundsFor(ns);
      scale.set(ns);
      tx.set(settle(mx - pinch.current.wx * ns, b.left, b.right));
      ty.set(settle(my - pinch.current.wy * ns, b.top, b.bottom));
      return;
    }

    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.lx;
    const dy = e.clientY - d.ly;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.t);
    d.vx = (dx / dt) * 16;
    d.vy = (dy / dt) * 16;
    d.t = now;
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.rx += dx;
    d.ry += dy;
    const b = boundsFor(scale.get());
    tx.set(rubber(d.rx, b.left, b.right));
    ty.set(rubber(d.ry, b.top, b.bottom));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      // a finger lifted mid-pinch — resume panning from the survivor
      const [p] = [...pointers.current.values()];
      drag.current = {
        active: true, moved: true,
        lx: p.x, ly: p.y, rx: tx.get(), ry: ty.get(),
        vx: 0, vy: 0, t: performance.now(),
      };
      return;
    }
    if (pointers.current.size === 0) {
      const d = drag.current;
      d.active = false;
      if (d.moved) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 40);
      }
      fling();
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={viewport}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reframe}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #f3f0e80f 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      >
        <motion.div className="absolute left-0 top-0" style={{ x: tx, y: ty, scale, transformOrigin: "0 0" }}>
          {photos.map((photo, i) => {
            const { width, height } = cardSize(photo);
            return (
              <motion.button
                key={photo.id}
                type="button"
                onClick={(e) => {
                  if (!suppressClick.current) open(photo.id, e.currentTarget.getBoundingClientRect());
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  zoomToCard(photo);
                }}
                onPointerEnter={() => {
                  if (!drag.current.active && !pinch.current) setHovered(photo.id);
                }}
                onPointerLeave={() => setHovered((h) => (h === photo.id ? null : h))}
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * i, type: "spring", stiffness: 260, damping: 26 }}
                whileHover={{ y: -8, scale: 1.015, transition: { type: "spring", stiffness: 400, damping: 24 } }}
                className="group absolute block overflow-hidden rounded-[10px] bg-paper-sunk u-grain-card"
                style={{
                  left: photo.x * SPREAD_X,
                  top: photo.y * SPREAD_Y,
                  width,
                  height,
                  marginLeft: -width / 2,
                  marginTop: -height / 2,
                }}
                aria-label={`${photo.title}, ${photo.place}`}
              >
                <BlurImage photo={photo} width={720} layoutId={undefined} draggable={false} />
                <span className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/10" />
                {/* Spotlight — recede when another card is focused */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-[10px] bg-paper transition-opacity duration-300"
                  style={{ opacity: hovered && hovered !== photo.id ? 0.55 : 0 }}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="font-display text-[0.95rem] leading-tight text-ink">
                    {photo.title}
                  </span>
                  <span className="u-mono text-[0.6rem] text-ink/80">{photo.stamp}</span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line-strong bg-paper-raised/80 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            const r = viewport.current!.getBoundingClientRect();
            zoomAt(0.8, r.width / 2, r.height / 2);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink hover:text-paper-raised"
          aria-label="Zoom out"
        >
          <IconMinus width={16} height={16} />
        </button>
        <span className="u-mono w-12 text-center text-xs tabular-nums text-ink-soft">
          {scaleLabel}%
        </span>
        <button
          type="button"
          onClick={() => {
            const r = viewport.current!.getBoundingClientRect();
            zoomAt(1.25, r.width / 2, r.height / 2);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink hover:text-paper-raised"
          aria-label="Zoom in"
        >
          <IconPlus width={16} height={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-line-strong" />
        <button
          type="button"
          onClick={reframe}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-ink-soft transition hover:bg-ink hover:text-paper-raised"
          aria-label="Fit to view"
        >
          <IconReframe width={15} height={15} />
          <span className="text-xs font-medium">Fit</span>
        </button>
      </div>

      <p className="u-mono u-label pointer-events-none absolute bottom-7 right-6 z-10 hidden text-ink-faint lg:block">
        drag to roam · double-click to frame · ⌘/pinch to zoom
      </p>
    </div>
  );
}
