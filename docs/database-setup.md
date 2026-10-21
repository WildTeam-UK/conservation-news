# WildTeam Content Platform database

The complete Supabase schema is stored as ordered SQL files in
`supabase/migrations`. These checked-in migrations are the source of truth for
database structure, policies, functions and scheduled jobs.

## New project setup

Apply every migration in filename order, starting with
`202610150001_initial_content_platform.sql` and continuing through the latest
file. When using the Supabase SQL Editor:

1. Open the WildTeam Content Platform project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Paste and run one migration at a time in filename order.
4. Do not skip a migration, even when its feature is not yet visible in the UI.
5. Confirm each query succeeds before running the next one.

After the final migration, confirm the expected tables are present and Row Level
Security is enabled. Then configure the application environment variables listed
in `docs/ARCHITECTURE.md`.

## Existing projects

For an existing project, apply only migrations that have not already run. Never
rerun, edit or replace a production migration merely to change its historical
implementation. Add future database changes as a new, later migration.

Some migrations create or update scheduled automation. Before applying them to a
different Supabase or Vercel project, review their endpoint and Vault-secret
requirements against `docs/ARCHITECTURE.md`.

Do not paste database passwords, secret keys or service-role keys into source
files. Runtime values belong in local `.env` files, Supabase Vault or Vercel
environment variables, according to the trust boundary documented in
`docs/ARCHITECTURE.md`.

