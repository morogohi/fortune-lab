# 카카오 · 구글 로그인 서버 연결 (Supabase)

코드는 모두 준비돼 있고, 아래 계정·키만 만들어 `life/js/auth-config.js`의 두 값을 채우면 로그인이 열립니다.
값이 비어 있는 동안 로그인 버튼은 「준비 중」으로 보이고 나머지 기능은 그대로 동작합니다.

서버에 저장되는 것: 회원(로그인 공급자·닉네임), 게임 기록 요약(카르마·살아 본 인생 수)
서버에 저장하지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·입력 기록·궁합 상대 → 기기에만 보관

---

## 1. Supabase 프로젝트 (약 5분, 무료)
1. https://supabase.com → GitHub 계정(morogohi)으로 가입 → **New project**
   - Name: `fortune-lab` · Region: **Northeast Asia (Seoul)** · DB 비밀번호는 따로 보관
2. **SQL Editor** → `docs/supabase.sql` 내용 붙여 넣기 → **Run**
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
5. 카카오 로그인 → **동의항목**: 닉네임(profile_nickname)·프로필 사진(profile_image) 「필수 또는 선택 동의」
   - 이메일(account_email)은 비즈 앱만 가능 → 받지 않는다면 Supabase Kakao 설정에서 **Allow users without an email**을 켤 것
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

## 회원 탈퇴 · 정책
- 앱 설정 → 계정 → 회원 탈퇴 = `delete_my_account()` (계정·게임 기록 즉시 삭제). Google Play는 계정을 만드는 앱에 앱 안 탈퇴 기능을 요구합니다 — 충족.
- Play Console 데이터 보안: 「개인 식별자(사용자 ID)·이름(닉네임) 수집, 계정 관리 목적, 전송 중 암호화, 삭제 요청 가능」 추가 필요.
