-- Fix for Error 400: Ensure app_auth is exposed or relationships are clear
-- Note: You must ensure 'app_auth' schema is exposed in Supabase Dashboard -> Settings -> API -> Exposed Schemas.

-- Fix for Error 403: RLS Permissions
-- 1. Ensure the user exists in app_auth.users
-- This trigger usually handles it, but if it failed, you might need to manually insert.
-- The trigger code usually looks like:
-- create or replace function app_auth.handle_new_user() returns trigger as $$
-- begin
--   insert into app_auth.users (id, full_name, avatar_url, email)
--   values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
--   return new;
-- end;
-- $$ language plpgsql security definer;

-- 2. Allow users to insert messages into team_messages
-- Check if RLS is enabled
ALTER TABLE app_projects.team_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow insertion if the user is part of the project's organization
-- Assuming app_projects.projects has organization_id and app_auth.users has organization_id
-- And team_messages links to projects via project_id

-- Policy: "Users can insert messages to projects in their organization"
CREATE POLICY "Users can insert messages in their org"
ON app_projects.team_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_projects.projects p
    JOIN app_auth.users u ON u.organization_id = p.organization_id
    WHERE p.id = team_messages.project_id
    AND u.id = auth.uid()
  )
);

-- Policy: "Users can view messages in their org"
CREATE POLICY "Users can view messages in their org"
ON app_projects.team_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_projects.projects p
    JOIN app_auth.users u ON u.organization_id = p.organization_id
    WHERE p.id = team_messages.project_id
    AND u.id = auth.uid()
  )
);

-- Fix for Error 400 (Relationship):
-- If the auto-detection of FK fails, verify the constraint name.
-- It should be something like:
-- ALTER TABLE app_projects.team_messages ADD CONSTRAINT team_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_auth.users(id);

-- If you are still getting 400, run this to force a schema cache reload (done via Dashboard)
-- Or try creating an explicit view if cross-schema is troublesome.
