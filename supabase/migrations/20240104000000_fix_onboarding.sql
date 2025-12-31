-- Fix User Onboarding and Organization Creation

-- 1. Update the handle_new_user trigger function to automatically create an organization
CREATE OR REPLACE FUNCTION app_auth.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- 1. Create an organization for the new user
  INSERT INTO app_auth.organizations (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'My Organization') || '''s Workspace')
  RETURNING id INTO new_org_id;

  -- 2. Create the user profile linked to this organization with ADMIN role
  INSERT INTO app_auth.users (id, email, full_name, role, organization_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User ' || substring(new.email from 1 for 4)),
    'admin', -- The first user must be the admin of their organization
    new_org_id
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure RLS policies on app_projects.projects are correct for INSERT
-- We drop the existing policy if it exists to ensure the new definition is applied
DROP POLICY IF EXISTS "Users can create projects for their organization" ON app_projects.projects;

CREATE POLICY "Users can create projects for their organization"
ON app_projects.projects FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
  )
);
