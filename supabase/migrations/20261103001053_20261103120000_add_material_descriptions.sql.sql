/*
# Add material descriptions

1. Modified Tables
- `materials.description`: optional text shown in budget material details and PDF documents.

2. Security
- No access model changes. Existing owner-scoped RLS policies and authenticated grants remain in place.

3. Important Notes
- Existing material records keep an empty description and are not deleted or rewritten.
- The description is optional so current records remain valid.
*/

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';