/*
# Restrict execution of the quote numbering function

1. Security changes
- Revoke EXECUTE on `public.assign_budget_quote_number()` from PUBLIC, anon
  and authenticated, so it cannot be called directly through the API.
- The function keeps working because triggers execute regardless of EXECUTE
  privileges on the trigger function.

2. Notes
- No data is read, changed or deleted.
*/

REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM anon;
REVOKE ALL ON FUNCTION public.assign_budget_quote_number() FROM authenticated;
