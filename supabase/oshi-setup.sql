-- 推し診斷（oshi.html）：每個登入使用者最近一次的診斷結果，以及結果分布統計
-- 在 Supabase SQL Editor 貼上整段執行一次即可（重複執行也沒關係）。
--
-- 每人一列，只存最近一次的結果（kyoko／mela／tsuzuri／sopia／box）和時間。
-- 只能透過 submit_oshi_result() 寫入；統計用 oshi_stats() 讀（只回傳各結果的人數，不回傳任何使用者資料）。

create table if not exists public.oshi_results (
  user_id uuid primary key references auth.users(id) on delete cascade,
  result text not null check (result in ('kyoko','mela','tsuzuri','sopia','box')),
  updated_at timestamptz not null default now()
);

alter table public.oshi_results enable row level security;
revoke all on table public.oshi_results from anon, authenticated;
grant select, delete on table public.oshi_results to authenticated; -- 自己看自己的、「刪除雲端紀錄」時刪掉

drop policy if exists oshi_results_select_own on public.oshi_results;
create policy oshi_results_select_own on public.oshi_results
  for select to authenticated using (user_id = auth.uid());

drop policy if exists oshi_results_delete_own on public.oshi_results;
create policy oshi_results_delete_own on public.oshi_results
  for delete to authenticated using (user_id = auth.uid());

-- 上傳結果：診斷完成時由 oshi.html 呼叫，覆蓋成最近一次的結果
create or replace function public.submit_oshi_result(p_result text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_result is null or p_result not in ('kyoko','mela','tsuzuri','sopia','box') then
    raise exception 'bad result' using errcode = '22023';
  end if;
  insert into public.oshi_results as o (user_id, result, updated_at)
  values (uid, p_result, now())
  on conflict (user_id) do update set result = excluded.result, updated_at = now();
end;
$$;

revoke all on function public.submit_oshi_result(text) from public, anon;
grant execute on function public.submit_oshi_result(text) to authenticated;

-- 結果分布：沒登入也能看；只回傳每個結果的人數
create or replace function public.oshi_stats()
returns table (result text, n bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select o.result, count(*) from public.oshi_results o group by o.result;
$$;

revoke all on function public.oshi_stats() from public;
grant execute on function public.oshi_stats() to anon, authenticated;
