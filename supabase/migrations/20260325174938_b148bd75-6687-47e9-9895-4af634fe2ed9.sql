CREATE POLICY "Glosa can insert review_rounds"
ON public.review_rounds
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Glosa can update review_rounds"
ON public.review_rounds
FOR UPDATE
TO authenticated
USING (
  (reviewer_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Glosa can insert review_findings"
ON public.review_findings
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Glosa can update review_findings"
ON public.review_findings
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
);