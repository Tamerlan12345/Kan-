# Manual Configuration Required

The following configurations must be applied manually in the Supabase Dashboard as they cannot be automated via migrations or code in this environment.

## 1. API Settings (Exposed Schemas)
To fix the `406 Not Acceptable` error when accessing non-public schemas:

1.  Go to **Settings** -> **API**.
2.  Find **Exposed schemas** section.
3.  Add the following schemas to the list:
    *   `app_projects`
    *   `app_tasks`
    *   `app_auth`
    *   `app_analytics`
    *   `app_ai`
4.  Save the changes.

## 2. Row Level Security (RLS)
New RLS policies have been added in `supabase/migrations/20240103000000_fix_rls_and_schemas.sql`. Ensure these migrations are applied.

## 3. Storage
If avatars are used, ensure a bucket named `avatars` exists and is public.
