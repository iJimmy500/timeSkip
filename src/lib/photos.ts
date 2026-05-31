/**
 * The Time Skip collection.
 *
 * Photos are grouped into albums. Every album uses a procedurally-generated
 * spatial LAYOUT, so the stack, grid and spatial canvas stay balanced no matter
 * how many photos are in the album.  Images come from Cloudinary if a publicId
 * is present, otherwise from Lorem Picsum as a placeholder.
 */

import { cloudinaryUrl } from "./cloudinary";

export type Orientation = "portrait" | "landscape" | "square";

export interface Photo {
  id: string;
  /** Picsum seed string — fallback placeholder when no Cloudinary asset exists. */
  seed: string;
  /** Cloudinary public id. When present, images are served from Cloudinary. */
  publicId?: string;
  /** Base64 blur placeholder (from Supabase) — avoids a network request. */
  lqip?: string;
  title: string;
  place: string;
  /** Moment label, e.g. "1991 · 06:40". */
  stamp: string;
  orientation: Orientation;
  x: number;
  y: number;
  scale: number;
}

export interface Album {
  id: string;
  title: string;
  blurb: string;
  photos: Photo[];
}

const RATIO: Record<Orientation, [number, number]> = {
  portrait: [1000, 1300],
  landscape: [1400, 1000],
  square: [1100, 1100],
};

export function srcFor(photo: Photo, width: number): string {
  // Cloudinary when the asset exists; otherwise the Picsum placeholder. CSS
  // object-cover handles the framing, so Cloudinary only needs a width.
  if (photo.publicId) return cloudinaryUrl(photo.publicId, width);
  const [w, h] = RATIO[photo.orientation];
  const height = Math.round((width * h) / w);
  return `https://picsum.photos/seed/${encodeURIComponent(photo.seed)}/${width}/${height}`;
}

export function dimensions(orientation: Orientation): [number, number] {
  return RATIO[orientation];
}

/** Deterministic orientation from pixel dimensions. */
function orientationOf(w: number, h: number): Orientation {
  if (w > h * 1.1) return "landscape";
  if (h > w * 1.1) return "portrait";
  return "square";
}

/**
 * Generate spatial layout positions for N photos.
 *
 * Distributes photos in a loose grid pattern with slight randomised jitter
 * so the spatial view looks organic. Uses a seeded pseudo-random to keep
 * positions stable across renders.
 */
function generateLayout(n: number): Array<{ x: number; y: number; scale: number }> {
  if (n === 0) return [];

  // Seeded PRNG (mulberry32) for deterministic layouts.
  let seed = 0x9e3779b9;
  function rand() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Determine grid dimensions — aim for roughly 4 columns.
  const cols = Math.min(n, Math.max(2, Math.ceil(Math.sqrt(n * 1.5))));
  const rows = Math.ceil(n / cols);

  const slots: Array<{ x: number; y: number; scale: number }> = [];

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Normalise to -1..1 range with jitter
    const x = ((col / (cols - 1 || 1)) * 2 - 1) * 0.85 + (rand() - 0.5) * 0.08;
    const y = ((row / (rows - 1 || 1)) * 2 - 1) * 0.85 + (rand() - 0.5) * 0.08;
    const scale = 0.82 + rand() * 0.16;

    slots.push({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      scale: Math.round(scale * 100) / 100,
    });
  }

  return slots;
}

/** The hand-composed 12-slot spatial layout for the original albums. */
type Slot = { orientation: Orientation; x: number; y: number; scale: number };
const LAYOUT: Slot[] = [
  { orientation: "landscape", x: -0.82, y: -0.58, scale: 0.92 },
  { orientation: "square", x: -0.84, y: 0.04, scale: 0.86 },
  { orientation: "portrait", x: -0.8, y: 0.62, scale: 0.84 },
  { orientation: "portrait", x: -0.27, y: -0.6, scale: 0.9 },
  { orientation: "portrait", x: -0.28, y: 0.18, scale: 0.92 },
  { orientation: "landscape", x: -0.27, y: 0.74, scale: 0.88 },
  { orientation: "landscape", x: 0.28, y: -0.62, scale: 0.9 },
  { orientation: "landscape", x: 0.28, y: -0.02, scale: 0.94 },
  { orientation: "square", x: 0.29, y: 0.6, scale: 0.86 },
  { orientation: "landscape", x: 0.82, y: -0.56, scale: 0.88 },
  { orientation: "portrait", x: 0.83, y: 0.12, scale: 0.88 },
  { orientation: "landscape", x: 0.82, y: 0.72, scale: 0.9 },
];

type Entry = { title: string; place: string; stamp: string };

function buildAlbum(id: string, title: string, blurb: string, entries: Entry[]): Album {
  return {
    id,
    title,
    blurb,
    photos: entries.map((e, i) => ({
      id: `${id}-${i}`,
      seed: `${id}-${i}`,
      orientation: LAYOUT[i].orientation,
      x: LAYOUT[i].x,
      y: LAYOUT[i].y,
      scale: LAYOUT[i].scale,
      ...e,
    })),
  };
}

interface CloudinaryEntry {
  publicId: string;
  title: string;
  width: number;
  height: number;
}

/**
 * Build an album from a list of Cloudinary images (any count).
 * Positions are procedurally generated for N items.
 */
function buildCloudinaryAlbum(
  id: string, title: string, blurb: string, entries: CloudinaryEntry[],
): Album {
  const layout = generateLayout(entries.length);
  return {
    id,
    title,
    blurb,
    photos: entries.map((e, i) => ({
      id: `${id}-${i}`,
      seed: `${id}-${i}`,
      publicId: e.publicId,
      title: e.title,
      place: "",
      stamp: "",
      orientation: orientationOf(e.width, e.height),
      x: layout[i].x,
      y: layout[i].y,
      scale: layout[i].scale,
    })),
  };
}

// ─────────────────────────────── Red Dead album ───────────────────────────────
// All images from the "red dead" folder in Cloudinary. Each entry lists the
// public_id and dimensions so the layout can assign the correct orientation.

const RED_DEAD_IMAGES: CloudinaryEntry[] = [
  {
    "publicId": "red dead/pinterest_1_cspehf",
    "title": "Frontier Moment #1",
    "width": 1280,
    "height": 720
  },
  {
    "publicId": "red dead/pinterest_10_xlypq8",
    "title": "Frontier Moment #10",
    "width": 1823,
    "height": 1025
  },
  {
    "publicId": "red dead/pinterest_100_ohnsln",
    "title": "Frontier Moment #100",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_101_hbmogv",
    "title": "Frontier Moment #101",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_102_xcebwn",
    "title": "Frontier Moment #102",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_104_dfbahe",
    "title": "Frontier Moment #104",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_105_tw442e",
    "title": "Frontier Moment #105",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_108_ctqcjx",
    "title": "Frontier Moment #108",
    "width": 1080,
    "height": 1920
  },
  {
    "publicId": "red dead/pinterest_109_lmwews",
    "title": "Frontier Moment #109",
    "width": 3840,
    "height": 2160
  },
  {
    "publicId": "red dead/pinterest_11_boatg5",
    "title": "Frontier Moment #11",
    "width": 1752,
    "height": 1168
  },
  {
    "publicId": "red dead/pinterest_114_qhlepa",
    "title": "Frontier Moment #114",
    "width": 2160,
    "height": 3840
  },
  {
    "publicId": "red dead/pinterest_115_fc0zhs",
    "title": "Frontier Moment #115",
    "width": 2202,
    "height": 1489
  },
  {
    "publicId": "red dead/pinterest_117_gcgzvg",
    "title": "Frontier Moment #117",
    "width": 1080,
    "height": 1920
  },
  {
    "publicId": "red dead/pinterest_118_glhfcz",
    "title": "Frontier Moment #118",
    "width": 907,
    "height": 477
  },
  {
    "publicId": "red dead/pinterest_119_v4eh7f",
    "title": "Frontier Moment #119",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_120_vtscst",
    "title": "Frontier Moment #120",
    "width": 1080,
    "height": 1920
  },
  {
    "publicId": "red dead/pinterest_122_brlasw",
    "title": "Frontier Moment #122",
    "width": 888,
    "height": 499
  },
  {
    "publicId": "red dead/pinterest_123_bix2ed",
    "title": "Frontier Moment #123",
    "width": 2048,
    "height": 974
  },
  {
    "publicId": "red dead/pinterest_125_nzgg1x",
    "title": "Frontier Moment #125",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_13_mgnuvh",
    "title": "Frontier Moment #13",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_14_ak9rl0",
    "title": "Frontier Moment #14",
    "width": 1920,
    "height": 1072
  },
  {
    "publicId": "red dead/pinterest_17_jsfxqv",
    "title": "Frontier Moment #17",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_19_v48aw7",
    "title": "Frontier Moment #19",
    "width": 1400,
    "height": 1400
  },
  {
    "publicId": "red dead/pinterest_2_adeza3",
    "title": "Frontier Moment #2",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_21_mt3v0l",
    "title": "Frontier Moment #21",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_33_kmxeg4",
    "title": "Frontier Moment #33",
    "width": 1405,
    "height": 804
  },
  {
    "publicId": "red dead/pinterest_34_uxgr3q",
    "title": "Frontier Moment #34",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_4_dckcjm",
    "title": "Frontier Moment #4",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_40_wqrihk",
    "title": "Frontier Moment #40",
    "width": 3840,
    "height": 2160
  },
  {
    "publicId": "red dead/pinterest_41_rvp9fb",
    "title": "Frontier Moment #41",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_42_f9aapg",
    "title": "Frontier Moment #42",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_43_sny5sl",
    "title": "Frontier Moment #43",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_44_nder7v",
    "title": "Frontier Moment #44",
    "width": 888,
    "height": 499
  },
  {
    "publicId": "red dead/pinterest_45_zkuzne",
    "title": "Frontier Moment #45",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_47_vup8lj",
    "title": "Frontier Moment #47",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_50_dwodns",
    "title": "Frontier Moment #50",
    "width": 1372,
    "height": 1511
  },
  {
    "publicId": "red dead/pinterest_51_komvto",
    "title": "Frontier Moment #51",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_52_flxxii",
    "title": "Frontier Moment #52",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_54_r9qan9",
    "title": "Frontier Moment #54",
    "width": 3840,
    "height": 2160
  },
  {
    "publicId": "red dead/pinterest_55_njh81e",
    "title": "Frontier Moment #55",
    "width": 1920,
    "height": 1072
  },
  {
    "publicId": "red dead/pinterest_56_xnyk6e",
    "title": "Frontier Moment #56",
    "width": 1920,
    "height": 1072
  },
  {
    "publicId": "red dead/pinterest_57_e88ntj",
    "title": "Frontier Moment #57",
    "width": 1000,
    "height": 562
  },
  {
    "publicId": "red dead/pinterest_58_obrzfn",
    "title": "Frontier Moment #58",
    "width": 1080,
    "height": 2291
  },
  {
    "publicId": "red dead/pinterest_60_evq7tm",
    "title": "Frontier Moment #60",
    "width": 2048,
    "height": 1152
  },
  {
    "publicId": "red dead/pinterest_61_feklcs",
    "title": "Frontier Moment #61",
    "width": 1501,
    "height": 730
  },
  {
    "publicId": "red dead/pinterest_62_jnhrnj",
    "title": "Frontier Moment #62",
    "width": 3840,
    "height": 2160
  },
  {
    "publicId": "red dead/pinterest_63_r473qb",
    "title": "Frontier Moment #63",
    "width": 1280,
    "height": 720
  },
  {
    "publicId": "red dead/pinterest_67_agxv8i",
    "title": "Frontier Moment #67",
    "width": 3840,
    "height": 2160
  },
  {
    "publicId": "red dead/pinterest_70_qs4lti",
    "title": "Frontier Moment #70",
    "width": 1080,
    "height": 1920
  },
  {
    "publicId": "red dead/pinterest_71_l1ax1n",
    "title": "Frontier Moment #71",
    "width": 1600,
    "height": 900
  },
  {
    "publicId": "red dead/pinterest_72_zmpklh",
    "title": "Frontier Moment #72",
    "width": 1044,
    "height": 1856
  },
  {
    "publicId": "red dead/pinterest_73_fkkmkz",
    "title": "Frontier Moment #73",
    "width": 1200,
    "height": 2133
  },
  {
    "publicId": "red dead/pinterest_75_wr4pwy",
    "title": "Frontier Moment #75",
    "width": 1786,
    "height": 1340
  },
  {
    "publicId": "red dead/pinterest_76_bvwsnw",
    "title": "Frontier Moment #76",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_77_fpyb8x",
    "title": "Frontier Moment #77",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_80_h3epn7",
    "title": "Frontier Moment #80",
    "width": 2048,
    "height": 1024
  },
  {
    "publicId": "red dead/pinterest_81_zmzmdx",
    "title": "Frontier Moment #81",
    "width": 2012,
    "height": 1608
  },
  {
    "publicId": "red dead/pinterest_82_n2ejby",
    "title": "Frontier Moment #82",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_83_ao3g14",
    "title": "Frontier Moment #83",
    "width": 888,
    "height": 499
  },
  {
    "publicId": "red dead/pinterest_84_mbpgfr",
    "title": "Frontier Moment #84",
    "width": 2560,
    "height": 1061
  },
  {
    "publicId": "red dead/pinterest_85_l2g0sn",
    "title": "Frontier Moment #85",
    "width": 1600,
    "height": 900
  },
  {
    "publicId": "red dead/pinterest_86_rgj5ps",
    "title": "Frontier Moment #86",
    "width": 1500,
    "height": 830
  },
  {
    "publicId": "red dead/pinterest_87_i22lmb",
    "title": "Frontier Moment #87",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_9_pn3clo",
    "title": "Frontier Moment #9",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_90_n5lcbg",
    "title": "Frontier Moment #90",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_91_wfzhl9",
    "title": "Frontier Moment #91",
    "width": 1853,
    "height": 1080
  },
  {
    "publicId": "red dead/pinterest_93_a0n4rx",
    "title": "Frontier Moment #93",
    "width": 1200,
    "height": 675
  },
  {
    "publicId": "red dead/pinterest_94_wolldt",
    "title": "Frontier Moment #94",
    "width": 1920,
    "height": 1072
  },
  {
    "publicId": "red dead/pinterest_96_oqkpio",
    "title": "Frontier Moment #96",
    "width": 1920,
    "height": 1072
  },
  {
    "publicId": "red dead/pinterest_99_vspqgk",
    "title": "Frontier Moment #99",
    "width": 1920,
    "height": 1080
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_1_pbdfw1",
    "title": "Virtual World Photo #1",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_10_jvilu3",
    "title": "Virtual World Photo #10",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_11_ilxr2w",
    "title": "Virtual World Photo #11",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_12_i0ltv8",
    "title": "Virtual World Photo #12",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_13_thcuhi",
    "title": "Virtual World Photo #13",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_14_fhbecf",
    "title": "Virtual World Photo #14",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_15_zeycha",
    "title": "Virtual World Photo #15",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_16_b1wqkz",
    "title": "Virtual World Photo #16",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_17_r2wkcc",
    "title": "Virtual World Photo #17",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_18_xbudcg",
    "title": "Virtual World Photo #18",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_19_osfpoc",
    "title": "Virtual World Photo #19",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_2_zvh2jv",
    "title": "Virtual World Photo #2",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_20_joybeu",
    "title": "Virtual World Photo #20",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_21_da3irg",
    "title": "Virtual World Photo #21",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_22_sji836",
    "title": "Virtual World Photo #22",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_23_hxnsqw",
    "title": "Virtual World Photo #23",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_25_hf1xcc",
    "title": "Virtual World Photo #25",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_26_uh9tqy",
    "title": "Virtual World Photo #26",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_27_ishcjh",
    "title": "Virtual World Photo #27",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_28_omzdqu",
    "title": "Virtual World Photo #28",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_3_trqjex",
    "title": "Virtual World Photo #3",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_30_e5viu8",
    "title": "Virtual World Photo #30",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_31_lwb7k3",
    "title": "Virtual World Photo #31",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_33_qbynuz",
    "title": "Virtual World Photo #33",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_36_kgc7lx",
    "title": "Virtual World Photo #36",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_39_zzq2ns",
    "title": "Virtual World Photo #39",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_42_rl0wvw",
    "title": "Virtual World Photo #42",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_43_wxlwtr",
    "title": "Virtual World Photo #43",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_45_k0iszx",
    "title": "Virtual World Photo #45",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_46_zohtns",
    "title": "Virtual World Photo #46",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_47_mstr26",
    "title": "Virtual World Photo #47",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_48_ybzdsi",
    "title": "Virtual World Photo #48",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_49_v22kf7",
    "title": "Virtual World Photo #49",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_5_rfksip",
    "title": "Virtual World Photo #5",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_50_jmenh8",
    "title": "Virtual World Photo #50",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_51_gpjbb4",
    "title": "Virtual World Photo #51",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_53_zzfhn0",
    "title": "Virtual World Photo #53",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_54_oezrbt",
    "title": "Virtual World Photo #54",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_56_cwascr",
    "title": "Virtual World Photo #56",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_57_rk0wki",
    "title": "Virtual World Photo #57",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_59_hnzzig",
    "title": "Virtual World Photo #59",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_6_mw50nu",
    "title": "Virtual World Photo #6",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_60_xyqie9",
    "title": "Virtual World Photo #60",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_61_gvwr1r",
    "title": "Virtual World Photo #61",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_64_ivhdez",
    "title": "Virtual World Photo #64",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_66_kgl5fx",
    "title": "Virtual World Photo #66",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_67_lhaqm4",
    "title": "Virtual World Photo #67",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_68_end3l1",
    "title": "Virtual World Photo #68",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_70_nj1q5h",
    "title": "Virtual World Photo #70",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_71_bvtdcg",
    "title": "Virtual World Photo #71",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_72_sbbwlk",
    "title": "Virtual World Photo #72",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_73_xqmxvt",
    "title": "Virtual World Photo #73",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_74_naldei",
    "title": "Virtual World Photo #74",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_75_m0xsbq",
    "title": "Virtual World Photo #75",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_77_ndjzmd",
    "title": "Virtual World Photo #77",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_78_t6u2hm",
    "title": "Virtual World Photo #78",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_79_px72i5",
    "title": "Virtual World Photo #79",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_80_eh2efe",
    "title": "Virtual World Photo #80",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_81_dddodw",
    "title": "Virtual World Photo #81",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_83_y5f8ix",
    "title": "Virtual World Photo #83",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_84_ked5up",
    "title": "Virtual World Photo #84",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_85_w8bnu6",
    "title": "Virtual World Photo #85",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_86_wmvzcb",
    "title": "Virtual World Photo #86",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_87_jijady",
    "title": "Virtual World Photo #87",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_89_lwpdie",
    "title": "Virtual World Photo #89",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_9_qfkd6w",
    "title": "Virtual World Photo #9",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/virtualworldsphotography.photo.blog_90_vtm3nl",
    "title": "Virtual World Photo #90",
    "width": 1024,
    "height": 571
  },
  {
    "publicId": "red dead/www.gamersyde.com_3_mnbjhr",
    "title": "Gamersyde Shot #3",
    "width": 960,
    "height": 529
  }
];

// ──────────────────────────────────────────────────────────────────────────────

export const ALBUMS: Album[] = [
  buildCloudinaryAlbum(
    "reddead",
    "Red Dead",
    "The frontier, frozen in time.",
    RED_DEAD_IMAGES,
  ),
  buildAlbum("nocturne", "Nightfall", "Hours after the light goes, before it returns.", [
    { title: "Last train, kept waiting", place: "Osaka", stamp: "2009 · 23:48" },
    { title: "Neon, and then rain", place: "Hong Kong", stamp: "2014 · 22:10" },
    { title: "A window left on", place: "Berlin", stamp: "1996 · 01:27" },
    { title: "The pier at midnight", place: "Brighton", stamp: "1989 · 00:14" },
    { title: "Streetlight confession", place: "Marseille", stamp: "2002 · 02:39" },
    { title: "Long exposure, longer night", place: "Reykjavík", stamp: "2018 · 03:05" },
    { title: "Closing time", place: "New Orleans", stamp: "1993 · 02:51" },
    { title: "Headlights, passing", place: "Los Angeles", stamp: "2007 · 23:02" },
    { title: "The all-night diner", place: "Chicago", stamp: "1985 · 04:18" },
    { title: "Moon over the lot", place: "Phoenix", stamp: "2012 · 21:44" },
    { title: "Quiet on the bridge", place: "Budapest", stamp: "1998 · 00:58" },
    { title: "Before the first bird", place: "Kyoto", stamp: "2020 · 04:41" },
  ]),
  buildAlbum("ridgeline", "Ridgeline", "High places, thin air, and the long view down.", [
    { title: "First light, last camp", place: "Patagonia", stamp: "2010 · 05:51" },
    { title: "Switchbacks", place: "Nepal", stamp: "1997 · 09:12" },
    { title: "The col", place: "Chamonix", stamp: "2004 · 11:36" },
    { title: "Above the cloud line", place: "Aoraki", stamp: "2015 · 07:28" },
    { title: "Scree and silence", place: "Atlas Mts.", stamp: "1990 · 13:04" },
    { title: "Glacier, retreating", place: "Banff", stamp: "2019 · 10:47" },
    { title: "The far summit", place: "Dolomites", stamp: "1983 · 15:22" },
    { title: "Wind at the saddle", place: "Cairngorms", stamp: "2001 · 12:19" },
    { title: "Tarn, perfectly still", place: "Lake District", stamp: "2013 · 08:33" },
    { title: "Down to the valley", place: "Andes", stamp: "1988 · 16:55" },
    { title: "Ridge in fog", place: "Snowdonia", stamp: "2006 · 09:48" },
    { title: "The way we came", place: "Sierra Nevada", stamp: "2022 · 17:11" },
  ]),
  buildAlbum("interiors", "Quiet Rooms", "Spaces, held empty, between the people who use them.", [
    { title: "Light through linen", place: "Copenhagen", stamp: "2017 · 10:02" },
    { title: "The reading chair", place: "Vienna", stamp: "1992 · 15:40" },
    { title: "Stairwell, Sunday", place: "Bologna", stamp: "2003 · 11:18" },
    { title: "Kitchen, after lunch", place: "Provence", stamp: "1986 · 14:55" },
    { title: "The long hallway", place: "Lisbon", stamp: "2009 · 09:27" },
    { title: "Studio, north-facing", place: "Paris", stamp: "1979 · 16:08" },
    { title: "An open door", place: "Marrakech", stamp: "2014 · 12:44" },
    { title: "Where the cat sleeps", place: "Istanbul", stamp: "1995 · 13:31" },
    { title: "Library, closing", place: "Dublin", stamp: "2011 · 17:50" },
    { title: "Bath of morning", place: "Kyoto", stamp: "2000 · 07:19" },
    { title: "The empty table", place: "Oaxaca", stamp: "1984 · 18:22" },
    { title: "Curtains, breathing", place: "Naples", stamp: "2021 · 08:46" },
  ]),
];

export function albumById(id: string | null | undefined): Album {
  return ALBUMS.find((a) => a.id === id) ?? ALBUMS[0];
}
