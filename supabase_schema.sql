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

-- ============================================================ 4s. STRATEGY BUILDER (algo_*)
--
-- Eve's strategy builder stores users' engine strategies here: declarative
-- `eve.strategy/1` specs (JSON rules, never code), their immutable versions,
-- the backtests run on each version, the gate's audit trail and the kill
-- switches. Phase 15 in Eve_Agentic_Trading.
--
-- Deliberately NOT public.strategies: that table is the journal's tag list
-- (trades.strategy matches it by name). A tag labels past trades; a spec is
-- testable rules. The algo_ prefix keeps the two apart.
--
-- Writes normally come from the Eve engine's gate, which calls PostgREST with
-- the USER's access token, so every policy below still applies -- RLS is the
-- backstop if the gate ever has a bug. Only algo_tool_audit inserts use the
-- service role.
--
-- The status enum has no 'live' value on purpose: no row, bug or injected
-- tool argument can mark a strategy live until a later migration adds the
-- value alongside an approvals table and a legal review of SEBI's retail
-- algo framework.

do $$ begin
    create type public.algo_strategy_status as enum
        ('draft', 'validated', 'backtested', 'paper', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.algo_strategies (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 80),
    description text check (description is null or char_length(description) <= 500),
    status public.algo_strategy_status not null default 'draft',
    current_version_id uuid,
    source text not null default 'chat' check (source in ('chat', 'form', 'import')),
    -- Every revision and every backtest is a trial. Shown next to results so a
    -- spec tuned over many chat turns is visibly downgraded (multiple testing).
    trial_count integer not null default 0 check (trial_count >= 0),
    paper_started_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, name)
);

create table if not exists public.algo_strategy_versions (
    id uuid primary key default gen_random_uuid(),
    strategy_id uuid not null references public.algo_strategies(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    version integer not null check (version >= 1),
    spec jsonb not null check (jsonb_typeof(spec) = 'object'),
    spec_schema_version text not null default 'eve.strategy/1',
    spec_hash text not null,
    nl_summary text not null,          -- template-rendered by the engine, not model prose
    validation jsonb,                  -- errors / warnings with JSON-Pointer paths
    parent_version_id uuid references public.algo_strategy_versions(id),
    created_at timestamptz not null default now(),
    unique (strategy_id, version)
);

do $$ begin
    alter table public.algo_strategies
        add constraint algo_strategies_current_version_fk
        foreign key (current_version_id)
        references public.algo_strategy_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.algo_backtests (
    id uuid primary key default gen_random_uuid(),
    strategy_version_id uuid not null references public.algo_strategy_versions(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    kind text not null default 'in_sample' check (kind in ('in_sample', 'holdout', 'paper')),
    params jsonb not null,             -- month(s), timeframe, slippage, lot size
    metrics jsonb not null,            -- engine output, never model text
    verdict jsonb,                     -- significance / trials-adjusted verdict
    engine_version text,
    data_version text,
    run_card_hash text,
    status text not null check (status in ('ok', 'error')),
    created_at timestamptz not null default now()
);

create table if not exists public.algo_tool_audit (
    id bigserial primary key,
    user_id uuid references public.profiles(id) on delete set null,
    tool text not null,
    tier text not null,
    decision text not null,
    result_status text,
    http_status integer,
    surface text,
    args_hash text,
    args_redacted jsonb,
    latency_ms integer,
    request_id text,
    model text,
    error text,
    created_at timestamptz not null default now()
);

-- One row per user (their own switch) plus one row with user_id null: the
-- global switch, writable only with the service role.
create table if not exists public.algo_trading_controls (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade,
    kill_switch boolean not null default false,
    reason text,
    updated_at timestamptz not null default now(),
    unique nulls not distinct (user_id)
);

-- Every FK indexed, plus the list-page access paths.
create index if not exists idx_algo_strategies_user_updated
    on public.algo_strategies (user_id, updated_at desc);
create index if not exists idx_algo_strategies_current_version
    on public.algo_strategies (current_version_id);
create index if not exists idx_algo_versions_strategy
    on public.algo_strategy_versions (strategy_id, version desc);
create index if not exists idx_algo_versions_user_hash
    on public.algo_strategy_versions (user_id, spec_hash);
create index if not exists idx_algo_versions_parent
    on public.algo_strategy_versions (parent_version_id);
create index if not exists idx_algo_backtests_version
    on public.algo_backtests (strategy_version_id, created_at desc);
create index if not exists idx_algo_backtests_user
    on public.algo_backtests (user_id);
create index if not exists idx_algo_audit_user_created
    on public.algo_tool_audit (user_id, created_at desc);

drop trigger if exists algo_strategies_set_updated_at on public.algo_strategies;
create trigger algo_strategies_set_updated_at before update on public.algo_strategies
    for each row execute function private.set_updated_at();

-- Status and version rules, enforced in the database whoever the caller is:
--   * current_version_id must be a version of THIS strategy
--   * moving to a new version while on paper drops back to 'validated'
--     (a paper run is tied to the exact rules it started with)
--   * 'paper' needs an ok backtest on the current version and no kill switch
--   * trial_count never goes down
create or replace function private.guard_algo_strategy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.current_version_id is distinct from old.current_version_id
       and new.current_version_id is not null
       and not exists (
           select 1 from public.algo_strategy_versions v
           where v.id = new.current_version_id and v.strategy_id = new.id
       ) then
        raise exception 'current_version_id must be a version of this strategy';
    end if;

    if new.trial_count < old.trial_count then
        raise exception 'trial_count cannot decrease';
    end if;

    if old.status = 'paper'
       and new.current_version_id is distinct from old.current_version_id then
        new.status := 'validated';
        new.paper_started_at := null;
    end if;

    if new.status = 'paper' and old.status is distinct from 'paper' then
        if not exists (
            select 1 from public.algo_backtests b
            where b.strategy_version_id = new.current_version_id and b.status = 'ok'
        ) then
            raise exception 'paper trading needs an ok backtest on the current version';
        end if;
        if exists (
            select 1 from public.algo_trading_controls c
            where c.kill_switch and (c.user_id is null or c.user_id = new.user_id)
        ) then
            raise exception 'a kill switch is engaged';
        end if;
        new.paper_started_at := now();
    end if;
    if new.status is distinct from 'paper' then
        new.paper_started_at := null;
    end if;
    return new;
end;
$$;

revoke execute on function private.guard_algo_strategy() from public, anon, authenticated;

drop trigger if exists guard_algo_strategy on public.algo_strategies;
create trigger guard_algo_strategy before update on public.algo_strategies
    for each row execute function private.guard_algo_strategy();

-- Engaging a kill switch stops every paper run it covers, immediately.
create or replace function private.algo_kill_switch_stops_paper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.kill_switch then
        update public.algo_strategies s
        set status = 'validated'
        where s.status = 'paper' and (new.user_id is null or s.user_id = new.user_id);
    end if;
    new.updated_at := now();
    return new;
end;
$$;

revoke execute on function private.algo_kill_switch_stops_paper() from public, anon, authenticated;

drop trigger if exists algo_kill_switch_stops_paper on public.algo_trading_controls;
create trigger algo_kill_switch_stops_paper before insert or update on public.algo_trading_controls
    for each row execute function private.algo_kill_switch_stops_paper();

alter table public.algo_strategies enable row level security;
alter table public.algo_strategy_versions enable row level security;
alter table public.algo_backtests enable row level security;
alter table public.algo_tool_audit enable row level security;
alter table public.algo_trading_controls enable row level security;

-- algo_strategies: owner-only CRUD.
drop policy if exists "Users can view own algo strategies" on public.algo_strategies;
drop policy if exists "Users can insert own algo strategies" on public.algo_strategies;
drop policy if exists "Users can update own algo strategies" on public.algo_strategies;
drop policy if exists "Users can delete own algo strategies" on public.algo_strategies;

create policy "Users can view own algo strategies" on public.algo_strategies
    for select to authenticated using ((select auth.uid()) = user_id);
-- New strategies start as draft/validated; paper is only reachable by update,
-- where the guard trigger checks for a backtest.
create policy "Users can insert own algo strategies" on public.algo_strategies
    for insert to authenticated with check (
        (select auth.uid()) = user_id and status in ('draft', 'validated')
    );
create policy "Users can update own algo strategies" on public.algo_strategies
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
create policy "Users can delete own algo strategies" on public.algo_strategies
    for delete to authenticated using ((select auth.uid()) = user_id);

-- algo_strategy_versions: select + insert only. No update/delete policy, so
-- history is immutable for users (a cascade from the parent still removes it).
drop policy if exists "Users can view own algo versions" on public.algo_strategy_versions;
drop policy if exists "Users can insert own algo versions" on public.algo_strategy_versions;

create policy "Users can view own algo versions" on public.algo_strategy_versions
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own algo versions" on public.algo_strategy_versions
    for insert to authenticated with check (
        (select auth.uid()) = user_id
        and exists (
            select 1 from public.algo_strategies s
            where s.id = strategy_id and s.user_id = (select auth.uid())
        )
    );

-- algo_backtests: select + insert only, on the user's own versions.
drop policy if exists "Users can view own algo backtests" on public.algo_backtests;
drop policy if exists "Users can insert own algo backtests" on public.algo_backtests;

create policy "Users can view own algo backtests" on public.algo_backtests
    for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own algo backtests" on public.algo_backtests
    for insert to authenticated with check (
        (select auth.uid()) = user_id
        and exists (
            select 1 from public.algo_strategy_versions v
            where v.id = strategy_version_id and v.user_id = (select auth.uid())
        )
    );

-- algo_tool_audit: users read their own trail; only the service role writes.
drop policy if exists "Users can view own algo audit" on public.algo_tool_audit;
create policy "Users can view own algo audit" on public.algo_tool_audit
    for select to authenticated using ((select auth.uid()) = user_id);

-- algo_trading_controls: read your own row and the global one; write only
-- your own row. The global row (user_id null) needs the service role.
drop policy if exists "Users can view own or global controls" on public.algo_trading_controls;
drop policy if exists "Users can insert own controls" on public.algo_trading_controls;
drop policy if exists "Users can update own controls" on public.algo_trading_controls;

create policy "Users can view own or global controls" on public.algo_trading_controls
    for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "Users can insert own controls" on public.algo_trading_controls
    for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own controls" on public.algo_trading_controls
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

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
