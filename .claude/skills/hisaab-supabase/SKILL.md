---
name: hisaab-supabase
description: >-
  Hisaab's own Supabase setup: which project is live, the auth pattern used in
  this codebase, the RLS and schema conventions that keep the database linter
  clean, and the two traps that have already bitten this project. Load before
  touching anything in supabase_schema.sql, app/api/**, middleware.ts,
  utils/supabase/*, or lib/supabase-auth.ts. Complements the generic
  `supabase` and `supabase-postgres-best-practices` skills — read those for
  Postgres rules, this one for what is specific to Hisaab.
---

# Hisaab × Supabase

## Which project is live

| | |
|---|---|
| **Project** | `Hisaab` — ref **`yjhaftvzdbgtsrnndkmu`**, region ap-southeast-1, Postgres 17 |
| URL | `https://yjhaftvzdbgtsrnndkmu.supabase.co` |
| Env keys | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a modern `sb_publishable_…` key) |

⚠️ **There is a second, decoy project.** `jxnvuycbtqdvnocarall` ("patel-tejas's
Project") is older and **paused** — connections to it time out. `.env` pointed
at it, which meant auth silently failed against a dead database. If sign-in
breaks, check the ref in `.env` before anything else.

`.env` also used to carry **duplicate** `NEXT_PUBLIC_SUPABASE_*` entries. dotenv
lets the later one win, so the visible first pair was a red herring. Keep one
pair only.

## Auth pattern in this codebase

There is no shared API client; every route handler gates itself.

```ts
// Route handlers — lib/supabase-auth.ts
import { getAuthUser } from "@/lib/supabase-auth";
const user = await getAuthUser();          // returns user | null
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

- **Server:** `createClient()` from `utils/supabase/server.ts` (cookie-bound, async).
- **Browser:** the `supabase` singleton from `utils/supabase/client.ts`.
- **Client state:** `AuthProvider` / `useAuth()` in `lib/auth-context.tsx`. It is
  mounted in `app/dashboard/layout.tsx`, so **a page outside `/dashboard` that
  calls `useAuth()` throws.**
- **Route gating:** `middleware.ts` only guards `pathname.startsWith("/dashboard")`.
  A page that needs auth must live under `app/dashboard/`. Putting it elsewhere
  leaves it publicly reachable — this happened with `/agent`.

Every route handler still needs its own `getAuthUser()` check. Middleware
redirects pages; it does not protect API routes.

## Schema conventions (keep the linter at zero)

`supabase_schema.sql` is the source of truth and is idempotent — re-run it
freely. Three rules it encodes, each from a real advisor finding:

1. **Wrap `auth.uid()`**: write `(select auth.uid()) = user_id`, never bare
   `auth.uid()`. Bare runs once per row; wrapped, Postgres hoists it to an
   InitPlan. 25 policies here were flagged `auth_rls_initplan`.
2. **Scope policies with `to authenticated`**: a policy with no role list
   applies to `public`, which includes `anon`.
3. **Functions live in `private`, not `public`**: anything in `public` is
   callable at `/rest/v1/rpc/<name>` by anon. `SECURITY DEFINER` functions also
   need `set search_path = ''` with every reference schema-qualified, or a
   caller-controlled search_path can redirect them.

Also: **index every foreign key.** Postgres does not do it for you, and
`ON DELETE CASCADE` takes a lock while it sequential-scans.

## Tables

`profiles` (PK = `auth.users.id`) → `strategies`, `trades`, `broker_connections`,
`ai_insights` all FK to `profiles(id)`. `trade_mistakes` and `trade_images` FK to
`trades(id)` and inherit ownership through it, so their policies use an
`EXISTS (select 1 from public.trades …)` lookup — which is why their `trade_id`
columns must stay indexed.

`broker_connections.access_token` is AES-256-GCM encrypted via
`lib/encryption.ts` with `BROKER_ENCRYPTION_KEY`. Never log or return it.

## The profile-backfill trap

`private.handle_new_user()` fires `after insert on auth.users`. It does **not**
backfill. Any account created before the trigger existed has no `profiles` row —
and since `trades.user_id` references `profiles(id)`, that user cannot write
anything, while auth appears to work. One real account was in this state.

Check after any auth change:

```sql
select u.id, u.email from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
```

Section 5 of `supabase_schema.sql` backfills them.

## Verifying a change

```
get_advisors(type: "security")     -- expect only auth_leaked_password_protection
get_advisors(type: "performance")  -- expect only unused_index (INFO)
```

`unused_index` is noise on a low-traffic table — an index cannot be "used" until
queries hit it. Do not drop the FK indexes to silence it.

**Outstanding manual step:** leaked-password protection is off. Enable it under
Authentication → Policies; it cannot be set over SQL or MCP.

Careful with `list_tables` row counts — they come from `pg_class.reltuples` and
read 0 on a freshly woken project. Use `count(*)` when the number matters.
