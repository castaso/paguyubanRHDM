-- Alder House — Supabase schema.
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- This file is where access control is ACTUALLY enforced. The client-side
-- allow-list in assets/auth.js only decides what the UI shows; these policies
-- decide what the database will ever hand over.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The allow-list (RBAC)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.allowed_emails (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Change these two addresses to whatever the family actually uses.
insert into public.allowed_emails (email, note) values
  ('paguyubanrhdm@gmail.com', 'site organiser'),
  ('castasoft@gmail.com',     'maintainer')
on conflict (email) do nothing;

-- Helper: is the *current* JWT's email on the list?
-- SECURITY DEFINER so it can read the table even when the caller cannot.
create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    where ae.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed() from public;
grant execute on function public.is_allowed() to anon, authenticated;

-- Only allowed accounts may read the list itself.
drop policy if exists "allowed accounts read the list" on public.allowed_emails;
create policy "allowed accounts read the list"
  on public.allowed_emails
  for select
  to authenticated
  using (public.is_allowed());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Marketplace listings
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 70),
  category    text not null check (category in
                ('handmade','secondhand','services','produce','rentals','digital')),
  price       numeric(10,2) not null default 0 check (price >= 0),
  price_unit  text not null default '',
  condition   text not null default '',
  description text not null check (char_length(description) between 20 and 600),
  place       text not null default '',
  tags        text[] not null default '{}',
  seller_email text not null default lower(coalesce(auth.jwt() ->> 'email','')),
  status      text not null default 'open' check (status in ('open','reserved','sold')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_created_idx  on public.listings (created_at desc);

alter table public.listings enable row level security;

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- The market is public to read: anyone (including signed-out visitors) may
-- browse listings. Writing is where the allow-list bites.
drop policy if exists "anyone may browse listings" on public.listings;
create policy "anyone may browse listings"
  on public.listings for select
  to anon, authenticated
  using (true);

drop policy if exists "allowed accounts may post listings" on public.listings;
create policy "allowed accounts may post listings"
  on public.listings for insert
  to authenticated
  with check (public.is_allowed() and seller_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "owners may edit their listings" on public.listings;
create policy "owners may edit their listings"
  on public.listings for update
  to authenticated
  using (public.is_allowed() and seller_email = lower(auth.jwt() ->> 'email'))
  with check (public.is_allowed() and seller_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "owners may remove their listings" on public.listings;
create policy "owners may remove their listings"
  on public.listings for delete
  to authenticated
  using (public.is_allowed() and seller_email = lower(auth.jwt() ->> 'email'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Sanity check — run after the above.
-- ─────────────────────────────────────────────────────────────────────────────
-- select email, note from public.allowed_emails order by email;
-- select tablename, policyname from pg_policies where schemaname = 'public' order by tablename, policyname;
