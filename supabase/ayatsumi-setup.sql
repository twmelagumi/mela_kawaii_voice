-- #あちちみて（首頁的貼文投稿區塊）：登入的人投稿 X（推特）貼文連結、其他人可以檢舉、管理員審核
-- 在 Supabase SQL Editor 貼上整段執行一次即可（重複執行也沒關係）。需要先執行過 admin-setup.sql（用到 profiles、admin_users）。
--
-- 規則（都在伺服器檢查，前端只是介面）：
--   * 只收 x.com／twitter.com 的貼文網址（…/帳號/status/數字），統一存成 https://x.com/帳號/status/數字；同一則貼文只能被投稿一次
--   * 每人每天最多 3 則（日本時間早上 5:00 換日，和每日簽到同一個算法；下架、刪除的也算）
--   * 檢舉：登入的人才能檢舉，每人每則只能檢舉一次、不能檢舉自己的；累積 3 個不同的人檢舉 → 先自動下架（status = hidden）
--   * 管理員（admin_users）可以在 admin.html 恢復（之後同一則不會再被自動下架）、永久刪除（removed，同一則也不能再被投稿）、停止某人的投稿權
--   * 資料表不直接開放寫入，一律走下面的函式；檢舉的紀錄只有管理員看得到

create table if not exists public.ayatsumi_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tweet_id text not null unique,
  handle text not null,
  url text not null,
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  report_count integer not null default 0,
  reviewed boolean not null default false,   -- 管理員恢復過 → 不會再被自動下架
  created_at timestamptz not null default now(),
  hidden_at timestamptz
);

create index if not exists ayatsumi_posts_status_created_idx on public.ayatsumi_posts (status, created_at desc);
create index if not exists ayatsumi_posts_user_created_idx on public.ayatsumi_posts (user_id, created_at desc);

create table if not exists public.ayatsumi_reports (
  post_id bigint not null references public.ayatsumi_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.ayatsumi_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ayatsumi_posts enable row level security;
alter table public.ayatsumi_reports enable row level security;
alter table public.ayatsumi_bans enable row level security;
revoke all on table public.ayatsumi_posts from anon, authenticated;
revoke all on table public.ayatsumi_reports from anon, authenticated;
revoke all on table public.ayatsumi_bans from anon, authenticated;
grant select, delete on table public.ayatsumi_posts to authenticated;   -- 自己看自己的、「刪除雲端紀錄」時刪掉
grant delete on table public.ayatsumi_reports to authenticated;          -- 「刪除雲端紀錄」時刪掉自己的檢舉

drop policy if exists ayatsumi_posts_select_own on public.ayatsumi_posts;
create policy ayatsumi_posts_select_own on public.ayatsumi_posts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists ayatsumi_posts_delete_own on public.ayatsumi_posts;
create policy ayatsumi_posts_delete_own on public.ayatsumi_posts
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists ayatsumi_reports_delete_own on public.ayatsumi_reports;
create policy ayatsumi_reports_delete_own on public.ayatsumi_reports
  for delete to authenticated using (user_id = auth.uid());

-- 投稿：回傳新貼文的 id。錯誤用訊息區分：bad_url／duplicate／limit／banned
create or replace function public.ayatsumi_submit(p_url text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  u text := btrim(coalesce(p_url, ''));
  m text[];
  n integer;
  new_id bigint;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.ayatsumi_bans b where b.user_id = uid) then
    raise exception 'banned' using errcode = '42501';
  end if;
  if length(u) > 300 then
    raise exception 'bad_url' using errcode = '22023';
  end if;
  m := regexp_match(u, '^https?://(?:www\.|mobile\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status/([0-9]{5,25})(?:[/?#].*)?$', 'i');
  if m is null then
    raise exception 'bad_url' using errcode = '22023';
  end if;

  select count(*) into n from public.ayatsumi_posts p
  where p.user_id = uid
    and ((p.created_at at time zone 'Asia/Tokyo') - interval '5 hours')::date
        = ((now() at time zone 'Asia/Tokyo') - interval '5 hours')::date;
  if n >= 3 then
    raise exception 'limit' using errcode = '54000';
  end if;

  insert into public.ayatsumi_posts (user_id, tweet_id, handle, url)
  values (uid, m[2], m[1], 'https://x.com/' || m[1] || '/status/' || m[2])
  on conflict (tweet_id) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'duplicate' using errcode = '23505';
  end if;
  return new_id;
end;
$$;

revoke all on function public.ayatsumi_submit(text) from public, anon;
grant execute on function public.ayatsumi_submit(text) to authenticated;

-- 公開清單：最近的（沒下架的）貼文。沒登入也能看；只回傳公開資訊（暱稱），不回傳投稿人的 id 或 email
create or replace function public.ayatsumi_list(p_limit integer default 5)
returns table (id bigint, handle text, tweet_id text, url text, nickname text, created_at timestamptz, is_mine boolean, reported boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.tweet_id, p.url, pr.nickname::text, p.created_at,
         coalesce(p.user_id = auth.uid(), false),
         exists (select 1 from public.ayatsumi_reports r where r.post_id = p.id and r.user_id = auth.uid())
  from public.ayatsumi_posts p
  left join public.profiles pr on pr.user_id = p.user_id
  where p.status = 'visible'
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 5), 1), 30);
$$;

revoke all on function public.ayatsumi_list(integer) from public;
grant execute on function public.ayatsumi_list(integer) to anon, authenticated;

-- 檢舉：回傳 ok（成功）或 already（已經檢舉過）。第 3 個不同的人檢舉時自動下架（管理員恢復過的不會再自動下架）
create or replace function public.ayatsumi_report(p_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  post_owner uuid;
  st text;
  rv boolean;
  ins integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select p.user_id, p.status, p.reviewed into post_owner, st, rv
  from public.ayatsumi_posts p where p.id = p_id for update;
  if not found or st <> 'visible' then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if post_owner = uid then
    raise exception 'own' using errcode = '22023';
  end if;
  insert into public.ayatsumi_reports (post_id, user_id) values (p_id, uid) on conflict do nothing;
  get diagnostics ins = row_count;
  if ins = 0 then
    return 'already';
  end if;
  update public.ayatsumi_posts p set
    report_count = p.report_count + 1,
    status = case when not p.reviewed and p.report_count + 1 >= 3 then 'hidden' else p.status end,
    hidden_at = case when not p.reviewed and p.report_count + 1 >= 3 then now() else p.hidden_at end
  where p.id = p_id;
  return 'ok';
end;
$$;

revoke all on function public.ayatsumi_report(bigint) from public, anon;
grant execute on function public.ayatsumi_report(bigint) to authenticated;

-- 刪除自己的投稿
create or replace function public.ayatsumi_delete_mine(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.ayatsumi_posts p where p.id = p_id and p.user_id = uid;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.ayatsumi_delete_mine(bigint) from public, anon;
grant execute on function public.ayatsumi_delete_mine(bigint) to authenticated;

-- ===== 管理員（admin.html）=====
-- 清單：預設只列被檢舉過或已下架／刪除的；p_all = true 列全部（最多 200 筆）
create or replace function public.admin_ayatsumi_list(p_all boolean default false)
returns table (
  id bigint, url text, handle text, status text, report_count integer, reviewed boolean,
  created_at timestamptz, user_id uuid, email text, nickname text, banned boolean
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
    select p.id, p.url, p.handle, p.status, p.report_count, p.reviewed, p.created_at,
           p.user_id, u.email::text, pr.nickname::text,
           exists (select 1 from public.ayatsumi_bans b where b.user_id = p.user_id)
    from public.ayatsumi_posts p
    join auth.users u on u.id = p.user_id
    left join public.profiles pr on pr.user_id = p.user_id
    where coalesce(p_all, false) or p.report_count > 0 or p.status <> 'visible'
    order by (p.status = 'hidden') desc, p.created_at desc
    limit 200;
end;
$$;

-- 改狀態：visible（恢復，之後不會再被自動下架）／hidden（下架）／removed（永久刪除，同一則貼文也不能再被投稿）
create or replace function public.admin_ayatsumi_set(p_id bigint, p_status text)
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
  if p_status is null or p_status not in ('visible','hidden','removed') then
    raise exception 'bad status' using errcode = '22023';
  end if;
  update public.ayatsumi_posts p set
    status = p_status,
    reviewed = case when p_status = 'visible' then true else p.reviewed end,
    hidden_at = case when p_status = 'visible' then null else coalesce(p.hidden_at, now()) end
  where p.id = p_id;
end;
$$;

-- 停止／恢復某位使用者的投稿權
create or replace function public.admin_ayatsumi_ban(p_user uuid, p_banned boolean)
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
  if coalesce(p_banned, false) then
    insert into public.ayatsumi_bans (user_id) values (p_user) on conflict do nothing;
  else
    delete from public.ayatsumi_bans b where b.user_id = p_user;
  end if;
end;
$$;

revoke all on function public.admin_ayatsumi_list(boolean) from public, anon;
revoke all on function public.admin_ayatsumi_set(bigint, text) from public, anon;
revoke all on function public.admin_ayatsumi_ban(uuid, boolean) from public, anon;
grant execute on function public.admin_ayatsumi_list(boolean) to authenticated;
grant execute on function public.admin_ayatsumi_set(bigint, text) to authenticated;
grant execute on function public.admin_ayatsumi_ban(uuid, boolean) to authenticated;
