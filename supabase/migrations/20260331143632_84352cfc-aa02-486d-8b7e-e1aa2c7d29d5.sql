
-- Add FK to profiles (different name since the auth.users one already exists)
ALTER TABLE public.review_cases
ADD CONSTRAINT review_cases_glosador_profile_fkey
FOREIGN KEY (assigned_glosador_user_id) REFERENCES public.profiles(id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_review_cases_status ON review_cases(status);
CREATE INDEX IF NOT EXISTS idx_review_cases_assigned_glosador ON review_cases(assigned_glosador_user_id) WHERE assigned_glosador_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_cases_registered ON review_cases(registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_status ON review_sessions(user_id, session_status);
CREATE INDEX IF NOT EXISTS idx_review_findings_case ON review_findings(review_case_id);
