-- Allow glosadores to update their own comments
CREATE POLICY "Glosa can update own review_comments"
ON public.review_comments FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow glosadores to delete their own comments
CREATE POLICY "Glosa can delete own review_comments"
ON public.review_comments FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);