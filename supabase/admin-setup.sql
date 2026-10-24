-- Mela profile moderation and admin dashboard
-- Run once in Supabase SQL Editor. Replace the email in the final INSERT with
-- the Google account that should administer this site.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

alter table public.profiles
  add column if not exists nickname_banned boolean not null default false;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

create or replace function public.guard_profile_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  -- SQL Editor and trusted service-role operations have no end-user JWT.
  if actor is null then
    return new;
  end if;

  -- Admin actions go through the checked SECURITY DEFINER RPC below.
  if exists (select 1 from public.admin_users a where a.user_id = actor) then
    return new;
  end if;

  if new.user_id is distinct from actor then
    raise exception 'You can only edit your own profile' using errcode = '42501';
  end if;

  if new.nickname is not null and char_length(new.nickname) > 24 then
    raise exception 'Nickname is limited to 24 characters' using errcode = '22001';
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.upload_banned, false) or coalesce(new.nickname_banned, false) then
      raise exception 'Moderation flags are admin-only' using errcode = '42501';
    end if;
  else
    if new.upload_banned is distinct from old.upload_banned
       or new.nickname_banned is distinct from old.nickname_banned then
      raise exception 'Moderation flags are admin-only' using errcode = '42501';
    end if;
    if coalesce(old.upload_banned, false)
       and new.avatar_url is distinct from old.avatar_url then
      raise exception 'Avatar uploads are disabled for this account' using errcode = '42501';
    end if;
    if coalesce(old.nickname_banned, false)
       and new.nickname is distinct from old.nickname then
      raise exception 'Nickname changes are disabled for this account' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_moderation on public.profiles;
create trigger profiles_guard_moderation
before insert or update on public.profiles
for each row execute function public.guard_profile_moderation();

-- These restrictive policies keep existing permissive Storage policies in
-- place while ensuring uploads/updates stay in the user's own folder and
-- cannot bypass an admin's upload ban. Other buckets remain unaffected.
drop policy if exists avatars_moderation_insert on storage.objects;
create policy avatars_moderation_insert on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id <> 'avatars'
    or (
      name like auth.uid()::text || '/%'
      and not exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and coalesce(p.upload_banned, false)
      )
    )
  );

drop policy if exists avatars_moderation_update on storage.objects;
create policy avatars_moderation_update on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id <> 'avatars'
    or (
      name like auth.uid()::text || '/%'
      and not exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and coalesce(p.upload_banned, false)
      )
    )
  )
  with check (
    bucket_id <> 'avatars'
    or (
      name like auth.uid()::text || '/%'
      and not exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and coalesce(p.upload_banned, false)
      )
    )
  );

drop policy if exists avatars_admin_delete on storage.objects;
create policy avatars_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.is_site_admin());

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  nickname text,
  avatar_url text,
  upload_banned boolean,
  nickname_banned boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
    select u.id, u.email::text, p.nickname, p.avatar_url,
      coalesce(p.upload_banned, false), coalesce(p.nickname_banned, false), p.updated_at
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    order by coalesce(p.updated_at, u.created_at) desc nulls last;
end;
$$;

create or replace function public.admin_moderate_profile(
  target_user_id uuid,
  p_remove_nickname boolean default false,
  p_remove_avatar boolean default false,
  p_upload_banned boolean default null,
  p_nickname_banned boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.profiles (user_id, nickname, avatar_url, upload_banned, nickname_banned, updated_at)
  values (target_user_id, null, null, coalesce(p_upload_banned, false), coalesce(p_nickname_banned, false), now())
  on conflict (user_id) do update set
    nickname = case when p_remove_nickname then null else public.profiles.nickname end,
    avatar_url = case when p_remove_avatar then null else public.profiles.avatar_url end,
    upload_banned = coalesce(p_upload_banned, public.profiles.upload_banned),
    nickname_banned = coalesce(p_nickname_banned, public.profiles.nickname_banned),
    updated_at = now();

end;
$$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_moderate_profile(uuid, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_moderate_profile(uuid, boolean, boolean, boolean, boolean) to authenticated;

-- Replace this address, then run after the account has signed in to the site once:
insert into public.admin_users (user_id)
select id from auth.users where lower(email) = lower(NULL)
on conflict (user_id) do nothing;

-- Verify one administrator row was added before opening admin.html.
select a.user_id, u.email, a.created_at
from public.admin_users a join auth.users u on u.id = a.user_id;
