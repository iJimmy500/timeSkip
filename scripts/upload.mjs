#!/usr/bin/env node
/**
 * Upload local images to Cloudinary and produce their Supabase metadata.
 *
 * Two modes for the metadata, chosen automatically:
 *  - If SUPABASE_SERVICE_ROLE_KEY is set → writes rows straight into Supabase.
 *  - Otherwise → writes `supabase/seed.sql` for you to paste into the Supabase
 *    SQL editor (which runs privileged in the dashboard). No powerful key needed.
 *
 * Only Cloudinary creds are strictly required (for the upload itself); they live
 * server-side in .env.local and never reach the browser.
 *
 * Layout on disk:  photos/<albumId>/01.jpg 02.jpg ...
 * Run:  npm run upload
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: SB_URL,
  SUPABASE_SERVICE_ROLE_KEY: SB_SERVICE,
} = process.env;

const set = (v) => v && !String(v).startsWith("__");

// Cloudinary creds are the only hard requirement.
for (const [k, v] of Object.entries({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET })) {
  if (!set(v)) {
    console.error(`✗ Missing/placeholder env: ${k} (set it in .env.local)`);
    process.exit(1);
  }
}

cloudinary.config({ cloud_name: CLOUD, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });

const directWrite = set(SB_SERVICE) && set(SB_URL);
const supabase = directWrite ? createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } }) : null;

// Shared spatial composition — keep in sync with src/lib/photos.ts LAYOUT.
const LAYOUT = [
  { x: -0.82, y: -0.58, scale: 0.92 }, { x: -0.84, y: 0.04, scale: 0.86 }, { x: -0.8, y: 0.62, scale: 0.84 },
  { x: -0.27, y: -0.6, scale: 0.9 }, { x: -0.28, y: 0.18, scale: 0.92 }, { x: -0.27, y: 0.74, scale: 0.88 },
  { x: 0.28, y: -0.62, scale: 0.9 }, { x: 0.28, y: -0.02, scale: 0.94 }, { x: 0.29, y: 0.6, scale: 0.86 },
  { x: 0.82, y: -0.56, scale: 0.88 }, { x: 0.83, y: 0.12, scale: 0.88 }, { x: 0.82, y: 0.72, scale: 0.9 },
];

const ALBUM_TITLES = {
  coastal: ["Coastal Drift", "Water, weather, and the edges of land."],
  nightfall: ["Nightfall", "Hours after the light goes, before it returns."],
  ridgeline: ["Ridgeline", "High places, thin air, and the long view down."],
  interiors: ["Quiet Rooms", "Spaces, held empty, between the people who use them."],
};

const orientationOf = (w, h) => (w > h * 1.1 ? "landscape" : h > w * 1.1 ? "portrait" : "square");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`; // SQL single-quote escape

/** Fetch a tiny blurred derivative and inline it as a base64 data URL. */
async function makeLqip(publicId) {
  const url = cloudinary.url(publicId, {
    transformation: [{ width: 24, crop: "limit", effect: "blur:1200", quality: "auto:low", fetch_format: "jpg" }],
  });
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function run() {
  const root = path.resolve("photos");
  let albumDirs;
  try {
    albumDirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory());
  } catch {
    console.error("✗ No ./photos directory. Create photos/<album>/*.jpg first.");
    process.exit(1);
  }

  const albumRows = [];
  const photoRows = [];

  for (const dir of albumDirs) {
    const albumId = dir.name;
    const [title, blurb] = ALBUM_TITLES[albumId] ?? [albumId, ""];
    albumRows.push({ id: albumId, title, blurb, sort: 0 });

    const files = (await readdir(path.join(root, albumId)))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort();

    console.log(`\n# ${albumId} — ${files.length} files`);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const slot = LAYOUT[i % LAYOUT.length];
      const publicId = `timeskip/${albumId}/${String(i).padStart(2, "0")}`;
      const data = await readFile(path.join(root, albumId, file));

      const up = await cloudinary.uploader.upload(`data:image/*;base64,${data.toString("base64")}`, {
        public_id: publicId,
        overwrite: true,
        unique_filename: false,
        resource_type: "image",
      });

      photoRows.push({
        id: `${albumId}-${i}`,
        album: albumId,
        public_id: publicId,
        title: file.replace(/\.[^.]+$/, ""),
        place: "",
        stamp: "",
        orientation: orientationOf(up.width, up.height),
        x: slot.x,
        y: slot.y,
        scale: slot.scale,
        lqip: await makeLqip(publicId),
        sort: i,
      });
      console.log(`   ✓ ${file} → ${publicId}`);
    }
  }

  if (directWrite) {
    await supabase.from("albums").upsert(albumRows);
    const { error } = await supabase.from("photos").upsert(photoRows);
    console.log(error ? `\n✗ Supabase write failed: ${error.message}` : `\n✓ Wrote ${photoRows.length} rows to Supabase.`);
    return;
  }

  // No service_role key → emit SQL to paste into the Supabase SQL editor.
  const lines = ["-- Generated by scripts/upload.mjs — paste into the Supabase SQL editor.", ""];
  for (const a of albumRows) {
    lines.push(
      `insert into public.albums (id,title,blurb,sort) values (${q(a.id)},${q(a.title)},${q(a.blurb)},${a.sort})` +
        ` on conflict (id) do update set title=excluded.title, blurb=excluded.blurb, sort=excluded.sort;`,
    );
  }
  lines.push("");
  for (const p of photoRows) {
    lines.push(
      `insert into public.photos (id,album,public_id,title,place,stamp,orientation,x,y,scale,lqip,sort) values (` +
        `${q(p.id)},${q(p.album)},${q(p.public_id)},${q(p.title)},${q(p.place)},${q(p.stamp)},${q(p.orientation)},` +
        `${p.x},${p.y},${p.scale},${q(p.lqip)},${p.sort})` +
        ` on conflict (id) do update set album=excluded.album, public_id=excluded.public_id, title=excluded.title,` +
        ` place=excluded.place, stamp=excluded.stamp, orientation=excluded.orientation, x=excluded.x, y=excluded.y,` +
        ` scale=excluded.scale, lqip=excluded.lqip, sort=excluded.sort;`,
    );
  }

  await mkdir(path.resolve("supabase"), { recursive: true });
  const out = path.resolve("supabase/seed.sql");
  await writeFile(out, lines.join("\n") + "\n");
  console.log(`\n✓ Cloudinary uploads done. Wrote ${photoRows.length} rows → ${path.relative(process.cwd(), out)}`);
  console.log("  Open it, copy, and run it in the Supabase SQL editor. (No service_role key needed.)");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
