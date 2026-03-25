ALTER PUBLICATION supabase_realtime ADD TABLE public.review_sessions;

CREATE POLICY "Glosa can insert own sessions"
ON public.review_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Glosa can update own sessions"
ON public.review_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND (has_role(auth.uid(), 'glosa'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));