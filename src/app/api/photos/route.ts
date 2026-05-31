import { NextResponse } from "next/server";
import { ALBUMS, albumById, srcFor } from "@/lib/photos";

/**
 * GET /api/photos?album=<id>
 *
 * The first backend seam. Today it serves the in-memory albums; when you move to
 * a database or object store, this is the only place the frontend needs to start
 * reading from. Keep the shape stable and the UI won't have to change.
 */
export async function GET(request: Request) {
  const albumParam = new URL(request.url).searchParams.get("album");
  const album = albumParam ? albumById(albumParam) : null;

  const serialise = (a: (typeof ALBUMS)[number]) => ({
    id: a.id,
    title: a.title,
    blurb: a.blurb,
    photos: a.photos.map((p) => ({
      id: p.id,
      title: p.title,
      place: p.place,
      stamp: p.stamp,
      orientation: p.orientation,
      src: { thumb: srcFor(p, 720), full: srcFor(p, 1600) },
    })),
  });

  const body = album
    ? { album: serialise(album) }
    : { albums: ALBUMS.map(serialise) };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
