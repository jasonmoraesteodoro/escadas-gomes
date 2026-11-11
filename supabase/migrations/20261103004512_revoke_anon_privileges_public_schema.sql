/*
# Remove public visitor privileges from the application tables

1. Security changes
- Revoke all table privileges in the `public` schema from the `anon` role.
- Stop future tables in `public` from being granted to `anon` automatically.
- The application always operates with a signed-in session, so the `anon`
  role never needs access to these tables.

2. Notes
- No data is read, changed or deleted.
- `authenticated` grants are untouched, so the signed-in app keeps working.
*/

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
