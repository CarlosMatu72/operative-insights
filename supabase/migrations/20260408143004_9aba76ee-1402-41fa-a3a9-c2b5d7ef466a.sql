
-- Drop and recreate INSERT policies for glosa on 5 tables

-- 1. review_case_classifications
DROP POLICY IF EXISTS "Glosa can insert review_case_classifications" ON public.review_case_classifications;
CREATE POLICY "Glosa can insert review_case_classifications"
ON public.review_case_classifications
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role))
  OR
  (has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
    SELECT 1 FROM review_cases rc
    WHERE rc.id = review_case_classifications.review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  ))
);

-- 2. review_case_details
DROP POLICY IF EXISTS "Glosa can insert review_case_details" ON public.review_case_details;
CREATE POLICY "Glosa can insert review_case_details"
ON public.review_case_details
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role))
  OR
  (has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
    SELECT 1 FROM review_cases rc
    WHERE rc.id = review_case_details.review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  ))
);

-- 3. review_case_documentation
DROP POLICY IF EXISTS "Glosa can insert review_case_documentation" ON public.review_case_documentation;
CREATE POLICY "Glosa can insert review_case_documentation"
ON public.review_case_documentation
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role))
  OR
  (has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
    SELECT 1 FROM review_cases rc
    WHERE rc.id = review_case_documentation.review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  ))
);

-- 4. review_findings
DROP POLICY IF EXISTS "Glosa can insert review_findings" ON public.review_findings;
CREATE POLICY "Glosa can insert review_findings"
ON public.review_findings
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role))
  OR
  (has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
    SELECT 1 FROM review_cases rc
    WHERE rc.id = review_findings.review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  ))
);

-- 5. review_scores
DROP POLICY IF EXISTS "Glosa can insert review_scores" ON public.review_scores;
CREATE POLICY "Glosa can insert review_scores"
ON public.review_scores
FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role))
  OR
  (has_role(auth.uid(), 'glosa'::app_role) AND EXISTS (
    SELECT 1 FROM review_cases rc
    WHERE rc.id = review_scores.review_case_id
    AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
  ))
);
