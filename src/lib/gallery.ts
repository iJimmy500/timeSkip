import { ALBUMS, type Album, type Photo } from "./photos";
import { supabase, type AlbumRow, type PhotoRow } from "./supabase";

function mapPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    seed: r.id,
    publicId: r.public_id,
    lqip: r.lqip ?? undefined,
    title: r.title,
    place: r.place,
    stamp: r.stamp,
    orientation: r.orientation,
    x: r.x,
    y: r.y,
    scale: r.scale,
  };
}

/**
 * Load albums from Supabase, grouping photos under their album. Falls back to
 * the bundled static albums whenever Supabase is unconfigured, errors, or empty
 * — so the app always renders something and never hard-depends on the network.
 */
export async function fetchAlbums(): Promise<Album[]> {
  if (!supabase) return ALBUMS;
  try {
    const [albumsRes, photosRes] = await Promise.all([
      supabase.from("albums").select("*").order("sort"),
      supabase.from("photos").select("*").order("sort"),
    ]);

    const albums = albumsRes.data as AlbumRow[] | null;
    const photos = photosRes.data as PhotoRow[] | null;
    if (albumsRes.error || photosRes.error || !albums?.length || !photos?.length) {
      return ALBUMS;
    }

    return albums.map((a) => ({
      id: a.id,
      title: a.title,
      blurb: a.blurb,
      photos: photos.filter((p) => p.album === a.id).map(mapPhoto),
    }));
  } catch {
    return ALBUMS;
  }
}
