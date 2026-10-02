-- ============================================================================
-- HISAAB TRADING JOURNAL — SUPABASE SCHEMA
--
-- Idempotent. Safe to re-run. This is the source of truth for a fresh project;
-- it matches what is deployed on the Hisaab project (ref yjhaftvzdbgtsrnndkmu).
--
-- Follows the Supabase Postgres best-practices rules that the database linter
-- enforces. The three that an earlier revision of this file violated, and which
-- produced 28 advisor findings, are called out inline:
--
--   * security-privileges       — SECURITY DEFINER needs `set search_path = ''`
--                                 and must not live in an API-exposed schema.
--   * security-rls-performance  — wrap auth.uid() in (select ...) so it is
--                                 evaluated once per query, not once per row.
--   * schema-foreign-key-indexes — Postgres does not index FK columns for you.
-- ============================================================================

-- A schema that is NOT exposed through the REST API. Helper and trigger
-- functions belong here: anything in `public` is reachable at
-- /rest/v1/rpc/<name> by the anon role.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ============================================================ 1. TABLES

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null,
    name text,
    email text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.strategies (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    description text,
    tags text[] default '{}',
    created_at timestamptz default now()
);

create table if not exists public.trades (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    symbol text not null,
    trade_date date not null,
    trade_type text check (trade_type in ('long', 'short')) not null,
    quantity integer not null,
    entry_price numeric not null,
    exit_price numeric not null,
    entry_time text,
    exit_time text,
    total_amount numeric not null,
    pnl numeric not null,
    pnl_percent numeric not null,
    stop_loss numeric,
    target numeric,
    strategy text not null,
    outcome text check (outcome in ('success', 'failure')) not null,
    entry_confidence smallint default 3,
    satisfaction smallint default 3,
    emotional_state text,
    notes text,
    lessons_learned text,
    source text default 'manual',
    broker_order_id text,
    brokerage numeric default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.trade_mistakes (
    id uuid primary key default gen_random_uuid(),
    trade_id uuid not null references public.trades(id) on delete cascade,
    mistake text not null
);

create table if not exists public.trade_images (
    id uuid primary key default gen_random_uuid(),
    trade_id uuid not null references public.trades(id) on delete cascade,
    image_url text not null
);

create table if not exists public.broker_connections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    broker text not null,
    client_id text not null,
    access_token text not null, -- Encrypted AES-256-GCM
    is_active boolean default true,
    last_synced timestamptz,
    created_at timestamptz default now(),
    unique(user_id, broker)
);

create table if not exists public.ai_insights (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    payload jsonb not null default '{}'::jsonb,
    metrics jsonb not null default '{}'::jsonb,
    model text,
    trade_count integer not null default 0,
    data_from date,
    data_to date,
    trades_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id)
);

-- ============================================================ 2. INDEXES

-- Every foreign key gets a covering index. Without one, both JOINs and
-- ON DELETE CASCADE degrade to sequential scans, and a cascade takes a lock
-- while it scans. (trades.user_id and ai_insights.user_id are already covered
-- by the composite index and the UNIQUE constraint below.)
create index if not exists idx_strategies_user_id on public.strategies (user_id);
create index if not exists idx_trade_mistakes_trade_id on public.trade_mistakes (trade_id);
create index if not exists idx_trade_images_trade_id on public.trade_images (trade_id);

-- Dedupe broker imports per user. Partial, so manual trades (null order id)
-- are unconstrained.
create unique index if not exists idx_trades_user_broker_order
    on public.trades (user_id, broker_order_id)
    where broker_order_id is not null;

-- Serves the trade history and AI-insights queries, and covers trades.user_id.
create index if not exists idx_trades_user_date
    on public.trades (user_id, trade_date desc);

create index if not exists idx_ai_insights_user_updated
    on public.ai_insights (user_id, updated_at desc);

-- ============================================================ 3. FUNCTIONS

-- Mirrors a new auth user into public.profiles.
--
-- `set search_path = ''` is mandatory on a SECURITY DEFINER function: without
-- it, a caller-controlled search_path can redirect an unqualified reference to
-- an attacker's table, which then gets written with the owner's privileges.
-- Every reference below is therefore schema-qualified.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, username, name, email, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        coalesce(
            new.raw_user_meta_data->>'name',
            new.raw_user_meta_data->>'full_name',
            split_part(new.email, '@', 1)
        ),
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do update set
        email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name);
    return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function private.handle_new_user();

-- Older revisions created this in `public`, where the anon role could call it
-- over REST. Remove it if present.
drop function if exists public.handle_new_user();

-- Keeps updated_at honest without every write path remembering to set it.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function private.set_updated_at();

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at before update on public.trades
    for each row execute function private.set_updated_at();

drop trigger if exists ai_insights_set_updated_at on public.ai_insights;
create trigger ai_insights_set_updated_at before update on public.ai_insights
    for each row execute function private.set_updated_at();

-- ============================================================ 4. RLS

alter table public.profiles enable row level security;
alter table public.strategies enable row level security;
alter table public.trades enable row level security;
alter table public.trade_mistakes enable row level security;
alter table public.trade_images enable row level security;
alter table public.broker_connections enable row level security;
alter table public.ai_insights enable row level security;

-- Two rules applied to every policy below:
--
--   1. `(select auth.uid())` — not bare `auth.uid()`. Wrapped, Postgres hoists
--      it into an InitPlan and evaluates it once; bare, it runs per row. The
--      linter reports the bare form as `auth_rls_initplan`.
--   2. `to authenticated` — a policy with no role list applies to `public`,
--      which includes anon. Scoping it means the anon role is rejected before
--      the predicate is even evaluated.

-- profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles
    for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles
    for update to authenticated using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

-- strategies
drop policy if exists "Users can view own strategies" on public.strategies;
drop policy if exists "Users can insert own strategies" on public.strategies;
drop policy if exists "Users can update own strategies" on public.strategies;
drop policy if exists "Users can delete own strategies" on public.strategies;

create policy "Users can view own strategies" on public.strategies
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own strategies" on public.strategies
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own strategies" on public.strategies
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "Users can delete own strategies" on public.strategies
    for delete to authenticated using ((select auth.uid()) = user_id);

-- trades
drop policy if exists "Users can view own trades" on public.trades;
drop policy if exists "Users can insert own trades" on public.trades;
drop policy if exists "Users can update own trades" on public.trades;
drop policy if exists "Users can delete own trades" on public.trades;

create policy "Users can view own trades" on public.trades
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own trades" on public.trades
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own trades" on public.trades
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "Users can delete own trades" on public.trades
    for delete to authenticated using ((select auth.uid()) = user_id);

-- trade_mistakes — ownership is inherited through the parent trade. The
-- EXISTS lookup is why trade_mistakes.trade_id must be indexed.
drop policy if exists "Users can view own trade mistakes" on public.trade_mistakes;
drop policy if exists "Users can insert own trade mistakes" on public.trade_mistakes;
drop policy if exists "Users can delete own trade mistakes" on public.trade_mistakes;

create policy "Users can view own trade mistakes" on public.trade_mistakes
    for select to authenticated using (
        exists (
            select 1 from public.trades
            where trades.id = trade_mistakes.trade_id
              and trades.user_id = (select auth.uid())
        )
    );
create policy "Users can insert own trade mistakes" on public.trade_mistakes
    for insert to authenticated with check (
        exists (
            select 1 from public.trades
            where trades.id = trade_mistakes.trade_id
              and trades.user_id = (select auth.uid())
        )
    );
create policy "Users can delete own trade mistakes" on public.trade_mistakes
    for delete to authenticated using (
        exists (
            select 1 from public.trades
            where trades.id = trade_mistakes.trade_id
              and trades.user_id = (select auth.uid())
        )
    );

-- trade_images
drop policy if exists "Users can view own trade images" on public.trade_images;
drop policy if exists "Users can insert own trade images" on public.trade_images;
drop policy if exists "Users can delete own trade images" on public.trade_images;

create policy "Users can view own trade images" on public.trade_images
    for select to authenticated using (
        exists (
            select 1 from public.trades
            where trades.id = trade_images.trade_id
              and trades.user_id = (select auth.uid())
        )
    );
create policy "Users can insert own trade images" on public.trade_images
    for insert to authenticated with check (
        exists (
            select 1 from public.trades
            where trades.id = trade_images.trade_id
              and trades.user_id = (select auth.uid())
        )
    );
create policy "Users can delete own trade images" on public.trade_images
    for delete to authenticated using (
        exists (
            select 1 from public.trades
            where trades.id = trade_images.trade_id
              and trades.user_id = (select auth.uid())
        )
    );

-- broker_connections — holds AES-256-GCM encrypted access tokens, so the
-- role scoping matters more here than anywhere else.
drop policy if exists "Users can view own broker connections" on public.broker_connections;
drop policy if exists "Users can insert own broker connections" on public.broker_connections;
drop policy if exists "Users can update own broker connections" on public.broker_connections;
drop policy if exists "Users can delete own broker connections" on public.broker_connections;

create policy "Users can view own broker connections" on public.broker_connections
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own broker connections" on public.broker_connections
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own broker connections" on public.broker_connections
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "Users can delete own broker connections" on public.broker_connections
    for delete to authenticated using ((select auth.uid()) = user_id);

-- ai_insights
drop policy if exists "Users can view own ai insights" on public.ai_insights;
drop policy if exists "Users can insert own ai insights" on public.ai_insights;
drop policy if exists "Users can update own ai insights" on public.ai_insights;
drop policy if exists "Users can delete own ai insights" on public.ai_insights;

create policy "Users can view own ai insights" on public.ai_insights
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own ai insights" on public.ai_insights
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own ai insights" on public.ai_insights
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "Users can delete own ai insights" on public.ai_insights
    for delete to authenticated using ((select auth.uid()) = user_id);

-- ============================================================ 4b. STORAGE

-- Trade screenshots. The bucket is PRIVATE: an earlier setup created it
-- public, which made every screenshot readable by anyone holding its URL.
-- New uploads go to `<user_id>/<uuid>.<ext>`; the app serves them through
-- short-lived signed URLs (/api/trades/image). Size and type limits are
-- enforced here as well as in the browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trades', 'trades', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own trade screenshots" on storage.objects;
drop policy if exists "Users can view own trade screenshots" on storage.objects;
drop policy if exists "Users can delete own trade screenshots" on storage.objects;

create policy "Users can upload own trade screenshots" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'trades'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Own folder, plus legacy root-level files that one of the user's trades
-- still references by its old public URL.
create policy "Users can view own trade screenshots" on storage.objects
    for select to authenticated using (
        bucket_id = 'trades'
        and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or exists (
                select 1
                from public.trade_images ti
                join public.trades t on t.id = ti.trade_id
                where t.user_id = (select auth.uid())
                  and right(ti.image_url, length(objects.name) + 1) = '/' || objects.name
            )
        )
    );

create policy "Users can delete own trade screenshots" on storage.objects
    for delete to authenticated using (
        bucket_id = 'trades'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- ============================================================ 5. BACKFILL

-- The trigger only fires on INSERT, so any auth user created before it existed
-- has no profile row — and because trades.user_id references profiles(id),
-- that account cannot write anything. Same COALESCE logic as the trigger.
insert into public.profiles (id, username, name, email, avatar_url)
select
    u.id,
    coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    coalesce(
        u.raw_user_meta_data->>'name',
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1)
    ),
    u.email,
    u.raw_user_meta_data->>'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ============================================================ 6. MANUAL STEP
--
-- Not expressible in SQL — enable in the dashboard:
--   Authentication → Policies → "Leaked password protection"
-- Checks new passwords against HaveIBeenPwned. The security advisor reports
-- `auth_leaked_password_protection` until it is on.
