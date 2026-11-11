/*
# Assign quote numbers in the database

1. New function and trigger
- `public.assign_budget_quote_number()`: before a quote is inserted, sets its
  number to the owner's highest existing number plus one whenever the incoming
  number is missing, non-positive, or already used by that owner.
- Trigger `budgets_assign_quote_number` runs the function before every insert
  on `public.budgets`.

2. Security changes
- The function is SECURITY DEFINER with a fixed `search_path` and only ever
  looks at rows belonging to the row being inserted, so numbering cannot be
  forged from the browser and two simultaneous quotes cannot collide into a
  silently discarded insert.
- Execution is revoked from PUBLIC and anon; it is only reachable through the
  trigger.

3. Notes
- No existing data is read, changed or deleted.
- Quote numbers remain unique per owner and keep starting at 1.
*/

CREATE OR REPLACE FUNCTION public.assign_budget_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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

REVOKE EXECUTE ON FUNCTION public.assign_budget_quote_number() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS budgets_assign_quote_number ON public.budgets;
CREATE TRIGGER budgets_assign_quote_number
  BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.assign_budget_quote_number();
