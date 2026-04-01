CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  review_round_id UUID REFERENCES public.review_rounds(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on review_comments"
  ON public.review_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read review_comments"
  ON public.review_comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Glosa can insert review_comments"
  ON public.review_comments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'glosa') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_review_comments_case ON public.review_comments(review_case_id);