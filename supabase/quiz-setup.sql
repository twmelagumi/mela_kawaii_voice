-- 今日問答（quiz.html）：成績與全對排行榜
-- 在 Supabase SQL Editor 貼上整段執行一次即可（重複執行也沒關係）。
-- 需要先有 public.profiles（暱稱、頭像）。
--
-- 每人一列：最近一次的答對題數 correct／題庫題數 total，以及「全對過的最大題庫題數」perfect_total 和第一次達成的時間 perfect_at。
-- 只能透過 submit_quiz_score() 寫入（不開放直接 insert/update）；排行榜用 quiz_leaderboard() 讀（只回傳暱稱、頭像，不回傳 email 或使用者 ID）。

create table if not exists public.quiz_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  correct integer not null check (correct >= 0),
  total integer not null check (total between 1 and 1000),
  perfect_total integer check (perfect_total between 1 and 1000),
  perfect_at timestamptz,
  plays integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint quiz_scores_correct_le_total check (correct <= total)
);

alter table public.quiz_scores enable row level security;
revoke all on table public.quiz_scores from anon, authenticated;
grant select, delete on table public.quiz_scores to authenticated; -- 自己看自己的、「刪除雲端紀錄」時刪掉

drop policy if exists quiz_scores_select_own on public.quiz_scores;
create policy quiz_scores_select_own on public.quiz_scores
  for select to authenticated using (user_id = auth.uid());

drop policy if exists quiz_scores_delete_own on public.quiz_scores;
create policy quiz_scores_delete_own on public.quiz_scores
  for delete to authenticated using (user_id = auth.uid());

-- 上傳成績：答完整套題庫後由 quiz.html 呼叫
-- 全對時，如果題庫比以前全對過的還大，就更新 perfect_total 和 perfect_at；一樣大的再全對一次，保留第一次的時間
create or replace function public.submit_quiz_score(p_correct integer, p_total integer)
returns table (correct integer, total integer, perfect_total integer, perfect_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_correct is null or p_total is null or p_total < 1 or p_total > 1000 or p_correct < 0 or p_correct > p_total then
    raise exception 'bad score' using errcode = '22023';
  end if;

  insert into public.quiz_scores as s (user_id, correct, total, perfect_total, perfect_at, plays, updated_at)
  values (uid, p_correct, p_total,
          case when p_correct = p_total then p_total end,
          case when p_correct = p_total then now() end,
          1, now())
  on conflict (user_id) do update set
    correct = excluded.correct,
    total = excluded.total,
    plays = s.plays + 1,
    updated_at = now(),
    perfect_total = case when excluded.perfect_total > coalesce(s.perfect_total, 0) then excluded.perfect_total else s.perfect_total end,
    perfect_at    = case when excluded.perfect_total > coalesce(s.perfect_total, 0) then excluded.perfect_at    else s.perfect_at    end;

  return query
    select q.correct, q.total, q.perfect_total, q.perfect_at
    from public.quiz_scores q where q.user_id = uid;
end;
$$;

revoke all on function public.submit_quiz_score(integer, integer) from public, anon;
grant execute on function public.submit_quiz_score(integer, integer) to authenticated;

-- 全對排行榜：全對過的人，題庫越大的排越前面，一樣大的依達成時間先後
-- 沒登入也能看；只回傳名次、暱稱、頭像、全對的題數、達成時間、是不是自己
create or replace function public.quiz_leaderboard(p_limit integer default 100)
returns table (pos bigint, nickname text, avatar_url text, total integer, perfect_at timestamptz, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select row_number() over (order by s.perfect_total desc, s.perfect_at asc, s.user_id) as pos,
         p.nickname::text,
         p.avatar_url::text,
         s.perfect_total,
         s.perfect_at,
         coalesce(s.user_id = auth.uid(), false)
  from public.quiz_scores s
  left join public.profiles p on p.user_id = s.user_id
  where s.perfect_total is not null
  order by pos
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

revoke all on function public.quiz_leaderboard(integer) from public;
grant execute on function public.quiz_leaderboard(integer) to anon, authenticated;
