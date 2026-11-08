-- 운명 연구소 로그인 서버 (Supabase) 테이블 — SQL Editor에 그대로 붙여 넣고 Run
-- 저장하는 것: 회원(로그인 공급자·닉네임), 게임 기록 요약(카르마·살아 본 인생 수)
-- 저장하지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·궁합 상대 (기기에만 보관)

create table if not exists public.members (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text,
  provider      text,                       -- 'kakao' | 'google'
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create table if not exists public.game_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  karma       integer not null default 0 check (karma between 0 and 100000),
  lives       integer not null default 0 check (lives between 0 and 100000),
  updated_at  timestamptz not null default now()
);

-- 행 단위 보안: 로그인한 본인 행만 읽고 쓸 수 있음
alter table public.members    enable row level security;
alter table public.game_state enable row level security;

drop policy if exists "본인만" on public.members;
create policy "본인만" on public.members
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "본인만" on public.game_state;
create policy "본인만" on public.game_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 회원 탈퇴: 본인 계정을 지우면 위 두 테이블도 함께 삭제(on delete cascade)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
