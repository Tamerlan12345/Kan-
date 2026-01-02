ALTER TABLE app_tasks.tasks ADD COLUMN IF NOT EXISTS ai_predicted_hours DECIMAL(6,2);
ALTER TABLE app_tasks.tasks ADD COLUMN IF NOT EXISTS ai_decomposition JSONB;
