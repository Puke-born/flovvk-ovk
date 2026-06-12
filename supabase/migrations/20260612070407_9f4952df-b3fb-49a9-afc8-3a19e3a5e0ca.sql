
-- Roles enum for company members
create type public.company_role as enum ('owner', 'member');

-- COMPANIES
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

-- COMPANY MEMBERS
create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role public.company_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_id_idx on public.company_members(user_id);
grant select, insert, update, delete on public.company_members to authenticated;
grant all on public.company_members to service_role;
alter table public.company_members enable row level security;

-- Security-definer helpers (avoid recursive RLS)
create or replace function public.is_company_member(_user_id uuid, _company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where user_id = _user_id and company_id = _company_id
  )
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.company_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1
$$;

-- Policies: companies (a user can read companies they belong to)
create policy "members read own company"
  on public.companies for select to authenticated
  using (public.is_company_member(auth.uid(), id));

create policy "members update own company"
  on public.companies for update to authenticated
  using (public.is_company_member(auth.uid(), id))
  with check (public.is_company_member(auth.uid(), id));

-- Insert handled by signup trigger (service_role bypass). No INSERT policy.

-- Policies: company_members
create policy "see members of my company"
  on public.company_members for select to authenticated
  using (public.is_company_member(auth.uid(), company_id));

-- Inserts/updates/deletes on members handled by future invite flow (service_role); none for now.

-- SYNC ROWS: one table for all entity kinds
create table public.sync_rows (
  entity text not null,
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null,
  updated_by uuid,
  deleted_at bigint,
  server_updated_at timestamptz not null default now(),
  primary key (entity, id)
);
create index sync_rows_company_updated_idx
  on public.sync_rows(company_id, updated_at);
create index sync_rows_company_entity_updated_idx
  on public.sync_rows(company_id, entity, updated_at);
grant select, insert, update, delete on public.sync_rows to authenticated;
grant all on public.sync_rows to service_role;
alter table public.sync_rows enable row level security;

create policy "members read company rows"
  on public.sync_rows for select to authenticated
  using (public.is_company_member(auth.uid(), company_id));

create policy "members insert company rows"
  on public.sync_rows for insert to authenticated
  with check (public.is_company_member(auth.uid(), company_id));

create policy "members update company rows"
  on public.sync_rows for update to authenticated
  using (public.is_company_member(auth.uid(), company_id))
  with check (public.is_company_member(auth.uid(), company_id));

create policy "members delete company rows"
  on public.sync_rows for delete to authenticated
  using (public.is_company_member(auth.uid(), company_id));

-- Last-write-wins guard + server timestamp bump
create or replace function public.sync_rows_lww()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      -- Skip: keep the existing newer row
      return old;
    end if;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

create trigger sync_rows_lww_trg
before insert or update on public.sync_rows
for each row execute function public.sync_rows_lww();

-- Signup trigger: create a company + owner membership for every new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  company_name text;
begin
  company_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'company_name'), ''),
    'Mitt företag'
  );
  insert into public.companies (name, created_by)
  values (company_name, new.id)
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
