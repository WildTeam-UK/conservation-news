# WildTeam Content Platform database

The Supabase schema is stored in `supabase/migrations` so database changes are
reviewed and versioned with the application code.

## First project setup

1. Open the WildTeam Content Platform project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Paste the contents of
   `supabase/migrations/202610150001_initial_content_platform.sql`.
4. Run the query once.
5. Confirm the Table Editor lists the new tables and that Row Level Security is
   enabled on each table.

Do not paste database passwords, secret keys, or service-role keys into source
files. Runtime values belong in local `.env` files and Vercel environment
variables only.

