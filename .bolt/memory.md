# Project memory

## Product intent & audience

- Construction management tool for professionals who need to manage clients, quotations, and finances.
- Core features: user authentication, client registration, financial tracking, category/material settings, quotation generator with PDF export.
- Supports a demo mode and a real (authenticated) mode backed by Supabase.

## Brand personality & voice

- Practical, direct, and supportive tone.
- Assistant communicates in Brazilian Portuguese (pt-BR) by default.
- Explanations are concise but reassuring; avoids unnecessary technical jargon unless needed.

## Visual design & UX direction

- Vite + React project using JSX, Tailwind CSS classes, React hooks, and Lucide React icons.
- Uses `@/` path alias mapping to `src/` for all project module imports.
- Avoids additional UI/theme/icon packages beyond the default stack unless explicitly requested.
- Design goal: beautiful, production-worthy, non-cookie-cutter UI.

## Decisions, constraints & rationale

- Supabase is the backend, fully integrated and verified working. Credentials updated to new publishable key format (`sb_publishable_…`).
- Database tables (English names) confirmed created with RLS active: `clients`, `budgets`, `budget_items`, `stair_types`, `stair_sizes`, `materials`, `financial_transactions`, `financial_categories`, `financial_subcategories`, `profiles`.
- Financial tracking is more granular than initially assumed: supports categories and subcategories (two separate tables).
- RLS enforced so each user can only access and edit their own data.
- No additional setup required to go live; creating an account switches from demo data to real persisted data.
- Domain is staircase construction (stair_types, stair_sizes), indicating specialized quotation logic for stairs.
- Build passes with current Supabase key configuration.

## Open questions & assumptions

- Assumption: PDF export relies on a library already present or to be added when quotation generation is exercised.
- Assumption: materials and stair_types/stair_sizes are user-configurable via settings screens.
- Unconfirmed: whether multi-user collaboration or role-based access beyond single-user ownership is needed.
- Unconfirmed: whether the Supabase project environment (dev/staging/prod URLs) needs separation.