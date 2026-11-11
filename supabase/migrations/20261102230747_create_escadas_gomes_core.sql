/*
# Create Escadas Gomes core workspace

1. New tables
- `profiles`: signed-in owner profile with name, phone and Instagram.
- `clients`: customer records with person type, identity data and full address.
- `financial_categories`: income and expense categories.
- `financial_subcategories`: optional subcategories linked to financial categories.
- `stair_types`: catalog of manufactured stair types.
- `stair_sizes`: reusable stair measurements.
- `materials`: reusable materials used in quotes.
- `budgets`: numbered quote headers linked to a client, stair type and size.
- `budget_items`: material quantities and prices within a quote.

2. Security
- Every table has row level security enabled.
- Every row is owned by the authenticated user through `user_id` defaulting to `auth.uid()`.
- Authenticated users receive only CRUD access to their own records.
- Grants are limited to the verbs used by the application.

3. Important notes
- Quote numbers are unique per owner and start at 1; the interface presents them as four digits.
- No data is deleted or altered by this migration.
- Address data is stored as separate editable columns for future reporting.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_type text NOT NULL DEFAULT 'fisica' CHECK (person_type IN ('fisica', 'juridica')),
  name text NOT NULL,
  rg text NOT NULL DEFAULT '',
  cpf_cnpj text NOT NULL DEFAULT '',
  birth_date date,
  street text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita', 'despesa')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stair_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stair_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  meters numeric(8,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number integer NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  stair_type_id uuid REFERENCES public.stair_types(id),
  stair_size_id uuid REFERENCES public.stair_sizes(id),
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_number)
);

CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  material_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS clients_user_name_idx ON public.clients(user_id, name);
CREATE INDEX IF NOT EXISTS budgets_user_created_idx ON public.budgets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS budget_items_budget_idx ON public.budget_items(budget_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stair_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stair_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.financial_categories, public.financial_subcategories, public.stair_types, public.stair_sizes, public.materials, public.budgets, public.budget_items TO authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','clients','financial_categories','financial_subcategories','stair_types','stair_sizes','materials','budgets','budget_items']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%1$s" ON public.%1$s', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%1$s" ON public.%1$s', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "update_own_%1$s" ON public.%1$s', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%1$s" ON public.%1$s', table_name);
    EXECUTE format('CREATE POLICY "select_own_%1$s" ON public.%1$s FOR SELECT TO authenticated USING (auth.uid() = user_id)', table_name);
    IF table_name <> 'profiles' THEN
      EXECUTE format('CREATE POLICY "insert_own_%1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', table_name);
      EXECUTE format('CREATE POLICY "update_own_%1$s" ON public.%1$s FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', table_name);
      EXECUTE format('CREATE POLICY "delete_own_%1$s" ON public.%1$s FOR DELETE TO authenticated USING (auth.uid() = user_id)', table_name);
    ELSE
      EXECUTE format('CREATE POLICY "insert_own_%1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', table_name);
      EXECUTE format('CREATE POLICY "update_own_%1$s" ON public.%1$s FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', table_name);
    END IF;
  END LOOP;
END $$;