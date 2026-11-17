-- 운명 연구소 로그인 서버 (Supabase) — SQL Editor에 그대로 붙여 넣고 Run (여러 번 실행해도 안전)
-- 저장하는 것: 로그인 공급자·가입/접속 시각, 카르마 잔액·살아 본 인생 수·연 콘텐츠 목록, (로그인 시) 기기에 저장된 정보 사본(user_data)

-- 앱(anon 키)은 테이블에 직접 쓰지 못하고, 아래 함수로만 바꿀 수 있음 (잔액은 서버가 계산)

create table if not exists public.members (
  id            uuid primary key references auth.users(id) on delete cascade,
  provider      text,
  bonus_at      timestamptz,                -- 회원가입 보너스 받은 시각 (계정당 1번)
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
alter table public.members add column if not exists bonus_at timestamptz;
alter table public.members drop column if exists nickname;   -- 닉네임은 서버 테이블에 따로 두지 않음

create table if not exists public.game_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  karma       integer not null default 0 check (karma between 0 and 100000),
  lives       integer not null default 0 check (lives between 0 and 100000),
  updated_at  timestamptz not null default now()
);
alter table public.game_state add column if not exists unlocks jsonb not null default '{}'::jsonb;

-- 회원가입 보너스를 한 번 받은 계정 (탈퇴 후 재가입해도 다시 주지 않도록 탈퇴와 무관하게 보관 — 개인정보 아님: 공급자 계정 ID의 해시만)
create table if not exists public.bonus_claims (
  sub_hash   text primary key,
  claimed_at timestamptz not null default now()
);

alter table public.members      enable row level security;
alter table public.game_state   enable row level security;
alter table public.bonus_claims enable row level security;   -- 정책 없음 = 앱에서 접근 불가

-- 본인 행 읽기만 허용 (쓰기는 함수로만)
drop policy if exists "본인만" on public.members;
drop policy if exists "본인 읽기" on public.members;
create policy "본인 읽기" on public.members for select to authenticated using (auth.uid() = id);
drop policy if exists "본인만" on public.game_state;
drop policy if exists "본인 읽기" on public.game_state;
create policy "본인 읽기" on public.game_state for select to authenticated using (auth.uid() = user_id);

-- 공급자 계정 ID 해시 (보너스 1회 확인용)
create or replace function public._sub_hash()
returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(coalesce(i.provider, '') || ':' || coalesce(i.provider_id, ''), 'sha256'), 'hex')
  from auth.identities i where i.user_id = auth.uid() order by i.created_at limit 1
$$;

-- 이 기기를 계정에 처음 연결: 카르마는 큰 값, 인생 수는 큰 값, 연 콘텐츠는 합집합
create or replace function public.link_device(p_karma int, p_lives int, p_unlocks jsonb)
returns public.game_state language plpgsql security definer set search_path = '' as $$
declare r public.game_state;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.members (id, provider) values (auth.uid(), (select raw_app_meta_data->>'provider' from auth.users where id = auth.uid()))
    on conflict (id) do update set last_seen_at = now();
  insert into public.game_state (user_id, karma, lives, unlocks)
    values (auth.uid(), least(greatest(coalesce(p_karma, 0), 0), 100000), least(greatest(coalesce(p_lives, 0), 0), 100000), coalesce(p_unlocks, '{}'::jsonb))
    on conflict (user_id) do update set
      karma = greatest(public.game_state.karma, excluded.karma),
      lives = greatest(public.game_state.lives, excluded.lives),
      unlocks = public.game_state.unlocks || excluded.unlocks,
      updated_at = now()
    returning * into r;
  return r;
end $$;

-- 연결된 기기의 변화분만 반영: 잔액 = 서버 잔액 + (기기에서 늘거나 준 만큼). 여러 기기가 써도 중복 지급 없음
create or replace function public.sync_state(p_delta int, p_lives int, p_unlocks jsonb)
returns public.game_state language plpgsql security definer set search_path = '' as $$
declare r public.game_state;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update public.members set last_seen_at = now() where id = auth.uid();
  update public.game_state set
      karma = least(greatest(karma + least(greatest(coalesce(p_delta, 0), -100000), 100000), 0), 100000),
      lives = greatest(lives, least(greatest(coalesce(p_lives, 0), 0), 100000)),
      unlocks = unlocks || coalesce(p_unlocks, '{}'::jsonb),
      updated_at = now()
    where user_id = auth.uid()
    returning * into r;
  if r.user_id is null then raise exception 'not linked'; end if;
  return r;
end $$;

-- 회원가입 보너스: 공급자 계정당 1번만 서버 잔액에 더함 (true = 이번에 지급)
create or replace function public.claim_signup_bonus(p_amount int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h text := public._sub_hash();
begin
  if auth.uid() is null or h is null then return false; end if;
  if coalesce(p_amount, 0) <= 0 or p_amount > 100 then return false; end if;   -- 앱이 큰 값을 보내도 최대 100
  insert into public.bonus_claims (sub_hash) values (h) on conflict do nothing;
  if not found then return false; end if;
  update public.members set bonus_at = now() where id = auth.uid();
  update public.game_state set karma = least(karma + p_amount, 100000), updated_at = now() where user_id = auth.uid();
  return true;
end $$;

-- 회원 탈퇴: 계정 삭제 → members·game_state 함께 삭제 (on delete cascade)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public._sub_hash() from public, anon, authenticated;
revoke all on function public.link_device(int, int, jsonb) from public, anon;
revoke all on function public.sync_state(int, int, jsonb) from public, anon;
revoke all on function public.claim_signup_bonus(int) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.link_device(int, int, jsonb) to authenticated;
grant execute on function public.sync_state(int, int, jsonb) to authenticated;
grant execute on function public.claim_signup_bonus(int) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ===================== 2026-11-18 추가: 기기 간 정보 동기화 (로그인한 경우) =====================
-- 로그인하면 이 기기에 저장된 정보(내 정보·궁합 상대·운세/타로/상담/검사 기록·게임 저장·출석 등)를 계정에 보관해
-- 어느 기기에서 로그인해도 같은 정보로 이어짐. 카르마 잔액·연 콘텐츠는 위의 함수(link_device·sync_state)로 따로 계산.
-- data = { "<저장 키>": { "v": "<값 문자열 또는 null(삭제)>", "t": <바뀐 시각 ms> } } — 키마다 더 최근 것이 이김
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,   -- 탈퇴하면 함께 삭제
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "본인 읽기" on public.user_data;
create policy "본인 읽기" on public.user_data for select to authenticated using (auth.uid() = user_id);

create or replace function public.merge_user_data(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cur jsonb; k text; v jsonb;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad data'; end if;
  if octet_length(p_data::text) > 3000000 then raise exception 'too large'; end if;
  insert into public.user_data(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select data into cur from public.user_data where user_id = auth.uid() for update;
  for k, v in select * from jsonb_each(p_data) loop
    if left(k, 4) = 'p8b_' and jsonb_typeof(v) = 'object'
       and (cur -> k is null or coalesce((v ->> 't')::bigint, 0) > coalesce((cur -> k ->> 't')::bigint, 0)) then
      cur := jsonb_set(cur, array[k], jsonb_build_object('v', v -> 'v', 't', coalesce((v ->> 't')::bigint, 0)), true);
    end if;
  end loop;
  if octet_length(cur::text) > 5000000 then raise exception 'too large'; end if;
  update public.user_data set data = cur, updated_at = now() where user_id = auth.uid();
  return cur;
end $$;
revoke all on function public.merge_user_data(jsonb) from public, anon;
grant execute on function public.merge_user_data(jsonb) to authenticated;
