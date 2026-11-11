/*
# Require money entries to reference the caller's own categories

1. Security changes
- Recreate `insert_own_financial_transactions` and
  `update_own_financial_transactions` so `category_id` and `subcategory_id`,
  when provided, must belong to the signed-in user.
- Also scope `financial_subcategories` writes to a parent category the caller
  owns.

2. Notes
- No data is read, changed or deleted.
- Categories offered in the interface are always the caller's own, so normal
  use is unaffected.
*/

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
