CREATE POLICY "Glosa can insert finding_histories"
ON public.finding_histories
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Glosa can update rejection_histories"
ON public.rejection_histories
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));