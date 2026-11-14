/* 로그인 서버(Supabase) 설정 — docs/login-setup.md 순서대로 프로젝트를 만든 뒤 두 값을 채우세요.
 * anon key는 공개용 키라 이 파일에 넣어도 됩니다 (데이터는 DB의 행 단위 보안 규칙으로 보호).
 * 비어 있으면 로그인 버튼은 '준비 중'으로 표시되고, 나머지 기능은 그대로 동작합니다. */
window.AUTH_CONFIG = {
  supabaseUrl: '',        // 예: 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',    // 예: 'eyJhbGciOiJIUzI1NiIs...'
  providers: ['kakao', 'google'],
};
