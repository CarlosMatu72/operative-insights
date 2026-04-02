-- Make observation_errors category/subcategory optional
ALTER TABLE public.observation_errors
  ALTER COLUMN category_id DROP NOT NULL,
  ALTER COLUMN subcategory_id DROP NOT NULL;

COMMENT ON COLUMN public.observation_errors.category_id IS 'Opcional - Se mantiene para datos históricos';
COMMENT ON COLUMN public.observation_errors.subcategory_id IS 'Opcional - Se mantiene para datos históricos';

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
);