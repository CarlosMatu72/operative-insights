
-- Remove the overly broad SELECT policy
DROP POLICY IF EXISTS "Authenticated can read all profiles basic info" ON public.profiles;

-- Restore the scoped own-row policy
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Create a security definer function that returns only safe columns
CREATE OR REPLACE FUNCTION public.get_profiles_display(_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  nombre text,
  avatar_url text,
  activo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nombre, p.avatar_url, p.activo
  FROM public.profiles p
  WHERE (_user_ids IS NULL OR p.id = ANY(_user_ids))
$$;
