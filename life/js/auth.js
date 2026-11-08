/* 로그인 (카카오 · 구글) — Supabase Auth
 * 서버로 보내는 것: 로그인 계정(공급자 고유 ID·닉네임), 게임 기록 요약(카르마·살아 본 인생 수)
 * 보내지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·궁합 상대 — 이런 정보는 기기에만 저장
 * 앱(Capacitor)에서는 구글이 앱 내 웹뷰 로그인을 막으므로 다음 버전에서 시스템 브라우저 방식으로 지원 */
window.Auth = (() => {
  const C = window.AUTH_CONFIG || {};
  const ready = () => !!(C.supabaseUrl && C.supabaseAnonKey);
  const native = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  let sb = null, user = null, loading = null, syncing = false;
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
        const was = user; user = session ? session.user : null; emit();
        if (ev === 'SIGNED_IN' && !was) { touch(); sync(); }
      });
      const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; emit();
      // 로그인 후 돌아온 주소(?code=...)를 깔끔하게 정리
      if (/[?&]code=/.test(location.search)) history.replaceState(history.state, '', location.pathname + location.hash);
      if (user) { touch(); sync(); }
      return sb;
    }).catch(() => { loading = null; return null; });
    return loading;
  }
  /* ---------- 테스트 계정 (웹 전용 · 서버 없이 기기에서 확인) ----------
   * 아이디 yangtest · 비밀번호는 코드에 해시로만 보관. 로그인하면 개인정보 양인석 프로필,
   * 유료 상품 전체 열람, 카르마·상담권 테스트 지급. 앱(스토어 빌드)에서는 열리지 않음. */
  const TEST = { id: 'yangtest', hash: 'f954cf0e0a8ba16f296702f44d3b51bc8c2c7fca8f1f366cfbe27dde02344e87', name: '양인석' };
  const TKEY = 'p8b_test_acct';
  const testOn = () => { if (native()) return false; try { return !!JSON.parse(localStorage.getItem(TKEY)); } catch (e) { return false; } };
  const TUSER = { id: 'test-yangtest', email: 'yangtest@test.local', user_metadata: { name: TEST.name }, app_metadata: { provider: 'test' } };
  async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function loginTest(id, pw) {
    if (native()) return { error: 'native' };
    if (String(id).trim().toLowerCase() !== TEST.id) return { error: 'id' };
    if (await sha('p8b-test|' + TEST.id + '|' + pw) !== TEST.hash) return { error: 'pw' };
    const first = !localStorage.getItem(TKEY + '_granted');
    localStorage.setItem(TKEY, JSON.stringify({ id: TEST.id, at: Date.now() }));
    if (first) localStorage.setItem(TKEY + '_granted', '1');
    emit(); return { ok: true, first };
  }
  const name = u => { const m = (u && u.user_metadata) || {}; return m.nickname || m.name || m.full_name || m.preferred_username || (u && u.email ? u.email.split('@')[0] : '회원'); };
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

  // 회원 정보(닉네임·공급자·마지막 접속)
  async function touch() {
    if (!user || !sb) return;
    try { await sb.from('members').upsert({ id: user.id, nickname: name(user), provider: provider(user), last_seen_at: new Date().toISOString() }); } catch (e) {}
  }
  // 게임 기록 동기화: 카르마는 큰 값, 인생 수는 큰 값으로 합침 (개인정보 없음)
  async function sync() {
    if (testOn()) { store.set('p8b_synced', Date.now()); return; }
    if (!user || !sb || syncing || typeof karma === 'undefined') return;
    syncing = true;
    try {
      const { data } = await sb.from('game_state').select('karma,lives').eq('user_id', user.id).maybeSingle();
      const lives = (typeof hist !== 'undefined' ? hist.length : 0);
      if (data && data.karma > karma) { karma = data.karma; saveMeta(); }
      await sb.from('game_state').upsert({ user_id: user.id, karma, lives: Math.max(lives, (data && data.lives) || 0), updated_at: new Date().toISOString() });
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
  return { ready, native, login, loginTest, isTest: testOn, logout, sync, deleteAccount, user: cur, name: () => name(cur()), provider: () => provider(cur()), avatar: () => avatar(cur()), on: f => subs.push(f), client };
})();
