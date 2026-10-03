-- Minimal stand-in for the parts of Supabase that supabase_schema.sql and
-- verify-algo-rls.sql touch, so both run against a plain local Postgres
-- (16+). NEVER run this against a real Supabase project: it would replace
-- auth.uid().
--
--   initdb -D /tmp/pg && pg_ctl -D /tmp/pg -o "-p 54329" start
--   psql -p 54329 -U postgres -v ON_ERROR_STOP=1 \
--        -f scripts/sql/supabase-local-stub.sql \
--        -f supabase_schema.sql \
--        -f scripts/sql/verify-algo-rls.sql

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
);

-- Supabase reads the caller from the JWT; here a session setting stands in.
create or replace function auth.uid() returns uuid
language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
