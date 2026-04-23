-- Tighten realtime.messages SELECT policy: require the user to have a known app role
-- (admin, glosa, or juridico). Underlying postgres_changes payloads are still filtered
-- by each table's own RLS policies, so this adds an extra perimeter check on who can
-- even open a realtime subscription.

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Allow authenticated realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime" ON realtime.messages;

CREATE POLICY "App users can subscribe to realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'glosa'::public.app_role)
  OR public.has_role(auth.uid(), 'juridico'::public.app_role)
);
