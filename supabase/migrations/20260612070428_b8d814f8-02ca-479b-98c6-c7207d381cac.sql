
-- Add search_path to trigger function
create or replace function public.sync_rows_lww()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return old;
    end if;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

-- Lock down security-definer helpers: only authenticated can call them
revoke execute on function public.is_company_member(uuid, uuid) from public, anon;
revoke execute on function public.current_company_id() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.is_company_member(uuid, uuid) to authenticated;
grant execute on function public.current_company_id() to authenticated;
