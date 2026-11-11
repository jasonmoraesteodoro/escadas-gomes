/*
# Require quote line items to belong to a quote the caller owns

1. Security changes
- Recreate `insert_own_budget_items` and `update_own_budget_items` so the
  referenced `budget_id` must belong to the signed-in user, and the optional
  `material_id` must also be one of the caller's own materials.
- Previously only `user_id` was checked, so a crafted request could attach a
  line item to another account's quote.

2. Notes
- No data is read, changed or deleted.
- The application always creates line items for a quote it just created, so
  normal use is unaffected.
*/

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
