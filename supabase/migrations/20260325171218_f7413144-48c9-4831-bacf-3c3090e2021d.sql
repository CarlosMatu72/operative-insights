
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'glosa');
CREATE TYPE public.review_status AS ENUM (
  'REGISTRADO', 'ASIGNADO', 'EN_REVISION', 'PAUSADO',
  'CORRECCION_PENDIENTE', 'EN_CORRECCION', 'APROBADO', 'RECHAZADO', 'REABIERTO'
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  avatar_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles RLS
CREATE POLICY "Admins can do everything on profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- User roles RLS
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, correo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  clave TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Executives
CREATE TABLE public.executives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  sucursal_id UUID REFERENCES public.branches(id),
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;

-- Customs keys
CREATE TABLE public.customs_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.customs_keys ENABLE ROW LEVEL SECURITY;

-- Item ranges
CREATE TABLE public.item_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_rango TEXT NOT NULL,
  min_partidas INT NOT NULL,
  max_partidas INT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.item_ranges ENABLE ROW LEVEL SECURITY;

-- Classification features
CREATE TABLE public.classification_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.classification_features ENABLE ROW LEVEL SECURITY;

-- Classification feature rules
CREATE TABLE public.classification_feature_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_feature_id UUID NOT NULL REFERENCES public.classification_features(id),
  sucursal_id UUID REFERENCES public.branches(id),
  cliente_id UUID REFERENCES public.clients(id),
  customs_key_id UUID REFERENCES public.customs_keys(id),
  default_value BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.classification_feature_rules ENABLE ROW LEVEL SECURITY;

-- Observation categories
CREATE TABLE public.observation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.observation_categories ENABLE ROW LEVEL SECURITY;

-- Observation subcategories
CREATE TABLE public.observation_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.observation_categories(id),
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.observation_subcategories ENABLE ROW LEVEL SECURITY;

-- Observation errors
CREATE TABLE public.observation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.observation_categories(id),
  subcategory_id UUID NOT NULL REFERENCES public.observation_subcategories(id),
  codigo_error TEXT,
  descripcion TEXT NOT NULL,
  severidad TEXT,
  descuento_puntos NUMERIC,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.observation_errors ENABLE ROW LEVEL SECURITY;

-- Document types
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Review cases
CREATE TABLE public.review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_folio TEXT NOT NULL UNIQUE,
  reference TEXT,
  document_type_id UUID REFERENCES public.document_types(id),
  branch_id UUID REFERENCES public.branches(id),
  client_id UUID REFERENCES public.clients(id),
  executive_id UUID REFERENCES public.executives(id),
  assigned_glosador_user_id UUID REFERENCES auth.users(id),
  status review_status NOT NULL DEFAULT 'REGISTRADO',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  first_started_at TIMESTAMPTZ,
  last_started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  parent_case_id UUID REFERENCES public.review_cases(id),
  remesa_base_reference TEXT,
  remesa_revision_number INT,
  is_active_remesa BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_review_cases_updated_at
  BEFORE UPDATE ON public.review_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Review case details
CREATE TABLE public.review_case_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id),
  branch_id UUID REFERENCES public.branches(id),
  executive_id UUID REFERENCES public.executives(id),
  customs_key_id UUID REFERENCES public.customs_keys(id),
  partidas INT,
  item_range_id UUID REFERENCES public.item_ranges(id),
  comments_generales TEXT
);
ALTER TABLE public.review_case_details ENABLE ROW LEVEL SECURITY;

-- Review case classifications
CREATE TABLE public.review_case_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  classification_feature_id UUID NOT NULL REFERENCES public.classification_features(id),
  value_boolean BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.review_case_classifications ENABLE ROW LEVEL SECURITY;

-- Review case documentation
CREATE TABLE public.review_case_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  documentation_status TEXT,
  documentation_comment TEXT
);
ALTER TABLE public.review_case_documentation ENABLE ROW LEVEL SECURITY;

-- Review sessions
CREATE TABLE public.review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  session_status TEXT NOT NULL DEFAULT 'active'
);
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- Review rounds
CREATE TABLE public.review_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  round_type TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  result_status TEXT,
  reviewer_user_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.review_rounds ENABLE ROW LEVEL SECURITY;

-- Review findings
CREATE TABLE public.review_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  review_round_id UUID REFERENCES public.review_rounds(id),
  category_id UUID REFERENCES public.observation_categories(id),
  subcategory_id UUID REFERENCES public.observation_subcategories(id),
  observation_error_id UUID REFERENCES public.observation_errors(id),
  comentario_inicial TEXT,
  current_status TEXT NOT NULL DEFAULT 'open',
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.review_findings ENABLE ROW LEVEL SECURITY;

-- Finding histories
CREATE TABLE public.finding_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID NOT NULL REFERENCES public.review_findings(id) ON DELETE CASCADE,
  review_round_id UUID REFERENCES public.review_rounds(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.finding_histories ENABLE ROW LEVEL SECURITY;

-- Rejection histories
CREATE TABLE public.rejection_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  review_round_id UUID REFERENCES public.review_rounds(id),
  motivo TEXT NOT NULL,
  comentario TEXT,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reopened_by UUID REFERENCES auth.users(id),
  reopened_at TIMESTAMPTZ
);
ALTER TABLE public.rejection_histories ENABLE ROW LEVEL SECURITY;

-- Scoring rules
CREATE TABLE public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  valor_base NUMERIC NOT NULL DEFAULT 100,
  classification_weight NUMERIC NOT NULL DEFAULT 0.5,
  observations_weight NUMERIC NOT NULL DEFAULT 0.5,
  activo BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

-- Scoring rule error penalties
CREATE TABLE public.scoring_rule_error_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scoring_rule_id UUID NOT NULL REFERENCES public.scoring_rules(id) ON DELETE CASCADE,
  observation_error_id UUID NOT NULL REFERENCES public.observation_errors(id),
  penalty_points NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.scoring_rule_error_penalties ENABLE ROW LEVEL SECURITY;

-- Review scores
CREATE TABLE public.review_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  score_total NUMERIC,
  score_classification NUMERIC,
  score_observations NUMERIC,
  total_errors INT DEFAULT 0,
  correction_rounds INT DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.review_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for catalog tables (authenticated can read, admin can write)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'branches', 'clients', 'executives', 'customs_keys', 'item_ranges',
    'classification_features', 'classification_feature_rules',
    'observation_categories', 'observation_subcategories', 'observation_errors',
    'document_types', 'scoring_rules', 'scoring_rule_error_penalties'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Authenticated can read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Admins can manage %1$s" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))', tbl);
  END LOOP;
END;
$$;

-- RLS for operational tables (admin full access, glosa can access assigned)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'review_cases', 'review_case_details', 'review_case_classifications',
    'review_case_documentation', 'review_sessions', 'review_rounds',
    'review_findings', 'finding_histories', 'rejection_histories', 'review_scores'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Admins full access on %1$s" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''))', tbl);
    EXECUTE format('CREATE POLICY "Authenticated can read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', tbl);
  END LOOP;
END;
$$;

-- Seed document types
INSERT INTO public.document_types (code, name) VALUES
  ('PEDIMENTO', 'Pedimento'),
  ('ALTA_REMESA', 'Alta Remesa'),
  ('REMESA', 'Remesa'),
  ('CONSOLIDADO', 'Consolidado');
