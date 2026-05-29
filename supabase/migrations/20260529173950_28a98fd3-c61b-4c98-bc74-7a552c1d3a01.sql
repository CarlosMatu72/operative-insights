
-- 1. review_case_classifications: scope DELETE to case ownership
DROP POLICY IF EXISTS "Glosa can delete review_case_classifications" ON public.review_case_classifications;
CREATE POLICY "Glosa can delete review_case_classifications"
ON public.review_case_classifications
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_case_classifications.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- 2. rejection_histories: scope INSERT to case ownership
DROP POLICY IF EXISTS "Glosa can insert rejection_histories" ON public.rejection_histories;
CREATE POLICY "Glosa can insert rejection_histories"
ON public.rejection_histories
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = rejection_histories.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- 3. review_rounds: scope INSERT to case ownership
DROP POLICY IF EXISTS "Glosa can insert review_rounds" ON public.review_rounds;
CREATE POLICY "Glosa can insert review_rounds"
ON public.review_rounds
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_rounds.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- 4. finding_histories: scope INSERT to case ownership via finding -> case
DROP POLICY IF EXISTS "Glosa can insert finding_histories" ON public.finding_histories;
CREATE POLICY "Glosa can insert finding_histories"
ON public.finding_histories
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
      SELECT 1 FROM public.review_findings rf
      JOIN public.review_cases rc ON rc.id = rf.review_case_id
      WHERE rf.id = finding_histories.finding_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- 5. review_comments: scope INSERT to case ownership
DROP POLICY IF EXISTS "Glosa can insert review_comments" ON public.review_comments;
CREATE POLICY "Glosa can insert review_comments"
ON public.review_comments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_comments.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- 6. review_findings: remove duplicate UPDATE policy and tighten ownership
DROP POLICY IF EXISTS "Users can update own findings or admins all" ON public.review_findings;
DROP POLICY IF EXISTS "Users can update their own findings or admins all" ON public.review_findings;
CREATE POLICY "Users can update findings on assigned cases or admins"
ON public.review_findings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_findings.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_findings.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);
