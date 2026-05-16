-- =====================================================================
-- Schema for the JS Chile Meetup Card "muro" (event wall).
-- Run this in the Supabase SQL editor of a fresh project, or apply via
-- the Supabase CLI as a migration.
--
-- It creates:
--   1. The `wall_images` table.
--   2. The `wall-images` public storage bucket.
--   3. Row Level Security policies that mirror how the app uses it:
--      - The server (with the publishable / anon / service-role key)
--        inserts and reads via the REST API.
--      - The browser only needs SELECT to subscribe to realtime INSERTs.
--   4. The realtime publication for INSERTs on `wall_images`.
-- =====================================================================

-- 1. Table -------------------------------------------------------------
create table if not exists public.wall_images (
  id           uuid primary key default gen_random_uuid(),
  image_url    text not null,
  storage_path text not null,
  image_hash   text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists wall_images_updated_at_idx
  on public.wall_images (updated_at desc);

-- Keep `updated_at` fresh on every UPDATE.
create or replace function public.set_wall_images_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wall_images_updated_at on public.wall_images;
create trigger trg_wall_images_updated_at
  before update on public.wall_images
  for each row
  execute function public.set_wall_images_updated_at();

-- 2. Storage bucket ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wall-images', 'wall-images', true)
on conflict (id) do update set public = excluded.public;

-- 3. Row Level Security ------------------------------------------------
alter table public.wall_images enable row level security;

-- Public read: the wall page lists every card. Adjust if you want it
-- gated behind auth.
drop policy if exists "wall_images: public read" on public.wall_images;
create policy "wall_images: public read"
  on public.wall_images
  for select
  using (true);

-- Anon insert: allows the API route to insert with the publishable /
-- anon key. If you only ever insert via the service-role key, you can
-- DROP this policy for stricter access.
drop policy if exists "wall_images: anon insert" on public.wall_images;
create policy "wall_images: anon insert"
  on public.wall_images
  for insert
  with check (true);

-- Storage policies for the wall-images bucket.
drop policy if exists "wall-images: public read" on storage.objects;
create policy "wall-images: public read"
  on storage.objects
  for select
  using (bucket_id = 'wall-images');

drop policy if exists "wall-images: anon upload" on storage.objects;
create policy "wall-images: anon upload"
  on storage.objects
  for insert
  with check (bucket_id = 'wall-images');

-- 4. Realtime ---------------------------------------------------------
-- Enable realtime broadcasting for INSERTs so /muro updates live.
alter publication supabase_realtime add table public.wall_images;
