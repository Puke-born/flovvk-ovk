DROP TABLE IF EXISTS public.sync_rows CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_rows_lww() CASCADE;
DROP FUNCTION IF EXISTS public.is_company_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.current_company_id() CASCADE;

DROP TYPE IF EXISTS public.company_role;