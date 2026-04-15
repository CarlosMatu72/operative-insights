DROP POLICY IF EXISTS "Glosa can update review_findings" ON public.review_findings;
CREATE POLICY "Users can update their own findings or admins all"
ON public.review_findings FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);