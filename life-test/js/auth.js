/* =====================================================================
 *  auth.js — 로그인 없음 (기기 내 저장 서비스)
 *   이번 버전은 회원가입·로그인 없이 쓰는 서비스예요. 정보와 이용 기록은 현재 기기·브라우저에만 저장됩니다.
 *   다른 모듈이 부르는 Auth.* 호출이 그대로 동작하도록 같은 이름의 '아무 일도 하지 않는' 함수만 남김
 *   (로그인 SDK를 불러오거나 서버 세션 확인·주기 동기화·이벤트 구독을 하지 않음).
 *   예전 테스트 계정·로그인 세션 값(p8b_test_acct, p8b_auth …)은 지우지 않고 쓰지도 않음 — 저장 데이터 보존.
 * ===================================================================== */
window.Auth = (() => {
  const no = () => false, none = () => null, empty = () => '';
  return {
    ready: no,                 // 로그인 서버 없음
    native: () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()),
    user: none, isTest: no,
    name: empty, provider: empty, avatar: empty,
    login: async () => ({ error: 'disabled' }), loginTest: async () => ({ ok: false, error: 'disabled' }),
    logout: async () => { }, deleteAccount: async () => false,
    sync: () => { }, welcome: () => { },   // 서버 동기화 없음 (기기 저장만)
    on: () => { },                         // 로그인 상태 변화 없음
    client: async () => null,
  };
})();
