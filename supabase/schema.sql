create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  approved_at timestamptz not null default now()
);

alter table public.memberships
  add column if not exists approved_at timestamptz not null default now();

alter table public.memberships
  add column if not exists expires_at timestamptz;

alter table public.memberships
  alter column expires_at drop not null;

alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;

drop policy if exists "Users can read their own membership" on public.memberships;
create policy "Users can read their own membership"
  on public.memberships
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.access_codes (
  code_hash bytea primary key,
  expires_at timestamptz not null,
  duration_months integer not null default 1,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.access_codes
  add column if not exists duration_months integer not null default 1;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
      where conname = 'access_codes_duration_months_check'
        and conrelid = 'public.access_codes'::regclass
  ) then
    alter table public.access_codes
      add constraint access_codes_duration_months_check
      check (duration_months in (1, 3, 5, 12));
  end if;
end;
$$;

alter table public.access_codes enable row level security;
revoke all on public.access_codes from public, anon, authenticated;

create or replace function public.create_access_code(p_duration_months integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if p_duration_months is null or p_duration_months not in (1, 3, 5, 12) then
    raise exception 'Duration must be 1, 3, 5, or 12 months.';
  end if;

  loop
    v_code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
    begin
      insert into public.access_codes (code_hash, expires_at, duration_months)
      values (extensions.digest(v_code, 'sha256'), now() + interval '7 days', p_duration_months);
      return v_code;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

create or replace function public.create_access_code()
returns text
language sql
security definer
set search_path = ''
as $$
  select public.create_access_code(1);
$$;

revoke all on function public.create_access_code(integer) from public, anon, authenticated;
grant execute on function public.create_access_code(integer) to service_role;
revoke all on function public.create_access_code() from public, anon, authenticated;
grant execute on function public.create_access_code() to service_role;

create or replace function public.redeem_access_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code_hash bytea;
  v_expires_at timestamptz;
  v_duration_months integer;
  v_redeemed_at timestamptz;
begin
  if v_user_id is null or p_code is null or length(trim(p_code)) = 0 then
    return false;
  end if;

  v_code_hash := extensions.digest(upper(trim(p_code)), 'sha256');

  select code.expires_at, code.duration_months, code.redeemed_at
    into v_expires_at, v_duration_months, v_redeemed_at
    from public.access_codes as code
    where code.code_hash = v_code_hash
    for update;

  if not found or v_redeemed_at is not null or v_expires_at <= now() then
    return false;
  end if;

  insert into public.memberships as existing_membership (user_id, approved_at, expires_at)
  values (
    v_user_id,
    now(),
    now() + make_interval(months => v_duration_months)
  )
  on conflict (user_id) do update
    set expires_at = greatest(coalesce(existing_membership.expires_at, now()), now())
          + make_interval(months => v_duration_months);

  update public.access_codes
    set redeemed_at = now(),
        redeemed_by = v_user_id
    where code_hash = v_code_hash;

  return true;
end;
$$;

revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

-- Private payment receipt storage. The first path segment is always the
-- authenticated user's UUID; no public URLs or cross-user access are allowed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set name = excluded.name,
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.receipt_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  object_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 5242880),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint receipt_submissions_user_path check (
    split_part(object_path, '/', 1) = user_id::text
    and split_part(object_path, '/', 2) <> ''
    and split_part(object_path, '/', 3) = ''
  )
);

create index if not exists receipt_submissions_user_created_idx
  on public.receipt_submissions (user_id, created_at desc);

alter table public.receipt_submissions enable row level security;
revoke all on public.receipt_submissions from public, anon, authenticated;
grant select on public.receipt_submissions to authenticated;
grant insert (user_id, object_path, content_type, file_size_bytes)
  on public.receipt_submissions to authenticated;

drop policy if exists "Users can read their own receipt submissions" on public.receipt_submissions;
create policy "Users can read their own receipt submissions"
  on public.receipt_submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can submit their own pending receipts" on public.receipt_submissions;
create policy "Users can submit their own pending receipts"
  on public.receipt_submissions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and split_part(object_path, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "Users can read their own payment receipt objects" on storage.objects;
create policy "Users can read their own payment receipt objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own payment receipt objects" on storage.objects;
create policy "Users can upload their own payment receipt objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can remove their own payment receipt objects" on storage.objects;
create policy "Users can remove their own payment receipt objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
