/*
# Create financial transactions for monthly reporting

1. New table
- `financial_transactions`: one income or expense entry per row.
- `id`: unique transaction identifier.
- `user_id`: owner, filled automatically from the signed-in user.
- `category_id`: optional category from the settings catalog.
- `subcategory_id`: optional subcategory from the settings catalog.
- `description`: short label shown in the financial table.
- `kind`: either `receita` or `despesa`.
- `amount`: positive monetary amount.
- `occurred_on`: date used to group and filter transactions by year and month.
- `created_at`: creation timestamp.

2. Security
- Enable row level security.
- Grant authenticated users CRUD access only to their own rows.
- Use separate policies for select, insert, update and delete.

3. Important notes
- This table records financial movements only; it does not change existing clients, budgets or catalog records.
- Amounts are stored as positive values and the interface calculates the balance as revenue minus expenses.
*/

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

CREATE INDEX IF NOT EXISTS financial_transactions_user_date_idx ON public.financial_transactions(user_id, occurred_on DESC);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;

DROP POLICY IF EXISTS "select_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "select_own_financial_transactions" ON public.financial_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "insert_own_financial_transactions" ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "update_own_financial_transactions" ON public.financial_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_financial_transactions" ON public.financial_transactions;
CREATE POLICY "delete_own_financial_transactions" ON public.financial_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);