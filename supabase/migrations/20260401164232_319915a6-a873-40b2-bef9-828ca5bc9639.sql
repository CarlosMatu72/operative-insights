
CREATE INDEX IF NOT EXISTS idx_review_cases_assigned_glosador 
ON review_cases(assigned_glosador_user_id) 
WHERE assigned_glosador_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_cases_status 
ON review_cases(status);

CREATE INDEX IF NOT EXISTS idx_review_sessions_user_status 
ON review_sessions(user_id, session_status) 
WHERE session_status = 'active';

CREATE INDEX IF NOT EXISTS idx_review_findings_case 
ON review_findings(review_case_id);

CREATE INDEX IF NOT EXISTS idx_review_cases_registered 
ON review_cases(registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_comments_case 
ON review_comments(review_case_id);

CREATE INDEX IF NOT EXISTS idx_review_rounds_case 
ON review_rounds(review_case_id);

CREATE INDEX IF NOT EXISTS idx_review_classifications_case 
ON review_case_classifications(review_case_id);
