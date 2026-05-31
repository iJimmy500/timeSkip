import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (read-only via the publishable/anon key + RLS).
 * Null when env isn't configured, so the app falls back to local data.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;

export interface PhotoRow {
  id: string;
  album: string;
  public_id: string;
  title: string;
  place: string;
  stamp: string;
  orientation: "portrait" | "landscape" | "square";
  x: number;
  y: number;
  scale: number;
  lqip: string | null;
  sort: number;
}

export interface AlbumRow {
  id: string;
  title: string;
  blurb: string;
  sort: number;
}
