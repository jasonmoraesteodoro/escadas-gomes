/*
# Serialize quote numbering per owner

1. Changed function
- `public.assign_budget_quote_number()` now takes a transaction-scoped
  advisory lock keyed on the owner before computing the next number, so two
  quotes created at the same moment receive consecutive numbers instead of
  one of them failing on the uniqueness constraint.

2. Security changes
- Unchanged: still SECURITY DEFINER with a fixed search_path and no EXECUTE
  for PUBLIC or anon.

3. Notes
- No data is read, changed or deleted.
*/

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
