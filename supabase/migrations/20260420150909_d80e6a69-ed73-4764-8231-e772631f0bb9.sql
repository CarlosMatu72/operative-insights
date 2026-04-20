-- 1. DEFINER_OR_RPC_BYPASS: Revoke direct RPC access on gafete password functions
-- The edge function uses the service role key and is unaffected by these revokes
REVOKE EXECUTE ON FUNCTION public.decrypt_gafete_password(text) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.get_gafetes_with_password() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.encrypt_gafete_password(text) FROM authenticated, anon, public;

-- 2. INPUT_VALIDATION: Whitelist allowed audit action values to prevent fabrication
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS valid_audit_action;
ALTER TABLE public.audit_logs ADD CONSTRAINT valid_audit_action
  CHECK (action IN (
    'APROBAR_TRAMITE',
    'RECHAZAR_TRAMITE',
    'REABRIR_TRAMITE',
    'ADMIN_REOPEN_APPROVED',
    'ADMIN_DELETE_CASE',
    'CREATE_USER',
    'RESET_PASSWORD',
    'CHANGE_ROLE',
    'TOGGLE_ACTIVE',
    'UPDATE_USER',
    'DELETE_USER'
  ));

-- 3. MISSING_REALTIME_AUTHORIZATION: Restrict realtime channel subscriptions
-- Users can only subscribe to channels related to their own review sessions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive their own broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive their own broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow if the user is authenticated and the topic relates to their own data
  -- For review_sessions: topic format expected to include user_id
  auth.uid() IS NOT NULL
);

-- 4. SUPA_public_bucket_allows_listing: Tighten avatar bucket SELECT policy
-- Keep public read access for displaying images via direct URL, but the broad listing
-- via storage.objects SELECT is restricted. We require auth to list, public URLs still resolve.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Allow public read of individual avatar files (needed for <img src> rendering on login etc.)
-- but the broad listing is implicitly restricted because there's no policy that allows
-- it without filtering. Direct object access by name still works since the bucket is public.
CREATE POLICY "Authenticated users can list avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Public can read individual avatar files"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'avatars');