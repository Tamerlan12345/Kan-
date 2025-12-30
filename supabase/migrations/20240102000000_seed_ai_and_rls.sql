-- Seed AI Assistants
INSERT INTO app_ai.assistants (name, assistant_type, description, system_prompt, model_config)
VALUES
(
  'Business Analyst',
  'business_analyst',
  'Helps with project planning and answering questions about the board.',
  'You are an expert Business Analyst for a software project. You have access to the context of the Kanban board. Answer questions about project status, risks, and provide insights. Be concise and professional.',
  '{"model": "gemini-1.5-pro", "temperature": 0.5}'
),
(
  'Task Decomposer',
  'task_decomposer',
  'Breaks down tasks into subtasks.',
  'You are an expert Project Manager. Your goal is to break down a given task (Title + Description) into smaller, actionable subtasks. Return ONLY a JSON array of objects. Each object must have: "title" (string), "description" (string), "estimated_hours" (number). Example: [{"title": "Setup repo", "description": "Init git", "estimated_hours": 1}]. Do not wrap in markdown code blocks if possible, or I will strip them. STRICTLY JSON.',
  '{"model": "gemini-1.5-pro", "temperature": 0.3}'
),
(
  'Predictive Estimator',
  'predictive_estimator',
  'Estimates time and complexity for tasks.',
  'You are an expert Software Engineer. Analyze the task title and description. Estimate the time required in hours. Return ONLY a JSON object with: "estimated_hours" (number), "complexity_score" (1-10 integer), "reasoning" (string). Example: {"estimated_hours": 4, "complexity_score": 3, "reasoning": "Simple CRUD"}. STRICTLY JSON.',
  '{"model": "gemini-1.5-pro", "temperature": 0.2}'
)
ON CONFLICT DO NOTHING;

-- RLS for app_ai.ai_requests
ALTER TABLE app_ai.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI requests"
ON app_ai.ai_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert AI requests"
ON app_ai.ai_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS for app_ai.assistants
ALTER TABLE app_ai.assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read assistants"
ON app_ai.assistants FOR SELECT
USING (true);

-- Ensure app_analytics RLS is comprehensive
ALTER TABLE app_analytics.team_metrics ENABLE ROW LEVEL SECURITY;
-- (Existing policy "Analytics access for leaders" covers Select for admins/leads and self)

-- If we want regular users to see the dashboard (e.g., Velocity of the team), we might need to broaden it or create a specific policy.
-- The prompt says "Visualize... Velocity, count of closed tasks". Usually visible to the team.
-- Let's allow organization members to view metrics for their organization.

CREATE POLICY "Organization members can view team metrics"
ON app_analytics.team_metrics FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM app_auth.users WHERE id = auth.uid()
  )
);

-- Drop the old restricted policy if it conflicts or is too narrow, but "OR" logic usually applies in Supabase (permissive).
-- However, "Analytics access for leaders" might be redundant now. Let's keep it for safety or specificity.
