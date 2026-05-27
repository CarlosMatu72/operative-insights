
-- Tighten review_case_details UPDATE policy to enforce ownership
DROP POLICY IF EXISTS "Glosa can update review_case_details" ON public.review_case_details;
CREATE POLICY "Glosa can update review_case_details"
ON public.review_case_details
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'glosa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_case_details.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'glosa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_case_details.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- Tighten review_case_documentation UPDATE policy to enforce ownership
DROP POLICY IF EXISTS "Glosa can update review_case_documentation" ON public.review_case_documentation;
CREATE POLICY "Glosa can update review_case_documentation"
ON public.review_case_documentation
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'glosa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_case_documentation.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'glosa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.review_cases rc
      WHERE rc.id = review_case_documentation.review_case_id
        AND (rc.assigned_glosador_user_id = auth.uid() OR rc.created_by = auth.uid())
    )
  )
);

-- Remove overly broad realtime subscription policy
DROP POLICY IF EXISTS "Authenticated users can receive their own broadcasts" ON realtime.messages;

-- Fix mutable search_path on count_remesas_from_lote
CREATE OR REPLACE FUNCTION public.count_remesas_from_lote(lote text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  parts TEXT[];
  part TEXT;
  range_parts TEXT[];
  total INTEGER := 0;
BEGIN
  IF lote IS NULL OR lote = '' THEN RETURN 1; END IF;
  parts := string_to_array(regexp_replace(lote, '\s+', '', 'g'), ',');
  FOREACH part IN ARRAY parts LOOP
    IF part ~ '^\d+-\d+$' THEN
      range_parts := string_to_array(part, '-');
      total := total + (range_parts[2]::INTEGER - range_parts[1]::INTEGER + 1);
    ELSIF part ~ '^\d+$' THEN
      total := total + 1;
    END IF;
  END LOOP;
  RETURN GREATEST(total, 1);
END;
$function$;
