
-- Tighten review_sessions SELECT: glosadores can only see their own sessions
DROP POLICY IF EXISTS "Authenticated can read review_sessions" ON public.review_sessions;

CREATE POLICY "Users can read own sessions or admins all"
ON public.review_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tighten review_cases SELECT: glosadores see only assigned/created cases
DROP POLICY IF EXISTS "Authenticated can read review_cases" ON public.review_cases;

CREATE POLICY "Users can read relevant cases"
ON public.review_cases
FOR SELECT
TO authenticated
USING (
  assigned_glosador_user_id = auth.uid()
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tighten review_findings SELECT to cases user is involved in
DROP POLICY IF EXISTS "Authenticated can read review_findings" ON public.review_findings;

CREATE POLICY "Users can read findings for their cases"
ON public.review_findings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_rounds SELECT
DROP POLICY IF EXISTS "Authenticated can read review_rounds" ON public.review_rounds;

CREATE POLICY "Users can read rounds for their cases"
ON public.review_rounds
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_comments SELECT
DROP POLICY IF EXISTS "Authenticated can read review_comments" ON public.review_comments;

CREATE POLICY "Users can read comments for their cases"
ON public.review_comments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_scores SELECT
DROP POLICY IF EXISTS "Authenticated can read review_scores" ON public.review_scores;

CREATE POLICY "Users can read scores for their cases"
ON public.review_scores
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten finding_histories SELECT
DROP POLICY IF EXISTS "Authenticated can read finding_histories" ON public.finding_histories;

CREATE POLICY "Users can read finding histories for their cases"
ON public.finding_histories
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_findings rf
    JOIN public.review_cases rc ON rc.id = rf.review_case_id
    WHERE rf.id = finding_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten rejection_histories SELECT
DROP POLICY IF EXISTS "Authenticated can read rejection_histories" ON public.rejection_histories;

CREATE POLICY "Users can read rejection histories for their cases"
ON public.rejection_histories
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_case_details SELECT
DROP POLICY IF EXISTS "Authenticated can read review_case_details" ON public.review_case_details;

CREATE POLICY "Users can read details for their cases"
ON public.review_case_details
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_case_documentation SELECT
DROP POLICY IF EXISTS "Authenticated can read review_case_documentation" ON public.review_case_documentation;

CREATE POLICY "Users can read documentation for their cases"
ON public.review_case_documentation
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Tighten review_case_classifications SELECT
DROP POLICY IF EXISTS "Authenticated can read review_case_classifications" ON public.review_case_classifications;

CREATE POLICY "Users can read classifications for their cases"
ON public.review_case_classifications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.review_cases rc
    WHERE rc.id = review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  )
);

-- Profiles: allow glosadores to see other profiles (needed to display names)
-- Keep current restrictive policy as-is since admin policy covers admin reads
-- Add policy for glosadores to read basic profile info of other users
CREATE POLICY "Authenticated can read all profiles basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the overly restrictive "Users can view own profile" since the new policy covers it
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
