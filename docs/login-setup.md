# 카카오 · 구글 로그인 서버 연결 (Supabase)

코드는 모두 준비돼 있고(테스트 페이지 `life-test/`), 아래 계정·키를 만든 뒤 `life-test/js/auth-config.js`의 두 값을 채우면 로그인이 열립니다.
값이 비어 있는 동안 로그인 버튼은 「준비 중」으로 보이고, 서버 통신 없이 나머지 기능은 그대로 동작합니다.

- 로그인은 **선택**입니다. 로그인하지 않아도 모든 기능을 씁니다.
- 서버에 저장: 로그인 공급자 계정(Supabase 인증), 카르마 잔액·살아 본 인생 수·연 콘텐츠 목록, 가입/접속 시각, 가입 보너스 지급 기록(공급자 ID 해시)
- 서버에 저장하지 않음: 이름(별명)·생년월일·태어난 시간·성별·궁합 상대·입력 기록·상담/검사 기록 → 기기에만

---

## 1. Supabase 프로젝트 (약 5분, 무료)
1. https://supabase.com → GitHub 계정(morogohi)으로 가입 → **New project**
   - Name: `fortune-lab` · Region: **Northeast Asia (Seoul)** · DB 비밀번호는 key_backup 폴더에 따로 보관
2. **SQL Editor** → `docs/supabase-login.sql` 내용 붙여 넣기 → **Run** (여러 번 실행해도 안전)
3. **Project Settings → API**에서 두 값 복사
   - Project URL → `supabaseUrl`
   - `anon` `public`(또는 publishable) key → `supabaseAnonKey` — 공개용 키라 저장소에 넣어도 됨
   - ⚠️ `service_role`(secret) 키는 절대 코드·채팅에 넣지 말 것
4. **Authentication → URL Configuration**
   - Site URL: `https://morogohi.github.io/fortune-lab/life-test/`
   - Redirect URLs에 추가: `https://morogohi.github.io/fortune-lab/life-test/` (운영 배포 때 `/life/`도 추가)
5. **Authentication → Providers**에서 Kakao·Google을 펼치면 보이는 **Callback URL**을 복사
   (`https://<프로젝트ID>.supabase.co/auth/v1/callback`) — 아래 2·3단계에 씀

## 2. 카카오 (Kakao Developers)
1. https://developers.kakao.com → 내 애플리케이션 → **애플리케이션 추가** (앱 이름 「운명 연구소」)
2. **앱 키 → REST API 키** → Supabase Kakao 설정의 **Client ID**
3. 카카오 로그인 → **활성화 ON**, **Redirect URI**에 1-5의 Callback URL 등록
4. 카카오 로그인 → 보안 → **Client Secret 생성 + 활성화** → Supabase Kakao의 **Client Secret** (Supabase 화면에만 입력)
5. 동의항목: 닉네임(profile_nickname)·프로필 사진(profile_image)
   - 이메일(account_email)은 비즈 앱만 가능 → 받지 않으면 Supabase Kakao 설정에서 **Allow users without an email** 켜기
6. 플랫폼 → Web 사이트 도메인: `https://morogohi.github.io`
7. Supabase → Authentication → Providers → **Kakao Enabled** → Save

## 3. 구글 (Google Cloud Console)
1. https://console.cloud.google.com → 새 프로젝트 「fortune-lab」
2. **Google 인증 플랫폼(OAuth 동의 화면)**: 외부 · 앱 이름 「운명 연구소」 · 지원 이메일
   - 승인된 도메인: `supabase.co`, `morogohi.github.io` · 개인정보처리방침: `https://morogohi.github.io/fortune-lab/life-test/privacy.html`
   - 범위는 기본(email·profile·openid)만 → 별도 검수 없이 게시 가능
3. **클라이언트 → 클라이언트 만들기 → 웹 애플리케이션**
   - 승인된 JavaScript 원본: `https://morogohi.github.io`
   - 승인된 리디렉션 URI: 1-5의 Callback URL
4. 클라이언트 ID·보안 비밀 → Supabase → Providers → **Google Enabled** → Save (보안 비밀은 Supabase 화면에만)
5. 동의 화면이 「테스트」 상태면 등록한 테스트 사용자만 로그인됨 → 공개 전 **앱 게시**

## 4. 사이트에 연결
`life-test/js/auth-config.js`
```js
window.AUTH_CONFIG = {
  supabaseUrl: 'https://<프로젝트ID>.supabase.co',
  supabaseAnonKey: '<anon public key>',
  providers: ['kakao', 'google'],
};
```
커밋·푸시(main) 후 1~2분 뒤 테스트 페이지 우측 상단 👤에서 로그인됩니다.
(Project URL과 anon key는 공개용이라 채팅으로 주시면 Claude가 넣고 배포할 수 있어요. Client Secret·service_role 키는 주지 마세요.)

## 5. 카르마 동기화 방식
- 처음 로그인한 기기: `link_device` → 계정 잔액 = max(계정, 기기). 연 콘텐츠는 합집합.
- 그 뒤: 기기는 **지난번 맞춘 뒤 늘거나 준 만큼(변화분)**만 `sync_state`로 보내고, 서버가 더한 잔액을 돌려받아 기기에 씀
  → 두 기기에서 동시에 받거나 써도 합산되고 중복 지급이 없음. 카르마를 받거나 쓰면 1.5초 뒤 자동 저장, 화면을 벗어날 때도 저장.
- 회원가입 보너스(`STORE_CONFIG.signupBonus`, 현재 100): `claim_signup_bonus`가 공급자 계정당 1번만 서버 잔액에 더함(서버 상한 100). 탈퇴 후 재가입해도 다시 주지 않음.
- 로그아웃·탈퇴해도 이 기기의 카르마는 그대로. 탈퇴 = `delete_my_account()`(계정·잔액 기록 즉시 삭제).
- ⚠️ 유료 출시 전: 변화분을 기기가 보내므로 기기 조작으로 늘린 카르마를 막지는 못합니다. 실제 결제 카르마는 스토어 영수증을 서버 함수에서 검증해 서버가 잔액을 더하는 방식으로 바꿔야 합니다.

## 6. 앱(안드로이드·iOS)은 다음 단계
구글은 앱 안의 웹뷰 로그인을 막습니다(disallowed_useragent). 앱은 시스템 브라우저로 로그인 후 딥링크로 돌아오는 방식
(@capacitor/browser + App URL 열기 + `com.morogohi.project8b://login` 리디렉션)이 필요해, 현재 앱에서는 로그인 버튼이
「다음 업데이트에서 지원」으로 표시됩니다. iOS 앱에 소셜 로그인을 넣으면 Apple 로그인도 함께 넣어야 합니다(App Store 심사 4.8).

## 회원 탈퇴 · 정책
- 👤 → 내 계정 → 회원 탈퇴. Google Play는 계정을 만드는 앱에 앱 안 탈퇴 기능을 요구합니다 — 충족.
- Play Console 데이터 보안: 「개인 식별자(사용자 ID)·이름(닉네임)·이메일(구글) 수집, 계정 관리 목적, 전송 중 암호화, 삭제 요청 가능」 추가 필요.

## AI 사주상담 서버 연결 (선택)

로그인 설정을 마친 뒤, AI 상담사 자연어 답변을 켜려면:

1. `docs/supabase.sql`의 `counsel_usage` 테이블을 SQL Editor에서 실행합니다.
2. Anthropic API 키를 비밀값으로 등록합니다: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   - 선택: `ANTHROPIC_MODEL`(기본 `claude-sonnet-5-5`), `COUNSEL_DAILY_LIMIT`(기본 5)
3. 배포합니다: `supabase functions deploy saju-counsel` (코드: `supabase/functions/saju-counsel/index.ts`)

앱은 이름·생년월일 없이 사주 요약(일간·오행·대운·좋은 달)·MBTI·나이대·고민·선택지·기기 안 계산 점수만 보냅니다.
서버는 질문과 답변을 저장하지 않고, 사용자별 하루 이용 횟수만 기록합니다.
연결 전에도 상담 자체(기기 안 계산)는 그대로 동작합니다.
