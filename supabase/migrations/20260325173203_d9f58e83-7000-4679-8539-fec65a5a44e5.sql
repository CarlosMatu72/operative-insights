
-- Allow glosa users to insert review_cases
CREATE POLICY "Glosa can insert review_cases"
  ON public.review_cases FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'glosa'));

-- Allow glosa users to update review_cases they're assigned to (or unassigned ones)
CREATE POLICY "Glosa can update assigned review_cases"
  ON public.review_cases FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'glosa') AND (
      assigned_glosador_user_id = auth.uid() OR
      assigned_glosador_user_id IS NULL OR
      created_by = auth.uid()
    )
  );

-- Create a function to generate internal folio
CREATE OR REPLACE FUNCTION public.generate_internal_folio(doc_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INT;
  prefix TEXT;
BEGIN
  prefix := CASE doc_code
    WHEN 'PEDIMENTO' THEN 'PED'
    WHEN 'ALTA_REMESA' THEN 'ARM'
    WHEN 'REMESA' THEN 'REM'
    WHEN 'CONSOLIDADO' THEN 'CON'
    ELSE 'TRM'
  END;
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(internal_folio, '^[A-Z]+-', ''), '') AS INT)
  ), 0) + 1
  INTO next_num
  FROM public.review_cases
  WHERE internal_folio LIKE prefix || '-%';
  
  RETURN prefix || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$;
