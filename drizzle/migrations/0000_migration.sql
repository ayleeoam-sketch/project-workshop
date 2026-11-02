
-- Roles
create type public.app_role as enum ('admin', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and status = 'active')
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin') and public.is_active_user(_user_id)
$$;

-- Public: lets the sign-in page know whether first-admin setup is still open.
create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "admin updates profiles" on public.profiles for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Signup handling: first account becomes admin; afterwards only admin-created accounts allowed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare has_admin boolean;
begin
  select exists (select 1 from public.user_roles where role = 'admin') into has_admin;
  if has_admin and coalesce(new.raw_app_meta_data->>'created_by_admin','false') <> 'true' then
    raise exception 'Public sign-up is disabled. Ask an administrator for an account.';
  end if;
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  insert into public.user_roles (user_id, role)
  values (new.id, case when has_admin then 'staff'::public.app_role else 'admin'::public.app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Templates
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  file_type text not null check (file_type in ('docx','pdf')),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  current_version int not null default 1,
  storage_path text not null,
  file_name text not null,
  extracted_text text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.templates to authenticated;
grant all on public.templates to service_role;
alter table public.templates enable row level security;

create table public.template_assignments (
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (template_id, user_id)
);
grant select, insert, delete on public.template_assignments to authenticated;
grant all on public.template_assignments to service_role;
alter table public.template_assignments enable row level security;

create or replace function public.can_use_template(_template_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(_user_id) or (
    public.is_active_user(_user_id) and exists (
      select 1 from public.templates t join public.template_assignments a on a.template_id = t.id
      where t.id = _template_id and a.user_id = _user_id and t.status = 'active'))
$$;

create policy "view usable templates" on public.templates for select to authenticated
  using (public.can_use_template(id, auth.uid()));
create policy "admin manages templates" on public.templates for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "view own assignments or admin" on public.template_assignments for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "admin manages assignments" on public.template_assignments for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','number','date','select','textarea')),
  required boolean not null default false,
  options text[] not null default '{}',
  sort_order int not null default 0,
  position jsonb,
  unique (template_id, key)
);
grant select, insert, update, delete on public.template_fields to authenticated;
grant all on public.template_fields to service_role;
alter table public.template_fields enable row level security;
create policy "view fields of usable templates" on public.template_fields for select to authenticated
  using (public.can_use_template(template_id, auth.uid()));
create policy "admin manages fields" on public.template_fields for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);
grant select, insert, delete on public.template_versions to authenticated;
grant all on public.template_versions to service_role;
alter table public.template_versions enable row level security;
create policy "admin manages versions" on public.template_versions for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Generated documents
create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.templates(id) on delete set null,
  template_name text not null default '',
  title text not null,
  format text not null check (format in ('docx','pdf')),
  storage_path text not null,
  batch_id uuid,
  generated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.generated_documents to authenticated;
grant all on public.generated_documents to service_role;
alter table public.generated_documents enable row level security;
create policy "own docs or admin" on public.generated_documents for select to authenticated
  using ((generated_by = auth.uid() and public.is_active_user(auth.uid())) or public.is_admin(auth.uid()));
create policy "insert own docs" on public.generated_documents for insert to authenticated
  with check (generated_by = auth.uid() and template_id is not null and public.can_use_template(template_id, auth.uid()));
create policy "admin deletes docs" on public.generated_documents for delete to authenticated
  using (public.is_admin(auth.uid()));

create table public.document_data (
  document_id uuid primary key references public.generated_documents(id) on delete cascade,
  data jsonb not null default '{}'
);
grant select, insert on public.document_data to authenticated;
grant all on public.document_data to service_role;
alter table public.document_data enable row level security;
create policy "view data of visible docs" on public.document_data for select to authenticated
  using (exists (select 1 from public.generated_documents d where d.id = document_id
    and ((d.generated_by = auth.uid() and public.is_active_user(auth.uid())) or public.is_admin(auth.uid()))));
create policy "insert data for own docs" on public.document_data for insert to authenticated
  with check (exists (select 1 from public.generated_documents d where d.id = document_id and d.generated_by = auth.uid()));

-- Activity logs (append-only)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null default auth.uid(),
  action text not null,
  entity_type text not null default '',
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
create policy "admin reads logs" on public.activity_logs for select to authenticated
  using (public.is_admin(auth.uid()));
create policy "log own actions" on public.activity_logs for insert to authenticated
  with check (actor_id = auth.uid() and public.is_active_user(auth.uid()));

-- Settings (single row)
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'AY-LEE INTEGRATED VENTURES',
  max_upload_mb int not null default 10 check (max_upload_mb between 1 and 50),
  updated_at timestamptz not null default now()
);
grant select, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "signed in reads settings" on public.app_settings for select to authenticated using (true);
create policy "admin updates settings" on public.app_settings for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
insert into public.app_settings (id) values (1);

-- Storage policies (buckets created separately, both private)
create policy "admin all template files" on storage.objects for all to authenticated
  using (bucket_id = 'templates' and public.is_admin(auth.uid()))
  with check (bucket_id = 'templates' and public.is_admin(auth.uid()));
create policy "assigned staff read template files" on storage.objects for select to authenticated
  using (bucket_id = 'templates' and public.can_use_template(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "upload own generated files" on storage.objects for insert to authenticated
  with check (bucket_id = 'generated' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user(auth.uid()));
create policy "read own generated or admin" on storage.objects for select to authenticated
  using (bucket_id = 'generated' and (((storage.foldername(name))[1] = auth.uid()::text and public.is_active_user(auth.uid())) or public.is_admin(auth.uid())));
create policy "admin delete generated" on storage.objects for delete to authenticated
  using (bucket_id = 'generated' and public.is_admin(auth.uid()));
