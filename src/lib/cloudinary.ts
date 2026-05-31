/**
 * Cloudinary delivery URLs — built from the public cloud name only (no API
 * key/secret, so the running app never touches credit-sensitive credentials).
 *
 * Credit discipline lives here:
 *  - a small fixed ladder of widths → a bounded number of derived images, each
 *    transformed once by Cloudinary then served from its CDN cache;
 *  - `f_auto,q_auto` → AVIF/WebP at automatic quality (big bandwidth savings);
 *  - `c_limit` → never upscale (no wasted bytes), and no `dpr_auto` (which would
 *    multiply variants and bandwidth).
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** The only widths we ever request. Keep this list short. */
export const WIDTH_LADDER = [400, 800, 1200, 1600] as const;

function snapWidth(width: number): number {
  for (const w of WIDTH_LADDER) if (width <= w) return w;
  return WIDTH_LADDER[WIDTH_LADDER.length - 1];
}

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUD);
}

/** A delivery URL for a Cloudinary public id at (a snapped) width. */
export function cloudinaryUrl(publicId: string, width: number): string {
  const w = snapWidth(width);
  const t = ["f_auto", "q_auto", "c_limit", `w_${w}`].join(",");
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}

/**
 * A tiny, heavily-compressed blurred placeholder. Prefer a base64 LQIP stored in
 * Supabase (zero requests) — this is only the fallback when one isn't available.
 */
export function cloudinaryBlurUrl(publicId: string): string {
  const t = ["f_auto", "q_auto:low", "e_blur:1200", "c_limit", "w_32"].join(",");
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}
