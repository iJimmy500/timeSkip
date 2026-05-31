-- Timeskip metadata schema.
-- Run this in the Supabase SQL editor once. Images live in Cloudinary; only
-- lightweight metadata (and a base64 blur placeholder) live here.

create table if not exists public.albums (
  id    text primary key,
  title text not null,
  blurb text not null default '',
  sort  int  not null default 0
);

create table if not exists public.photos (
  id          text primary key,
  album       text not null references public.albums (id) on delete cascade,
  public_id   text not null,                       -- Cloudinary public id
  title       text not null default '',
  place       text not null default '',
  stamp       text not null default '',
  orientation text not null default 'landscape'
              check (orientation in ('portrait','landscape','square')),
  x     real not null default 0,
  y     real not null default 0,
  scale real not null default 1,
  lqip  text,                                       -- base64 data URL (tiny)
  sort  int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_album_idx on public.photos (album);

-- Read-only to the world (delivery URLs are public anyway); writes go through
-- the service_role key in scripts/upload.mjs, which bypasses RLS.
alter table public.albums enable row level security;
alter table public.photos enable row level security;

drop policy if exists "albums read" on public.albums;
create policy "albums read" on public.albums for select using (true);

drop policy if exists "photos read" on public.photos;
create policy "photos read" on public.photos for select using (true);
