"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ALBUMS, type Album, type Photo } from "@/lib/photos";
import { fetchAlbums } from "@/lib/gallery";

export type ViewMode = "stack" | "spatial" | "grid";

export interface AlbumSummary {
  id: string;
  title: string;
  blurb: string;
  count: number;
}

interface TimeSkipState {
  photos: Photo[];
  view: ViewMode;
  setView: (v: ViewMode) => void;

  albums: AlbumSummary[];
  albumId: string;
  setAlbum: (id: string) => void;

  openId: string | null;
  /** The on-screen rect of the thumbnail the detail was opened from, so the
   *  popup can grow out of — and shrink back into — that exact location. */
  openRect: { x: number; y: number; width: number; height: number } | null;
  open: (id: string, rect?: DOMRect) => void;
  close: () => void;

  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;

  notify: (message: string) => void;
  toast: { id: number; message: string } | null;
}

const Ctx = createContext<TimeSkipState | null>(null);

const FAV_KEY = "timeskip.favorites.v1";
const isView = (v: string | null): v is ViewMode =>
  v === "stack" || v === "spatial" || v === "grid";

export function TimeSkipProvider({ children }: { children: React.ReactNode }) {
  const [view, setViewState] = useState<ViewMode>("stack");
  const [albumsData, setAlbumsData] = useState<Album[]>(ALBUMS);
  const [albumId, setAlbumId] = useState<string>(ALBUMS[0].id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openRect, setOpenRect] = useState<TimeSkipState["openRect"]>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-time hydration from the URL (shareable state) and from saved favorites.
  // This intentionally seeds React state from external sources on mount, which
  // is exactly what an effect is for — the lint rule below is opted out here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (isView(v)) setViewState(v);

    const album = params.get("album");
    if (album && ALBUMS.some((a) => a.id === album)) setAlbumId(album);

    const photo = params.get("photo");
    if (photo) {
      // Resolve the photo (and its album) across the whole collection.
      const owner = ALBUMS.find((a) => a.photos.some((p) => p.id === photo));
      if (owner) {
        setAlbumId(owner.id);
        setOpenId(photo);
      }
    }

    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reflect view + album + open photo back into the URL without a navigation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    params.set("album", albumId);
    if (openId) params.set("photo", openId);
    else params.delete("photo");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [view, albumId, openId]);

  // Load albums from Supabase (Cloudinary-backed); falls back to static albums.
  useEffect(() => {
    let active = true;
    fetchAlbums().then((data) => {
      if (!active || !data.length) return;
      setAlbumsData(data);
      setAlbumId((cur) => (data.some((a) => a.id === cur) ? cur : data[0].id));
    });
    return () => {
      active = false;
    };
  }, []);

  const setView = useCallback((v: ViewMode) => setViewState(v), []);
  const open = useCallback((id: string, rect?: DOMRect) => {
    setOpenId(id);
    // Only re-anchor when a source rect is given (a fresh open from a thumbnail);
    // prev/next navigation passes none, keeping the original origin for close.
    if (rect) setOpenRect({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
  }, []);
  const close = useCallback(() => setOpenId(null), []);

  const setAlbum = useCallback((id: string) => {
    setOpenId(null); // close any open detail before swapping collections
    setAlbumId(id);
  }, []);

  const photos = useMemo(
    () => (albumsData.find((a) => a.id === albumId) ?? albumsData[0]).photos,
    [albumsData, albumId],
  );
  const albums = useMemo<AlbumSummary[]>(
    () => albumsData.map((a) => ({ id: a.id, title: a.title, blurb: a.blurb, count: a.photos.length })),
    [albumsData],
  );

  const persist = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo<TimeSkipState>(
    () => ({
      photos,
      view,
      setView,
      albums,
      albumId,
      setAlbum,
      openId,
      openRect,
      open,
      close,
      favorites,
      isFavorite,
      toggleFavorite,
      notify,
      toast,
    }),
    [photos, view, setView, albums, albumId, setAlbum, openId, openRect, open, close, favorites, isFavorite, toggleFavorite, notify, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimeSkip() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTimeSkip must be used within TimeSkipProvider");
  return ctx;
}
