-- 每日簽到（checkin.html）：每個登入使用者每天一筆簽到（選一個圖案），以及連續天數、各圖案人次統計
-- 在 Supabase SQL Editor 貼上整段執行一次即可（重複執行也沒關係）。
--
-- 「簽到日」由伺服器決定：日本時間早上 5:00 換日（現在時間 − 5 小時，再換成日本時間的日期）。
-- 不吃使用者手機的時間，所以改手機時間也沒用。
-- 每人每天只能一筆（主鍵 user_id + day），資料庫本身就擋重複。
-- 只能透過 checkin() 寫入；自己的紀錄用 checkin_me() 讀；統計用 checkin_stats() 讀（只回傳各圖案人次，不回傳任何使用者資料）。

create table if not exists public.checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  icon text not null check (icon in ('noja','egg','glass','face')),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists checkins_day_icon_idx on public.checkins (day, icon);

alter table public.checkins enable row level security;
revoke all on table public.checkins from anon, authenticated;
grant select, delete on table public.checkins to authenticated; -- 自己看自己的、「刪除雲端紀錄」時刪掉

drop policy if exists checkins_select_own on public.checkins;
create policy checkins_select_own on public.checkins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists checkins_delete_own on public.checkins;
create policy checkins_delete_own on public.checkins
  for delete to authenticated using (user_id = auth.uid());

-- 今天的「簽到日」（日本時間早上 5:00 換日）
create or replace function public.checkin_today()
returns date
language sql
stable
set search_path = ''
as $$
  select ((now() at time zone 'Asia/Tokyo') - interval '5 hours')::date;
$$;

revoke all on function public.checkin_today() from public;
grant execute on function public.checkin_today() to anon, authenticated;

-- 簽到：今天還沒簽到才會寫入，回傳 true；今天已經簽過就回傳 false（不會改掉原本選的圖案）
create or replace function public.checkin(p_icon text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_icon is null or p_icon not in ('noja','egg','glass','face') then
    raise exception 'bad icon' using errcode = '22023';
  end if;
  insert into public.checkins (user_id, day, icon)
  values (uid, public.checkin_today(), p_icon)
  on conflict (user_id, day) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.checkin(text) from public, anon;
grant execute on function public.checkin(text) to authenticated;

-- 我的簽到狀況：今天的簽到日、今天選的圖案、目前連續天數、最長連續天數、總簽到天數
-- 目前連續：從今天（今天還沒簽到就從昨天）往回算，中間沒斷的天數；昨天也沒簽就是 0。
create or replace function public.checkin_me()
returns table (today date, today_icon text, streak int, best int, total int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  td date := public.checkin_today();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  return query
  with d as (
    select c.day, c.day - (row_number() over (order by c.day))::int as g
    from public.checkins c where c.user_id = uid
  ),
  runs as (
    select count(*)::int as len, max(d.day) as last_day from d group by d.g
  )
  select
    td,
    (select c.icon from public.checkins c where c.user_id = uid and c.day = td),
    coalesce((select r.len from runs r where r.last_day >= td - 1 order by r.last_day desc limit 1), 0),
    coalesce((select max(r.len) from runs r), 0),
    coalesce((select sum(r.len)::int from runs r), 0);
end;
$$;

revoke all on function public.checkin_me() from public, anon;
grant execute on function public.checkin_me() to authenticated;

-- 各圖案的人次：今日（今天這個簽到日）和累計。沒登入也能看；只回傳數字
create or replace function public.checkin_stats()
returns table (icon text, today bigint, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.icon,
         count(*) filter (where c.day = public.checkin_today()),
         count(*)
  from public.checkins c group by c.icon;
$$;

revoke all on function public.checkin_stats() from public;
grant execute on function public.checkin_stats() to anon, authenticated;
