/*
# Bind profile rows to the signed-in account

1. Security changes
- Recreate the INSERT and UPDATE policies on `profiles` so the primary key `id`
  must equal the signed-in user's id, not only `user_id`.
- Prevents one account from inserting a profile row keyed on another account's
  user id, which previously blocked that account from ever saving its profile.

2. Notes
- No data is read, changed or deleted.
- The application already upserts `{ id: auth user id }`, so legitimate saves
  keep working unchanged.
*/

DROP POLICY IF EXISTS "insert_own_profiles" ON public.profiles;
CREATE POLICY "insert_own_profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profiles" ON public.profiles;
CREATE POLICY "update_own_profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND auth.uid() = id)
  WITH CHECK (auth.uid() = user_id AND auth.uid() = id);
