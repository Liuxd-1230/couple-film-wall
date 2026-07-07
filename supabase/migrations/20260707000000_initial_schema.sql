create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的胶片册',
  start_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_color text not null default '#b96f5d',
  created_at timestamptz not null default now(),
  unique (couple_id, user_id),
  unique (user_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text not null default '',
  taken_at date not null default current_date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  mood text not null default '日常',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  date date not null,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists couple_members_user_id_idx on public.couple_members(user_id);
create index if not exists photos_couple_taken_idx on public.photos(couple_id, taken_at desc);
create index if not exists photos_user_id_idx on public.photos(user_id);
create index if not exists messages_couple_created_idx on public.messages(couple_id, created_at desc);
create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists anniversaries_couple_date_idx on public.anniversaries(couple_id, date);
create index if not exists anniversaries_created_by_idx on public.anniversaries(created_by);

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members member
    where member.couple_id = target_couple_id
      and member.user_id = (select auth.uid())
  );
$$;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.photos enable row level security;
alter table public.messages enable row level security;
alter table public.anniversaries enable row level security;

drop policy if exists "members can read their couple" on public.couples;
create policy "members can read their couple"
on public.couples
for select
to authenticated
using (public.is_couple_member(id));

drop policy if exists "members can update their couple" on public.couples;
create policy "members can update their couple"
on public.couples
for update
to authenticated
using (public.is_couple_member(id))
with check (public.is_couple_member(id));

drop policy if exists "users can read their own membership" on public.couple_members;
create policy "users can read their own membership"
on public.couple_members
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "members can read photos" on public.photos;
create policy "members can read photos"
on public.photos
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "members can insert own photos" on public.photos;
create policy "members can insert own photos"
on public.photos
for insert
to authenticated
with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can update own photos" on public.photos;
create policy "members can update own photos"
on public.photos
for update
to authenticated
using (public.is_couple_member(couple_id) and user_id = (select auth.uid()))
with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can delete own photos" on public.photos;
create policy "members can delete own photos"
on public.photos
for delete
to authenticated
using (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages"
on public.messages
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "members can insert own messages" on public.messages;
create policy "members can insert own messages"
on public.messages
for insert
to authenticated
with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can update own messages" on public.messages;
create policy "members can update own messages"
on public.messages
for update
to authenticated
using (public.is_couple_member(couple_id) and user_id = (select auth.uid()))
with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can delete own messages" on public.messages;
create policy "members can delete own messages"
on public.messages
for delete
to authenticated
using (public.is_couple_member(couple_id) and user_id = (select auth.uid()));

drop policy if exists "members can read anniversaries" on public.anniversaries;
create policy "members can read anniversaries"
on public.anniversaries
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "members can insert anniversaries" on public.anniversaries;
create policy "members can insert anniversaries"
on public.anniversaries
for insert
to authenticated
with check (public.is_couple_member(couple_id) and created_by = (select auth.uid()));

drop policy if exists "members can update anniversaries" on public.anniversaries;
create policy "members can update anniversaries"
on public.anniversaries
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

drop policy if exists "members can delete anniversaries" on public.anniversaries;
create policy "members can delete anniversaries"
on public.anniversaries
for delete
to authenticated
using (public.is_couple_member(couple_id));

grant usage on schema public to authenticated;
grant select, update on public.couples to authenticated;
grant select on public.couple_members to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.anniversaries to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-photos',
  'couple-photos',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members can read photo objects" on storage.objects;
create policy "members can read photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members can upload own photo objects" on storage.objects;
create policy "members can upload own photo objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "members can update own photo objects" on storage.objects;
create policy "members can update own photo objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "members can delete own photo objects" on storage.objects;
create policy "members can delete own photo objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'couple-photos'
  and public.is_couple_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
