-- Make the avatars bucket private (internal-app only, no anonymous access needed)
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Drop the anon policy since the bucket is now private
DROP POLICY IF EXISTS "Public can read individual avatar files" ON storage.objects;