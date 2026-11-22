-- ==============================================================================
-- CHUKO MINING - DEPOSITS TABLE SCHEMA
-- ==============================================================================
-- Run this in Supabase SQL Editor AFTER the main schema.sql
-- ==============================================================================

-- 1. Create the deposits table
create table if not exists public.deposits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  plan_name text not null,
  plan_price_usd numeric not null,
  tier_index integer not null default 0,
  coin_symbol text not null,
  coin_network text not null,
  crypto_amount text not null,
  wallet_address text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast lookups
create index if not exists idx_deposits_user_id on public.deposits(user_id);
create index if not exists idx_deposits_status on public.deposits(status);
create index if not exists idx_deposits_created_at on public.deposits(created_at desc);

-- 3. Enable RLS
alter table public.deposits enable row level security;

-- 4. RLS Policies

-- Users can view their own deposits
drop policy if exists "Users can view own deposits" on public.deposits;
create policy "Users can view own deposits"
  on public.deposits
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own deposits
drop policy if exists "Users can create deposits" on public.deposits;
create policy "Users can create deposits"
  on public.deposits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Service role has full access (for admin API routes)
drop policy if exists "Service role full access on deposits" on public.deposits;
create policy "Service role full access on deposits"
  on public.deposits
  for all
  to service_role
  using (true)
  with check (true);

-- 5. Create the shared updated_at helper (safe to re-run)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-update updated_at timestamp
drop trigger if exists on_deposit_updated on public.deposits;
create trigger on_deposit_updated
  before update on public.deposits
  for each row execute procedure public.handle_updated_at();

-- 6. Also add service_role SELECT access to miners for admin dashboard
drop policy if exists "Service role can read all miners" on public.miners;
create policy "Service role can read all miners"
  on public.miners
  for select
  to service_role
  using (true);

-- 7. Grant PostgreSQL table privileges to PostgREST roles (Resolves "permission denied for table deposits")
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.deposits to anon, authenticated, service_role;
grant all on table public.miners to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

comment on table public.deposits is 'Payment deposits submitted by miners awaiting admin confirmation';
comment on column public.deposits.status is 'pending = waiting for admin, confirmed = approved, rejected = declined';

