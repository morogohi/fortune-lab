-- 운명 연구소 로그인 서버 (Supabase) 테이블 — SQL Editor에 그대로 붙여 넣고 Run (여러 번 실행해도 안전)
-- 저장하는 것: 회원(로그인 공급자 · 암호화한 닉네임 · 가입/접속 시각 · 가입 보너스 지급 시각), 게임 기록 요약(카르마·인생 수·연 콘텐츠)
-- 저장하지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·궁합 상대·상담 내용 (기기에만 보관)
-- 암호화: 닉네임은 pgcrypto(pgp_sym_encrypt, AES-256)로 암호화, 키는 Supabase Vault에만 보관 (DB 덤프만으로는 못 읽음)
--          공급자가 주는 이름·이메일·사진 주소는 auth.users.raw_user_meta_data 에서 평문을 지움 (아래 ③)

create extension if not exists pgcrypto with schema extensions;

-- ① 암호화 키 (Vault): 처음 한 번만 무작위 32바이트로 만듦. 키 값은 대시보드 Vault에서만 보이고 앱으로는 절대 내려가지 않음
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'member_enc_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'member_enc_key', '회원 닉네임 암호화 키 (운명 연구소)');
  end if;
end $$;

create table if not exists public.members (
  id            uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  provider      text,                       -- 'kakao' | 'google'
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
-- 예전 스키마(평문 nickname)에서 올라오는 경우: 암호화 열로 옮긴 뒤 평문 열 삭제
alter table public.members add column if not exists nickname_enc     bytea;
alter table public.members add column if not exists signup_bonus_at  timestamptz;
alter table public.members drop constraint if exists members_id_fkey;
alter table public.members add constraint members_id_fkey foreign key (id) references auth.users(id) on delete cascade deferrable initially deferred;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'nickname') then
    execute $q$update public.members set nickname_enc = extensions.pgp_sym_encrypt(nickname,
      (select decrypted_secret from vault.decrypted_secrets where name = 'member_enc_key'), 'cipher-algo=aes256') where nickname is not null$q$;
    alter table public.members drop column nickname;
  end if;
end $$;

-- 탈퇴 후 재가입으로 가입 보너스를 반복해 받지 못하게: 공급자 계정의 HMAC 해시만 보관 (원래 ID로 되돌릴 수 없음, 개인정보 아님에 가깝게)
create table if not exists public.signup_bonus_claims (
  id_hash     text primary key,
  claimed_at  timestamptz not null default now()
);
alter table public.signup_bonus_claims enable row level security;   -- 정책 없음 = 앱은 읽기·쓰기 불가 (서버 함수만)

create table if not exists public.game_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  karma       integer not null default 0 check (karma between 0 and 100000),
  lives       integer not null default 0 check (lives between 0 and 100000),
  updated_at  timestamptz not null default now()
);

-- 해제한 콘텐츠(상세 리포트·운명 조작 팩 등) 목록: 다른 기기·재설치 후 복원용. 개인정보 없음
alter table public.game_state add column if not exists unlocks jsonb not null default '{}'::jsonb;

-- 행 단위 보안: 로그인한 본인 행만 읽고 쓸 수 있음
alter table public.members    enable row level security;
alter table public.game_state enable row level security;

-- 회원 테이블: 앱은 직접 쓰지 못함 (가입 보너스 시각·암호문을 고칠 수 없게). 읽기도 막고 아래 함수로만 접근
drop policy if exists "본인만" on public.members;
revoke all on table public.members from anon, authenticated;

drop policy if exists "본인만" on public.game_state;
create policy "본인만" on public.game_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ② 키를 꺼내는 내부 함수 (앱에서 호출 불가)
create or replace function public._member_key() returns text
language sql security definer set search_path = '' stable as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'member_enc_key'
$$;
revoke all on function public._member_key() from public, anon, authenticated;

-- ③ 가입·로그인 때 공급자가 준 정보 처리: 닉네임은 암호화해 members 에 넣고, 이름·이메일·사진 주소 평문은 지움
--    (auth.users.email 열과 auth.identities 는 Supabase 로그인 동작에 필요해 Supabase가 관리 — 디스크 AES-256·전송 TLS)
create or replace function public._member_from_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); nk text;
begin
  nk := left(coalesce(m->>'nickname', m->>'name', m->>'full_name', m->>'preferred_username', m->>'user_name'), 40);
  insert into public.members (id, provider, nickname_enc)
    values (new.id, new.raw_app_meta_data->>'provider',
            case when nk is null then null else extensions.pgp_sym_encrypt(nk, public._member_key(), 'cipher-algo=aes256') end)
    on conflict (id) do update set
      provider = excluded.provider,
      nickname_enc = coalesce(excluded.nickname_enc, public.members.nickname_enc);
  new.raw_user_meta_data := m - array['name','full_name','nickname','preferred_username','user_name','email','email_verified',
                                      'picture','avatar_url','profile_image','thumbnail_image','phone','phone_verified','birthday','birthyear','gender','age_range'];
  return new;
end $$;
revoke all on function public._member_from_auth() from public, anon, authenticated;
drop trigger if exists member_from_auth on auth.users;
create trigger member_from_auth before insert or update of raw_user_meta_data on auth.users
  for each row execute function public._member_from_auth();

-- ④ 앱이 부르는 함수들 (모두 본인 것만)
create or replace function public.touch_member() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.members (id) values (auth.uid())
    on conflict (id) do update set last_seen_at = now();
end $$;

create or replace function public.my_nickname() returns text
language sql security definer set search_path = '' stable as $$
  select extensions.pgp_sym_decrypt(nickname_enc, public._member_key()) from public.members where id = auth.uid() and nickname_enc is not null
$$;

-- 회원가입 보너스: 계정당 1번만 true. 같은 카카오·구글 계정으로 탈퇴 후 재가입해도 false
create or replace function public.claim_signup_bonus() returns boolean
language plpgsql security definer set search_path = '' as $$
declare h text; n int;
begin
  if auth.uid() is null then return false; end if;
  select encode(extensions.hmac(i.provider || ':' || i.provider_id, public._member_key(), 'sha256'), 'hex') into h
    from auth.identities i where i.user_id = auth.uid() order by i.created_at limit 1;
  if h is null then return false; end if;
  insert into public.signup_bonus_claims (id_hash) values (h) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  insert into public.members (id, signup_bonus_at) values (auth.uid(), now())
    on conflict (id) do update set signup_bonus_at = now();
  return true;
end $$;

revoke all on function public.touch_member(), public.my_nickname(), public.claim_signup_bonus() from public, anon;
grant execute on function public.touch_member(), public.my_nickname(), public.claim_signup_bonus() to authenticated;

-- 회원 탈퇴: 본인 계정을 지우면 위 두 테이블도 함께 삭제(on delete cascade). 가입 보너스 해시(signup_bonus_claims)만 남음
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

-- ===== AI 사주상담: 하루 이용 횟수 (질문·답변 내용은 저장하지 않음) =====
create table if not exists public.counsel_usage (
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.counsel_usage enable row level security;
-- 앱(anon 키)은 직접 읽고 쓰지 않음 — Edge Function이 service role로만 기록

-- ===== 점검 쿼리 (설정 후 한 번 실행해 결과 확인) =====
-- 1) 평문 닉네임 열이 없어야 함 → 0행
--    select column_name from information_schema.columns where table_schema='public' and table_name='members' and column_name='nickname';
-- 2) 공급자 이름·이메일 평문이 메타데이터에 남지 않아야 함 → 0행
--    select id from auth.users where raw_user_meta_data ?| array['name','full_name','nickname','email','picture','avatar_url'];
-- 3) 암호문만 보여야 함 (\xc30d... 처럼)
--    select id, nickname_enc from public.members limit 3;
