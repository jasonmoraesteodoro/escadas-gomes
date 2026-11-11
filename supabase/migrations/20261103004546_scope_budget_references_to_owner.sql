/*
# Require quotes to reference the caller's own client, stair type and size

1. Security changes
- Recreate `insert_own_budgets` and `update_own_budgets` so `client_id`,
  `stair_type_id` and `stair_size_id` must point at rows owned by the
  signed-in user.
- Previously only `user_id` was checked, so a crafted request could bind a
  quote to another account's customer record.

2. Notes
- No data is read, changed or deleted.
- Clients, types and sizes offered in the interface are always the caller's
  own, so normal use is unaffected.
*/

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
