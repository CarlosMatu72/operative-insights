ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);