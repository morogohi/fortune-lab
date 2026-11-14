# 카카오 · 구글 로그인 서버 연결 (Supabase)

코드는 모두 준비돼 있고, 아래 계정·키만 만들어 `life/js/auth-config.js`의 두 값을 채우면 로그인이 열립니다.
값이 비어 있는 동안 로그인 버튼은 「준비 중」으로 보이고 나머지 기능은 그대로 동작합니다.

서버에 저장되는 것: 회원(로그인 공급자 · **암호화한 닉네임** · 가입/접속 시각 · 가입 보너스 지급 시각), 게임 기록 요약(카르마·인생 수·연 콘텐츠)
서버에 저장하지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·입력 기록·궁합 상대·상담 내용 → 기기에만 보관

**개인정보 보호 구조 (docs/supabase.sql)**
- 앱은 `members` 테이블에 직접 읽고 쓰지 못합니다. 서버 함수(`touch_member`·`my_nickname`·`claim_signup_bonus`)만 부르며, 인자로 개인정보를 보내지 않습니다.
- 가입·로그인 때 DB 트리거가 공급자 닉네임을 **pgcrypto AES-256으로 암호화**해 `members.nickname_enc`에 넣고, `auth.users`의 이름·이메일·사진 주소 평문을 지웁니다. 암호화 키는 **Supabase Vault**(`member_enc_key`)에만 있습니다.
- 회원가입 보너스 200: `claim_signup_bonus()`가 계정당 1번만 true. 탈퇴 후 같은 카카오·구글 계정으로 재가입해도 다시 주지 않도록 공급자 계정의 HMAC 해시만 남깁니다.
- 남는 것: 구글 로그인 이메일은 `auth.users.email`에 Supabase가 보관(로그인 동작에 필요, 디스크 AES-256·TLS). 카카오는 이메일 동의항목을 켜지 않으면 받지 않습니다.
- 법적 기준 메모: 「개인정보의 안전성 확보조치 기준」상 저장 시 암호화가 의무인 것은 비밀번호·고유식별정보·계좌/카드번호·생체정보이고, 닉네임·이메일은 의무 대상은 아니지만 여기서는 닉네임까지 암호화합니다. 전송 구간은 HTTPS로 암호화됩니다. 출시 전 개인정보처리방침과 실제 설정이 같은지 한 번 더 확인하세요(법률 자문은 아님).

---

## 1. Supabase 프로젝트 (약 5분, 무료)
1. https://supabase.com → GitHub 계정(morogohi)으로 가입 → **New project**
   - Name: `fortune-lab` · Region: **Northeast Asia (Seoul)** · DB 비밀번호는 따로 보관
2. **SQL Editor** → `docs/supabase.sql` 내용 붙여 넣기 → **Run** → 파일 맨 아래 「점검 쿼리」 3개로 평문이 없는지 확인
   (Vault·pgcrypto는 Supabase에 기본 포함. 키는 처음 실행할 때 자동으로 만들어짐 — **키를 지우면 저장된 닉네임을 읽을 수 없게 되니 지우지 말 것**)
3. **Project Settings → API**에서 두 값 복사
   - Project URL → `supabaseUrl`
   - `anon` `public` key → `supabaseAnonKey` (공개용 키라 저장소에 넣어도 됨. `service_role` 키는 절대 넣지 말 것)
4. **Authentication → URL Configuration**
   - Site URL: `https://morogohi.github.io/fortune-lab/life/`
   - Redirect URLs에 추가: `https://morogohi.github.io/fortune-lab/life/`, `https://morogohi.github.io/fortune-lab/life-test/`
5. **Authentication → Providers**에서 Kakao·Google을 펼쳐 두면 보이는 **Callback URL**을 복사
   (`https://<프로젝트ID>.supabase.co/auth/v1/callback`) — 아래 2·3단계에 씀

## 2. 카카오 (Kakao Developers)
1. https://developers.kakao.com → 내 애플리케이션 → **애플리케이션 추가** (앱 이름 「운명 연구소」, 회사명 개인)
2. **앱 키**의 **REST API 키** → Supabase Kakao 설정의 **Client ID**
3. 카카오 로그인 → **활성화 ON**, **Redirect URI**에 1-5의 Callback URL 등록
4. 카카오 로그인 → 보안 → **Client Secret 코드 생성 + 활성화** → Supabase Kakao의 **Client Secret**
5. 카카오 로그인 → **동의항목**: 닉네임(profile_nickname)만 「필수 동의」 — 프로필 사진·이메일은 받지 않음(최소 수집)
   - Supabase Kakao 설정에서 **Allow users without an email**을 켤 것
6. 플랫폼 → Web 사이트 도메인: `https://morogohi.github.io`
7. Supabase → Authentication → Providers → **Kakao Enabled** → 키 입력 → Save

## 3. 구글 (Google Cloud Console)
1. https://console.cloud.google.com → 새 프로젝트 「fortune-lab」
2. **Google 인증 플랫폼(OAuth 동의 화면)**: 외부 · 앱 이름 「운명 연구소」 · 지원 이메일 morogohi@gmail.com
   - 승인된 도메인: `supabase.co`, `morogohi.github.io` · 개인정보처리방침 URL: `https://morogohi.github.io/fortune-lab/life/privacy.html`
   - 범위는 기본(email·profile·openid)만 → 별도 검수 없이 게시 가능
3. **클라이언트 → 클라이언트 만들기 → 웹 애플리케이션**
   - 승인된 JavaScript 원본: `https://morogohi.github.io`
   - 승인된 리디렉션 URI: 1-5의 Callback URL
4. 클라이언트 ID·보안 비밀 → Supabase → Providers → **Google Enabled** → Save
5. 동의 화면을 「테스트」 상태로 두면 등록한 테스트 계정만 로그인됨 → 공개 전 **앱 게시**

## 4. 사이트에 연결
`life/js/auth-config.js`
```js
window.AUTH_CONFIG = {
  supabaseUrl: 'https://<프로젝트ID>.supabase.co',
  supabaseAnonKey: '<anon public key>',
  providers: ['kakao', 'google'],
};
```
커밋·푸시하면 1~2분 뒤 https://morogohi.github.io/fortune-lab/life/ 우측 상단 👤에서 로그인됩니다.
(값을 채팅으로 주시면 Claude가 대신 넣고 배포할 수 있어요. anon key는 공개용이라 괜찮습니다.)

## 5. 앱(안드로이드·iOS)은 다음 단계
구글은 앱 안의 웹뷰 로그인을 막습니다(disallowed_useragent). 앱은 시스템 브라우저로 로그인 후 딥링크로 돌아오는 방식
(@capacitor/browser + App URL 열기 + `com.morogohi.project8b://login` 같은 리디렉션)이 필요해, 현재 앱에서는 로그인 버튼이
「다음 업데이트에서 지원」으로 표시됩니다. 웹 로그인이 확인되면 이어서 작업합니다.

## 카르마·해제 권한 복원 정책
- 로그인하면 `game_state`에 **카르마 잔액(큰 값 기준)·인생 수·해제한 콘텐츠 목록(`unlocks`)**만 올라갑니다. 이름·생년월일·궁합 상대는 올리지 않습니다.
- 다른 기기나 재설치 후 같은 계정으로 로그인하면 잔액과 해제 권한이 합쳐져 돌아옵니다. 로그인하지 않으면 이 기기에만 남습니다.
- 기존 서버는 `docs/supabase.sql`을 다시 실행하면 `unlocks` 열이 추가됩니다(실행 전에도 앱은 예전 방식으로 동작).
- ⚠️ 유료 출시 전: 지금은 기기가 잔액을 올리는 구조라 조작을 막지 못합니다. 실제 결제 카르마는 스토어 영수증을 서버 함수에서 검증한 뒤 서버가 잔액을 더하는 방식으로 바꿔야 합니다.

## 회원 탈퇴 · 정책
- 앱 설정 → 계정 → 회원 탈퇴 = `delete_my_account()` (계정·게임 기록 즉시 삭제). Google Play는 계정을 만드는 앱에 앱 안 탈퇴 기능을 요구합니다 — 충족.
- Play Console 데이터 보안: 「개인 식별자(사용자 ID)·이름(닉네임) 수집, 계정 관리 목적, 전송 중 암호화, 삭제 요청 가능」 추가 필요.

## AI 사주상담 서버 연결 (선택)

로그인 설정을 마친 뒤, AI 상담사 자연어 답변을 켜려면:

1. `docs/supabase.sql`의 `counsel_usage` 테이블을 SQL Editor에서 실행합니다.
2. Anthropic API 키를 비밀값으로 등록합니다: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   - 선택: `ANTHROPIC_MODEL`(기본 `claude-sonnet-5-5`), `COUNSEL_DAILY_LIMIT`(기본 5)
3. 배포합니다: `supabase functions deploy saju-counsel` (코드: `supabase/functions/saju-counsel/index.ts`)

AI 사주상담은 **대화형**이에요. 로그인한 사용자가 한 번 동의하면 질문마다 `mode: 'chat'`으로 최근 대화 12개와 사주 요약(일간·오행·대운·올해 흐름·좋은 달)·MBTI·나이대만 보내고, 이름·생년월일·태어난 시간은 보내지 않습니다.
앱은 질문 1개마다 카르마 10을 차감하고(처음 1개 무료), 서버는 하루 질문 수를 `COUNSEL_DAILY_LIMIT`(기본 30)로 제한합니다. 서버가 없거나 실패하면 기기 안 상담 엔진이 대신 답합니다.
서버는 질문과 답변을 저장하지 않고, 사용자별 하루 이용 횟수만 기록합니다.
연결 전에도 상담 자체(기기 안 계산)는 그대로 동작합니다.
