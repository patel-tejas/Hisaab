-- Acceptance checks for the strategy-builder tables (algo_*), Phase 15 P2/P5.
-- Run after supabase-local-stub.sql and supabase_schema.sql (see the stub's
-- header). Every check raises on failure; the last line prints PASS.

\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- Two users with profiles (the handle_new_user trigger creates them).
insert into auth.users (id, email) values
    ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
    ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com')
on conflict do nothing;

-- ------------------------------------------------------------ user A writes
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.algo_strategies (id, user_id, name, status)
values ('11111111-0000-0000-0000-00000000000a',
        'aaaaaaaa-0000-0000-0000-000000000001', 'A strategy', 'validated');
insert into public.algo_strategy_versions
    (id, strategy_id, user_id, version, spec, spec_hash, nl_summary)
values ('22222222-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000a',
        'aaaaaaaa-0000-0000-0000-000000000001', 1, '{"name":"A"}', 'h1', 'summary');
update public.algo_strategies set current_version_id = '22222222-0000-0000-0000-00000000000a'
where id = '11111111-0000-0000-0000-00000000000a';

-- A cannot insert a strategy straight into paper.
do $$ begin
    insert into public.algo_strategies (user_id, name, status)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'sneaky', 'paper');
    raise exception 'FAIL: inserted a strategy directly as paper';
exception when insufficient_privilege then null; end $$;

-- A cannot promote to paper without an ok backtest.
do $$ begin
    update public.algo_strategies set status = 'paper'
    where id = '11111111-0000-0000-0000-00000000000a';
    raise exception 'FAIL: promoted to paper without a backtest';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- Versions are immutable.
do $$ declare n int; begin
    update public.algo_strategy_versions set spec = '{"name":"edited"}'
    where id = '22222222-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: a version was updated'; end if;
    delete from public.algo_strategy_versions where id = '22222222-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: a version was deleted'; end if;
end $$;

-- trial_count never decreases.
update public.algo_strategies set trial_count = 3 where id = '11111111-0000-0000-0000-00000000000a';
do $$ begin
    update public.algo_strategies set trial_count = 1
    where id = '11111111-0000-0000-0000-00000000000a';
    raise exception 'FAIL: trial_count decreased';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- With an ok backtest, paper works and stamps paper_started_at.
insert into public.algo_backtests (strategy_version_id, user_id, params, metrics, status)
values ('22222222-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001',
        '{}', '{"net_pnl": 1}', 'ok');
update public.algo_strategies set status = 'paper' where id = '11111111-0000-0000-0000-00000000000a';
do $$ begin
    if (select paper_started_at from public.algo_strategies
        where id = '11111111-0000-0000-0000-00000000000a') is null then
        raise exception 'FAIL: paper_started_at not set';
    end if;
end $$;

-- ------------------------------------------------------------ user B attacks
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

do $$ declare n int; begin
    select count(*) into n from public.algo_strategies;
    if n <> 0 then raise exception 'FAIL: B can see A''s strategies'; end if;
    select count(*) into n from public.algo_strategy_versions;
    if n <> 0 then raise exception 'FAIL: B can see A''s versions'; end if;
    select count(*) into n from public.algo_backtests;
    if n <> 0 then raise exception 'FAIL: B can see A''s backtests'; end if;
    update public.algo_strategies set name = 'pwned'
    where id = '11111111-0000-0000-0000-00000000000a';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: B renamed A''s strategy'; end if;
end $$;

-- B cannot add a version to A's strategy, even knowing its id.
do $$ begin
    insert into public.algo_strategy_versions
        (strategy_id, user_id, version, spec, spec_hash, nl_summary)
    values ('11111111-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000002',
            2, '{}', 'x', 'x');
    raise exception 'FAIL: B added a version to A''s strategy';
exception when insufficient_privilege then null; end $$;

-- B cannot point B's own strategy at A's version.
insert into public.algo_strategies (id, user_id, name)
values ('11111111-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'B');
do $$ begin
    update public.algo_strategies set current_version_id = '22222222-0000-0000-0000-00000000000a'
    where id = '11111111-0000-0000-0000-00000000000b';
    raise exception 'FAIL: B borrowed A''s version';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- B cannot write the global kill switch or audit rows.
do $$ begin
    insert into public.algo_trading_controls (user_id, kill_switch) values (null, true);
    raise exception 'FAIL: B wrote the global kill switch';
exception when insufficient_privilege then null; end $$;
do $$ begin
    insert into public.algo_tool_audit (tool, tier, decision) values ('x', 'read', 'allow');
    raise exception 'FAIL: B wrote an audit row';
exception when insufficient_privilege then null; end $$;

-- ------------------------------------------------------------ kill switch
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into public.algo_trading_controls (user_id, kill_switch, reason)
values ('aaaaaaaa-0000-0000-0000-000000000001', true, 'test');
do $$ begin
    if (select status from public.algo_strategies
        where id = '11111111-0000-0000-0000-00000000000a') <> 'validated' then
        raise exception 'FAIL: kill switch did not stop paper';
    end if;
end $$;
do $$ begin
    update public.algo_strategies set status = 'paper'
    where id = '11111111-0000-0000-0000-00000000000a';
    raise exception 'FAIL: promoted to paper with the kill switch on';
exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- A new version while on paper drops back to validated.
update public.algo_trading_controls set kill_switch = false
where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.algo_strategies set status = 'paper' where id = '11111111-0000-0000-0000-00000000000a';
insert into public.algo_strategy_versions
    (id, strategy_id, user_id, version, spec, spec_hash, nl_summary, parent_version_id)
values ('22222222-0000-0000-0000-00000000000c', '11111111-0000-0000-0000-00000000000a',
        'aaaaaaaa-0000-0000-0000-000000000001', 2, '{"name":"A2"}', 'h2', 's2',
        '22222222-0000-0000-0000-00000000000a');
update public.algo_strategies set current_version_id = '22222222-0000-0000-0000-00000000000c'
where id = '11111111-0000-0000-0000-00000000000a';
do $$ begin
    if (select status from public.algo_strategies
        where id = '11111111-0000-0000-0000-00000000000a') <> 'validated' then
        raise exception 'FAIL: revising a paper strategy kept it on paper';
    end if;
end $$;

-- 'live' does not exist.
do $$ begin
    perform 'live'::public.algo_strategy_status;
    raise exception 'FAIL: live is a valid status';
exception when invalid_text_representation then null; end $$;

reset role;
select 'PASS: algo_* RLS and guards' as result;
