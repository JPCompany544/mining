-- ==============================================================================
-- CHUKO MINING - PRODUCTION SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Run this script in the Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Create the miners table linked to auth.users(id)
create table if not exists public.miners (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  username text,
  mining_status text not null default 'idle' check (mining_status in ('idle', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index on created_at and email for fast lookups
create index if not exists idx_miners_email on public.miners(email);
create index if not exists idx_miners_created_at on public.miners(created_at);

-- 2. Enable Row Level Security (RLS)
alter table public.miners enable row level security;

-- 3. Row Level Security Policies
-- Policy 1: Authenticated miners can read their own profile
drop policy if exists "Miners can view their own profile" on public.miners;
create policy "Miners can view their own profile"
  on public.miners
  for select
  to authenticated
  using (auth.uid() = id);

-- Policy 2: Authenticated miners can update their own profile (e.g. username)
drop policy if exists "Miners can update their own profile" on public.miners;
create policy "Miners can update their own profile"
  on public.miners
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy 3: Service role / Server has full access for backend triggers and maintenance
drop policy if exists "Service role full access on miners" on public.miners;
create policy "Service role full access on miners"
  on public.miners
  for all
  to service_role
  using (true)
  with check (true);

-- 4. Automatic updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_miner_updated on public.miners;
create trigger on_miner_updated
  before update on public.miners
  for each row execute procedure public.handle_updated_at();

-- 5. Trigger Function to automatically create miner profile when a user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  raw_username text;
begin
  -- Extract username from metadata if provided, otherwise fallback to email prefix
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  insert into public.miners (id, email, username, mining_status, created_at, updated_at)
  values (
    new.id,
    new.email,
    raw_username,
    'idle',
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

-- 6. Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Comment on table and columns for documentation
comment on table public.miners is 'Registered Chuko Mining node operators and miner profiles';
comment on column public.miners.id is 'Matches auth.users(id) UUID';
comment on column public.miners.mining_status is 'Current mining state: idle, active, paused, or completed';

