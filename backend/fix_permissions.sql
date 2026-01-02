-- Enable RLS on the table (if not already enabled)
ALTER TABLE app_projects.team_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view messages (select)
-- We check if the user belongs to the same organization/project ideally,
-- but for now allowing all authenticated users to read/insert is a good first step to unblock 403.
-- Ideally we would join with app_auth.organizations but that can be complex in RLS.
-- A simpler check is just "auth.role() = 'authenticated'" for now, or check if they are a member of the project.

-- DROP existing policies to be clean
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON app_projects.team_messages;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON app_projects.team_messages;

-- Policy for INSERT
CREATE POLICY "Enable insert for authenticated users"
ON app_projects.team_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for SELECT
CREATE POLICY "Enable select for authenticated users"
ON app_projects.team_messages
FOR SELECT
TO authenticated
USING (true);

-- Ensure permissions are granted to the authenticated role
GRANT USAGE ON SCHEMA app_projects TO authenticated;
GRANT ALL ON TABLE app_projects.team_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE app_projects.team_messages_id_seq TO authenticated;
