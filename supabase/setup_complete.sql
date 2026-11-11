-- ============================================================
-- ESCADAS GOMES — SCRIPT COMPLETO DE CRIAÇÃO DAS TABELAS
-- Cole este script no SQL Editor do seu Supabase e rode
-- ============================================================

-- 1. PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. CLIENTES
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

-- 3. CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita', 'despesa')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. SUBCATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.financial_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. TIPOS DE ESCADA
CREATE TABLE IF NOT EXISTS public.stair_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. TAMANHOS DE ESCADA
CREATE TABLE IF NOT EXISTS public.stair_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  meters numeric(8,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. MATERIAIS
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. ORÇAMENTOS
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

-- 9. ITENS DO ORÇAMENTO
CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  material_name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0
);

-- 10. TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.financial_subcategories(id) ON DELETE SET NULL,
  description text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita', 'despesa')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS clients_user_name_idx ON public.clients(user_id, name);
CREATE INDEX IF NOT EXISTS budgets_user_created_idx ON public.budgets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS budget_items_budget_idx ON public.budget_items(budget_id);
CREATE INDEX IF NOT EXISTS financial_transactions_user_date_idx ON public.financial_transactions(user_id, occurred_on DESC);

-- ============================================================
-- SEGURANÇA (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stair_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stair_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Permissões para usuário autenticado
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.financial_categories, public.financial_subcategories, public.stair_types, public.stair_sizes, public.materials, public.budgets, public.budget_items, public.financial_transactions TO authenticated;

-- Remover acesso de visitantes anônimos
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- ============================================================
-- POLÍTICAS RLS (cada usuário só vê e edita seus próprios dados)
-- ============================================================

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','clients','financial_categories','financial_subcategories','stair_types','stair_sizes','materials','budgets','budget_items','financial_transactions']
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
      EXECUTE format('CREATE POLICY "insert_own_%1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND auth.uid() = id)', table_name);
      EXECUTE format('CREATE POLICY "update_own_%1$s" ON public.%1$s FOR UPDATE TO authenticated USING (auth.uid() = user_id AND auth.uid() = id) WITH CHECK (auth.uid() = user_id AND auth.uid() = id)', table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- POLÍTICAS ESPECIAIS (referências cruzadas entre tabelas)
-- ============================================================

-- Orçamentos só podem referenciar clientes/tipos/tamanhos do próprio usuário
DROP POLICY IF EXISTS "insert_own_budgets" ON public.budgets;
CREATE POLICY "insert_own_budgets" ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())
    AND (stair_type_id IS NULL OR EXISTS (SELECT 1 FROM public.stair_types t WHERE t.id = stair_type_id AND t.user_id = auth.uid()))
    AND (stair_size_id IS NULL OR EXISTS (SELECT 1 FROM public.stair_sizes s WHERE s.id = stair_size_id AND s.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_budgets" ON public.budgets;
CREATE POLICY "update_own_budgets" ON public.budgets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid())
    AND (stair_type_id IS NULL OR EXISTS (SELECT 1 FROM public.stair_types t WHERE t.id = stair_type_id AND t.user_id = auth.uid()))
    AND (stair_size_id IS NULL OR EXISTS (SELECT 1 FROM public.stair_sizes s WHERE s.id = stair_size_id AND s.user_id = auth.uid()))
  );

-- Itens do orçamento só podem referenciar orçamentos do próprio usuário
DROP POLICY IF EXISTS "insert_own_budget_items" ON public.budget_items;
CREATE POLICY "insert_own_budget_items" ON public.budget_items FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_id AND b.user_id = auth.uid())
    AND (material_id IS NULL OR EXISTS (SELECT 1 FROM public.materials m WHERE m.id = material_id AND m.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_budget_items" ON public.budget_items;
CREATE POLICY "update_own_budget_items" ON public.budget_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_id AND b.user_id = auth.uid())
    AND (material_id IS NULL OR EXISTS (SELECT 1 FROM public.materials m WHERE m.id = material_id AND m.user_id = auth.uid()))
  );

-- Transações financeiras só podem referenciar categorias do próprio usuário
DROP POLICY IF EXISTS "insert_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "insert_own_financial_transactions" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (category_id IS NULL OR EXISTS (SELECT 1 FROM public.financial_categories c WHERE c.id = category_id AND c.user_id = auth.uid()))
    AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.financial_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "update_own_financial_transactions" ON public.financial_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (category_id IS NULL OR EXISTS (SELECT 1 FROM public.financial_categories c WHERE c.id = category_id AND c.user_id = auth.uid()))
    AND (subcategory_id IS NULL OR EXISTS (SELECT 1 FROM public.financial_subcategories s WHERE s.id = subcategory_id AND s.user_id = auth.uid()))
  );

-- Subcategorias só podem referenciar categorias do próprio usuário
DROP POLICY IF EXISTS "insert_own_financial_subcategories" ON public.financial_subcategories;
CREATE POLICY "insert_own_financial_subcategories" ON public.financial_subcategories FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.financial_categories c WHERE c.id = category_id AND c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_financial_subcategories" ON public.financial_subcategories;
CREATE POLICY "update_own_financial_subcategories" ON public.financial_subcategories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.financial_categories c WHERE c.id = category_id AND c.user_id = auth.uid())
  );

-- ============================================================
-- FUNÇÃO DE NUMERAÇÃO AUTOMÁTICA DE ORÇAMENTOS
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_budget_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));

  IF NEW.quote_number IS NULL
     OR NEW.quote_number <= 0
     OR EXISTS (
       SELECT 1 FROM public.budgets b
       WHERE b.user_id = NEW.user_id AND b.quote_number = NEW.quote_number
     )
  THEN
    SELECT COALESCE(MAX(b.quote_number), 0) + 1
      INTO NEW.quote_number
      FROM public.budgets b
     WHERE b.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM anon;
REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM authenticated;

DROP TRIGGER IF EXISTS budgets_assign_quote_number ON public.budgets;
CREATE TRIGGER budgets_assign_quote_number
  BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.assign_budget_quote_number();

-- ============================================================
-- PRONTO! Todas as tabelas, segurança e funções foram criadas.
-- ============================================================
