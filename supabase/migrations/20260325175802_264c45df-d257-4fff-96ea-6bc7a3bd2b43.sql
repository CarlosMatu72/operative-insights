CREATE POLICY "Glosa can insert review_case_details"
ON public.review_case_details
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can update review_case_details"
ON public.review_case_details
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can insert review_case_documentation"
ON public.review_case_documentation
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can update review_case_documentation"
ON public.review_case_documentation
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can insert review_case_classifications"
ON public.review_case_classifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can delete review_case_classifications"
ON public.review_case_classifications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can insert rejection_histories"
ON public.rejection_histories
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can insert review_scores"
ON public.review_scores
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));