
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt a password using the server-side key
CREATE OR REPLACE FUNCTION public.encrypt_gafete_password(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  SELECT current_setting('app.settings.gafete_encryption_key', true) INTO enc_key;
  IF enc_key IS NULL OR enc_key = '' THEN
    -- Fallback: try to read from vault
    enc_key := current_setting('secrets.gafete_encryption_key', true);
  END IF;
  IF enc_key IS NULL OR enc_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN encode(pgp_sym_encrypt(plain_text, enc_key), 'base64');
END;
$$;

-- Function to decrypt a password
CREATE OR REPLACE FUNCTION public.decrypt_gafete_password(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  SELECT current_setting('app.settings.gafete_encryption_key', true) INTO enc_key;
  IF enc_key IS NULL OR enc_key = '' THEN
    enc_key := current_setting('secrets.gafete_encryption_key', true);
  END IF;
  IF enc_key IS NULL OR enc_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), enc_key);
END;
$$;

-- Edge function to get decrypted gafete data (returns decrypted password)
CREATE OR REPLACE FUNCTION public.get_gafetes_with_password()
RETURNS TABLE(
  id uuid,
  nombre_completo text,
  departamento_id uuid,
  usuario_anam text,
  password_anam_decrypted text,
  doc_identificacion boolean,
  doc_constancia_fiscal boolean,
  doc_responsiva_firmada boolean,
  doc_acuse_cita boolean,
  fecha_cita timestamptz,
  fecha_entrega date,
  fecha_vigencia date,
  estatus text,
  activo boolean,
  notas text,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id, g.nombre_completo, g.departamento_id, g.usuario_anam,
    decrypt_gafete_password(g.password_anam) as password_anam_decrypted,
    g.doc_identificacion, g.doc_constancia_fiscal, g.doc_responsiva_firmada, g.doc_acuse_cita,
    g.fecha_cita, g.fecha_entrega, g.fecha_vigencia,
    g.estatus, g.activo, g.notas, g.created_at, g.created_by, g.updated_at, g.updated_by
  FROM public.gafetes g;
$$;

-- Trigger to auto-encrypt password_anam on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_gafete_password_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enc_key text;
BEGIN
  IF NEW.password_anam IS NOT NULL AND NEW.password_anam != '' THEN
    -- Check if already encrypted (base64 encoded pgp data starts with specific patterns)
    BEGIN
      SELECT current_setting('app.settings.gafete_encryption_key', true) INTO enc_key;
      IF enc_key IS NULL OR enc_key = '' THEN
        enc_key := current_setting('secrets.gafete_encryption_key', true);
      END IF;
      IF enc_key IS NOT NULL AND enc_key != '' THEN
        -- Try to decrypt - if it works, it's already encrypted
        PERFORM pgp_sym_decrypt(decode(NEW.password_anam, 'base64'), enc_key);
        -- If we get here, it's already encrypted, leave it
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Not encrypted yet, encrypt it
      NEW.password_anam := encrypt_gafete_password(NEW.password_anam);
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encrypt_gafete_password
BEFORE INSERT OR UPDATE OF password_anam ON public.gafetes
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_gafete_password_trigger();
