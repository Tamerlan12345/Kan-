
-- Create Checklist/Subtasks Table
CREATE TABLE IF NOT EXISTS app_tasks.subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES app_tasks.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for subtasks
ALTER TABLE app_tasks.subtasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view subtasks of tasks they can view
CREATE POLICY "Users can view subtasks in their organization"
ON app_tasks.subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_tasks.tasks
    WHERE app_tasks.tasks.id = app_tasks.subtasks.task_id
    AND app_tasks.tasks.organization_id IN (
        SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
    )
  )
);

-- Policy: Users can insert/update/delete subtasks if they can update the parent task
CREATE POLICY "Users can edit subtasks"
ON app_tasks.subtasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_tasks.tasks
    WHERE app_tasks.tasks.id = app_tasks.subtasks.task_id
    AND (
        app_tasks.tasks.assigned_to = auth.uid() OR
        app_tasks.tasks.created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM app_auth.users
            WHERE id = auth.uid() AND role IN ('admin', 'team_lead')
        )
    )
  )
);


-- Create Team Messages Table
CREATE TABLE IF NOT EXISTS app_projects.team_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES app_projects.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for team_messages
ALTER TABLE app_projects.team_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in projects of their organization
CREATE POLICY "Users can view messages in their organization projects"
ON app_projects.team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_projects.projects
    WHERE app_projects.projects.id = app_projects.team_messages.project_id
    AND app_projects.projects.organization_id IN (
        SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
    )
  )
);

-- Policy: Users can insert messages if they are in the organization
CREATE POLICY "Users can send messages"
ON app_projects.team_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_projects.projects
    WHERE app_projects.projects.id = app_projects.team_messages.project_id
    AND app_projects.projects.organization_id IN (
        SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
    )
  )
);

-- Enable Realtime for team_messages
-- Note: In Supabase, you typically add the table to the publication.
-- This might need to be run by a superuser or via the dashboard.
-- We'll try to execute it here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'app_projects'
    AND tablename = 'team_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_projects.team_messages;
  END IF;
END
$$;
