-- Enable RLS on app_projects tables
ALTER TABLE app_projects.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_projects.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_projects.board_columns ENABLE ROW LEVEL SECURITY;

-- Projects: Users can view projects in their organization
CREATE POLICY "Users can view projects in their organization"
ON app_projects.projects FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
));

-- Projects: Only owners or admins can insert/update/delete
-- Assuming 'owner_id' or role check
CREATE POLICY "Users can create projects for their organization"
ON app_projects.projects FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
));

CREATE POLICY "Owners and Admins can update projects"
ON app_projects.projects FOR UPDATE
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM app_auth.users
    WHERE id = auth.uid() AND role IN ('admin', 'team_lead') AND organization_id = app_projects.projects.organization_id
  )
);

CREATE POLICY "Owners and Admins can delete projects"
ON app_projects.projects FOR DELETE
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM app_auth.users
    WHERE id = auth.uid() AND role IN ('admin', 'team_lead') AND organization_id = app_projects.projects.organization_id
  )
);

-- Boards: Inherit access from projects
CREATE POLICY "Users can view boards of accessible projects"
ON app_projects.boards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_projects.projects
    WHERE id = app_projects.boards.project_id
    AND (
      organization_id IN (
        SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create boards in accessible projects"
ON app_projects.boards FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_projects.projects
    WHERE id = project_id
    AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM app_auth.users
        WHERE id = auth.uid() AND role IN ('admin', 'team_lead') AND organization_id = app_projects.projects.organization_id
      )
    )
  )
);

CREATE POLICY "Users can update boards"
ON app_projects.boards FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM app_projects.projects
    WHERE id = project_id
    AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM app_auth.users
        WHERE id = auth.uid() AND role IN ('admin', 'team_lead') AND organization_id = app_projects.projects.organization_id
      )
    )
  )
);

-- Columns: Inherit from Boards -> Projects
CREATE POLICY "Users can view columns"
ON app_projects.board_columns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_projects.boards
    WHERE id = app_projects.board_columns.board_id
    AND EXISTS (
        SELECT 1 FROM app_projects.projects
        WHERE id = app_projects.boards.project_id
        AND organization_id IN (SELECT organization_id FROM app_auth.users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage columns"
ON app_projects.board_columns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_projects.boards
    WHERE id = app_projects.board_columns.board_id
    AND EXISTS (
        SELECT 1 FROM app_projects.projects
        WHERE id = app_projects.boards.project_id
        AND (
            owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM app_auth.users
                WHERE id = auth.uid() AND role IN ('admin', 'team_lead') AND organization_id = app_projects.projects.organization_id
            )
        )
    )
  )
);
