/* 로그인 · 회원가입 (카카오 · 구글) — Supabase Auth
 * 사주 개인정보(이름(별명)·생년월일·태어난 시간·성별·궁합 상대·입력 기록·상담 내용)는 절대 서버로 보내지 않음 — 기기에만 저장
 * 서버로 가는 것: 게임 기록 요약(카르마·인생 수·해제 목록)과 함수 호출뿐. 앱은 회원 테이블에 직접 쓰지 않음
 * 회원가입 정보(공급자 닉네임)는 서버 DB 함수가 받아 암호화(pgcrypto, 키는 Supabase Vault)해 저장하고 평문은 지움 — docs/supabase.sql
 * 🎉 회원가입 보너스: 서버 함수 claim_signup_bonus()가 계정당 1번만 true → 카르마 +200
 * 앱(Capacitor)에서는 구글이 앱 내 웹뷰 로그인을 막으므로 다음 버전에서 시스템 브라우저 방식으로 지원 */
window.Auth = (() => {
  const C = window.AUTH_CONFIG || {};
  const ready = () => !!(C.supabaseUrl && C.supabaseAnonKey);
  const native = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  let sb = null, user = null, loading = null, syncing = false, nick = '', welcoming = null;
  const subs = [];
  const emit = () => subs.forEach(f => { try { f(user || (testOn() ? TUSER : null)); } catch (e) {} });

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/supabase.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function client() {
    if (!ready()) return Promise.resolve(null);
    if (sb) return Promise.resolve(sb);
    if (loading) return loading;
    loading = loadLib().then(async () => {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'p8b_auth' } });
      sb.auth.onAuthStateChange((ev, session) => {
        const was = user; user = session ? session.user : null; if (!user) nick = ''; emit();
        if (ev === 'SIGNED_IN' && !was) welcome();
      });
      const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; emit();
      // 로그인 후 돌아온 주소(?code=...)를 깔끔하게 정리
      if (/[?&]code=/.test(location.search)) history.replaceState(history.state, '', location.pathname + location.hash);
      if (user) welcome();
      return sb;
    }).catch(() => { loading = null; return null; });
    return loading;
  }
  /* ---------- 테스트 계정 (웹 전용 · 서버 없이 기기에서 확인) ----------
   * 아이디 yangtest · 비밀번호는 코드에 해시로만 보관. 로그인하면 개인정보 양인석 프로필,
   * 유료 상품 전체 열람, 카르마 테스트 지급. 앱(스토어 빌드)에서는 열리지 않음. */
  const TEST = { id: 'yangtest', hash: 'f954cf0e0a8ba16f296702f44d3b51bc8c2c7fca8f1f366cfbe27dde02344e87', name: '양인석' };
  const TKEY = 'p8b_test_acct';
  const testOn = () => { if (native()) return false; try { return !!JSON.parse(localStorage.getItem(TKEY)); } catch (e) { return false; } };
  const TUSER = { id: 'test-yangtest', email: 'yangtest@test.local', user_metadata: { name: TEST.name }, app_metadata: { provider: 'test' } };
  async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function loginTest(id, pw) {
    if (native()) return { error: 'native' };
    const uid = String(id).trim().toLowerCase();
    // 테스트 페이지(life-test) 전용 간단 계정 1 / 1
    const quick = window.P8B_COMMERCIAL && uid === '1';
    if (!quick && uid !== TEST.id) return { error: 'id' };
    if (await sha('p8b-test|' + (quick ? '1' : TEST.id) + '|' + pw) !== (quick ? '20ec28ba28cbb2c16444111cdb88ca16b0515d5d52fce5ceac8eae50ed958289' : TEST.hash)) return { error: 'pw' };
    const first = !localStorage.getItem(TKEY + '_granted');
    localStorage.setItem(TKEY, JSON.stringify({ id: TEST.id, at: Date.now() }));
    if (first) localStorage.setItem(TKEY + '_granted', '1');
    // 테스트 계정도 첫 로그인 때 회원가입 보너스를 똑같이 받아 흐름을 확인 (서버 없이 기기에서만)
    if (first && SIGNUP() && typeof Karma !== 'undefined') Karma.add(SIGNUP(), '🎉 회원가입 보너스 (테스트 계정)', 'bonus');
    emit(); return { ok: true, first };
  }
  // 닉네임: 서버가 암호화해 둔 값을 본인만 복호화해 받아 화면에만 씀 (기기에 저장하지 않음)
  const name = u => { if (u && u === user && nick) return nick; const m = (u && u.user_metadata) || {}; return m.nickname || m.name || m.full_name || m.preferred_username || '회원'; };
  const provider = u => (u && u.app_metadata && u.app_metadata.provider) || '';
  const avatar = u => { const m = (u && u.user_metadata) || {}; return m.avatar_url || m.picture || ''; };

  async function login(p) {
    if (!ready()) return { error: 'not-configured' };
    if (native()) return { error: 'native' };
    const c = await client(); if (!c) return { error: 'load' };
    const { error } = await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: location.origin + location.pathname } });
    return { error: error && error.message };
  }
  async function logout() { if (testOn()) { localStorage.removeItem(TKEY); emit(); return; } const c = await client(); if (c) await c.auth.signOut(); user = null; emit(); }

  // 마지막 접속 시각만 갱신 (개인정보 전송 없음 — 닉네임 암호화 저장은 서버 트리거가 처리)
  async function touch() {
    if (!user || !sb) return;
    try { await sb.rpc('touch_member'); } catch (e) {}
    try { const { data } = await sb.rpc('my_nickname'); if (data) { nick = String(data).slice(0, 20); emit(); } } catch (e) {}
  }
  const SIGNUP = () => ((window.STORE_CONFIG || {}).signupBonus) || 0;
  // 회원가입 보너스: 서버가 '처음'이라고 답할 때만 지급 (실패·예전 서버면 아무것도 안 함)
  async function claimSignup() {
    if (!user || !sb || !SIGNUP() || typeof Karma === 'undefined') return false;
    try {
      const { data, error } = await sb.rpc('claim_signup_bonus');
      if (error || data !== true) return false;
      Karma.add(SIGNUP(), '🎉 회원가입 보너스', 'bonus'); return true;
    } catch (e) { return false; }
  }
  // 로그인 직후 한 번: 접속 기록 → 계정 카르마 합치기 → 가입 보너스 → 다시 저장
  function welcome() {
    if (welcoming) return welcoming;
    welcoming = (async () => { await touch(); await sync(); if (await claimSignup()) await sync(); })().finally(() => { welcoming = null; });
    return welcoming;
  }
  // 게임 기록 동기화: 카르마는 큰 값, 인생 수는 큰 값으로 합침 (개인정보 없음)
  async function sync() {
    if (testOn()) { store.set('p8b_synced', Date.now()); return; }
    if (!user || !sb || syncing || typeof karma === 'undefined') return;
    syncing = true;
    try {
      let { data, error } = await sb.from('game_state').select('karma,lives,unlocks').eq('user_id', user.id).maybeSingle();
      const hasU = !error;   // unlocks 열이 아직 없는 서버면 예전 방식으로
      if (error) ({ data } = await sb.from('game_state').select('karma,lives').eq('user_id', user.id).maybeSingle());
      const lives = (typeof hist !== 'undefined' ? hist.length : 0);
      if (data && data.karma > karma) { karma = data.karma; window.KREASON = '계정에서 복원'; saveMeta(); }
      // 해제 권한: 기기와 계정의 합집합 (다른 기기·재설치 후에도 복원)
      let un = {}; try { un = JSON.parse(localStorage.getItem('p8b_unlocks')) || {}; } catch (e) {}
      const srv = (data && data.unlocks) || {}; let got = 0;
      Object.keys(srv).forEach(k => { if (!un[k]) { un[k] = srv[k]; got++; } });
      if (got) { try { localStorage.setItem('p8b_unlocks', JSON.stringify(un)); } catch (e) {} if (typeof Store !== 'undefined') Store.notify(); }
      const row = { user_id: user.id, karma, lives: Math.max(lives, (data && data.lives) || 0), updated_at: new Date().toISOString() };
      if (hasU) row.unlocks = un;
      await sb.from('game_state').upsert(row);
      store.set('p8b_synced', Date.now()); emit();
    } catch (e) {}
    syncing = false;
  }
  // 탈퇴: 서버의 회원·게임 기록 삭제 후 로그아웃 (DB 함수 delete_my_account)
  async function deleteAccount() {
    const c = await client(); if (!c || !user) return false;
    try { const { error } = await c.rpc('delete_my_account'); if (error) return false; } catch (e) { return false; }
    await c.auth.signOut(); user = null; emit(); return true;
  }

  // 저장된 세션이 있거나 로그인에서 막 돌아왔으면 바로 연결
  if (ready() && (/[?&]code=/.test(location.search) || localStorage.getItem('p8b_auth'))) client();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sync(); });

  const cur = () => user || (testOn() ? TUSER : null);
  return { ready, native, login, loginTest, isTest: testOn, logout, sync, welcome, deleteAccount, user: cur, name: () => name(cur()), provider: () => provider(cur()), avatar: () => avatar(cur()), on: f => subs.push(f), client };
})();
