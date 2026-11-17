/* =====================================================================
 *  auth.js — 카카오 · 구글 로그인 (Supabase Auth) · 선택 사항
 *   로그인하지 않아도 모든 기능은 지금처럼 기기 안에서 동작해요.
 *   로그인하면 서버에 올라가는 것: 카르마 잔액 · 살아 본 인생 수 · 연 콘텐츠 목록(p8b_unlocks)뿐
 *   서버로 보내지 않는 것: 이름(별명)·생년월일·태어난 시간·성별·궁합 상대·상담/검사 기록 → 기기에만 저장
 *   잔액은 서버 함수(docs/supabase-login.sql)가 계산 — 기기는 '변화분'만 보내 여러 기기에서도 중복 지급이 없음
 *   설정(auth-config.js)이 비어 있으면 로그인 버튼은 '준비 중'으로 보이고 아무 통신도 하지 않음
 *   앱(안드로이드): 구글이 앱 내 웹뷰 로그인을 막으므로 시스템 브라우저(Custom Tabs, @capacitor/browser)로 로그인하고
 *     딥링크 com.morogohi.project8b://login 으로 돌아와 PKCE 코드를 세션으로 바꿈 (@capacitor/app appUrlOpen)
 *     Supabase 대시보드 › Authentication › URL Configuration › Redirect URLs 에 이 주소가 있어야 함
 *   iOS 앱은 아직 로그인 미지원(버튼 숨김)
 * ===================================================================== */
window.Auth = (() => {
  const C = window.AUTH_CONFIG || {};
  const ready = () => !!(C.supabaseUrl && C.supabaseAnonKey);
  const native = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const plug = n => (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins[n]) || null;
  // 앱 로그인: 안드로이드 + 브라우저·앱 플러그인이 있을 때만 (iOS·구버전 앱은 숨김)
  const appLogin = () => native() && Capacitor.getPlatform() === 'android' && !!(plug('Browser') && plug('App'));
  const canLogin = () => ready() && (!native() || appLogin());
  const APP_REDIRECT = 'com.morogohi.project8b://login';
  const LKEY = 'p8b_klink';          // { uid, base } : 이 기기가 연결된 계정과 마지막으로 맞춘 잔액
  let sb = null, user = null, loading = null, syncing = null, again = false, timer = 0, welcoming = null;
  const subs = [];
  const emit = () => subs.forEach(f => { try { f(user); } catch (e) { } });
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'lib/supabase.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function client() {
    if (!canLogin()) return Promise.resolve(null);
    if (sb) return Promise.resolve(sb);
    if (loading) return loading;
    loading = loadLib().then(async () => {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: !native(), flowType: 'pkce', storageKey: 'p8b_auth' } });
      sb.auth.onAuthStateChange((ev, session) => {
        const was = user; user = session ? session.user : null; emit();
        if (user && (!was || was.id !== user.id)) welcome();
      });
      const { data } = await sb.auth.getSession(); user = data.session ? data.session.user : null; emit();
      // 로그인 후 돌아온 주소(?code=...)를 깔끔하게 정리
      if (/[?&]code=/.test(location.search)) history.replaceState(history.state, '', location.pathname + location.hash);
      if (user) welcome();
      return sb;
    }).catch(() => { loading = null; sb = null; return null; });
    return loading;
  }

  const name = u => { const m = (u && u.user_metadata) || {}; return String(m.nickname || m.name || m.full_name || m.preferred_username || '회원').slice(0, 20); };
  const provider = u => (u && u.app_metadata && u.app_metadata.provider) || '';
  const avatar = u => { const m = (u && u.user_metadata) || {}; const a = m.avatar_url || m.picture || ''; return /^https:\/\//.test(a) ? a : ''; };

  async function login(p) {
    if (!ready()) return { error: 'not-configured' };
    if (native() && !appLogin()) return { error: 'native' };
    const c = await client(); if (!c) return { error: 'load' };
    if (native()) {
      // 앱: 로그인 주소만 받아서 시스템 브라우저로 열고, 딥링크로 돌아오면 onAppUrl 이 세션을 만듦
      const { data, error } = await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: APP_REDIRECT, skipBrowserRedirect: true } });
      if (error || !data || !data.url) return { error: (error && error.message) || 'no-url' };
      try { await plug('Browser').open({ url: data.url, presentationStyle: 'popover' }); } catch (e) { return { error: 'browser' }; }
      return {};
    }
    const { error } = await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: location.origin + location.pathname } });
    return { error: error && error.message };
  }
  // 앱: 로그인 후 com.morogohi.project8b://login?code=... 로 돌아옴 → 코드를 세션으로 교환
  async function onAppUrl(url) {
    if (!url || url.indexOf(APP_REDIRECT) !== 0) return;
    try { const B = plug('Browser'); if (B && B.close) B.close().catch(() => { }); } catch (e) { }
    const q = new URLSearchParams((url.split('?')[1] || '').split('#')[0]), h = new URLSearchParams(url.split('#')[1] || '');
    const toast = t => setTimeout(() => { if (typeof Hub !== 'undefined' && Hub.toast) Hub.toast(t); }, 300);
    const err = q.get('error') || h.get('error');
    if (err) { toast(/access_denied|cancel/i.test(err + (q.get('error_description') || '')) ? '로그인을 취소했어요' : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요'); return; }
    const code = q.get('code'); if (!code) return;
    const c = await client(); if (!c) return;
    const { error } = await c.auth.exchangeCodeForSession(code);
    if (error) { toast('로그인하지 못했어요. 다시 시도해 주세요'); return; }
    toast('로그인했어요');
  }
  if (appLogin()) {
    try { plug('App').addListener('appUrlOpen', e => onAppUrl(e && e.url)); } catch (e) { }
    // 앱이 꺼진 상태에서 딥링크로 켜진 경우
    try { plug('App').getLaunchUrl().then(r => r && r.url && onAppUrl(r.url)).catch(() => { }); } catch (e) { }
  }
  async function logout() {
    clearTimeout(timer); if (syncing) await syncing.catch(() => { });
    await flush();                                   // 나가기 전 마지막 변화분 저장
    const c = await client(); if (c) await c.auth.signOut();
    user = null; emit();
  }

  /* ---------- 카르마 · 연 콘텐츠 동기화 ----------
   * 처음 연결: link_device(기기 잔액) → 서버 = max(서버, 기기)
   * 이후:      sync_state(기기 잔액 − 지난번 맞춘 잔액) → 서버가 더해 새 잔액을 돌려줌 → 기기 잔액 = 서버 잔액 */
  const lives = () => (typeof hist !== 'undefined' && hist && hist.length) || 0;
  const curKarma = () => (typeof karma !== 'undefined' ? karma : 0);
  let applying = false;               // 계정 값으로 맞추는 중에는 다시 동기화를 예약하지 않음
  // 서버 잔액 r.karma 에, 보내는 사이 기기에서 더 바뀐 만큼(extra)을 얹어 기기 잔액으로 삼음
  function applyRow(r, extra) {
    if (!r || typeof r.karma !== 'number') return false;
    const target = Math.max(0, r.karma + (extra || 0));
    applying = true;
    try { if (typeof karma !== 'undefined' && karma !== target) { karma = target; window.KREASON = '계정과 맞춤'; window.KCAT = 'sync'; if (typeof saveMeta === 'function' && saveMeta() === false) return false; } } finally { applying = false; }
    // 연 콘텐츠: 기기와 계정의 합집합
    const un = jget('p8b_unlocks', {}), srv = r.unlocks || {}; let got = 0;
    Object.keys(srv).forEach(k => { if (!un[k]) { un[k] = srv[k]; got++; } });
    if (got) jset('p8b_unlocks', un);
    jset(LKEY, { uid: user.id, base: r.karma });
    jset('p8b_synced', Date.now());
    applying = true; try { if (typeof Store !== 'undefined' && Store.notify) Store.notify(); } finally { applying = false; }
    return true;
  }
  async function flush() {
    if (!user || !sb || typeof karma === 'undefined') return false;
    if (typeof syncMeta === 'function') syncMeta(false);                 // 다른 탭에서 바뀐 잔액 먼저 반영
    const link = jget(LKEY, null), k = curKarma(), un = jget('p8b_unlocks', {});
    try {
      const linked = !!(link && link.uid === user.id);
      const { data, error } = linked
        ? await sb.rpc('sync_state', { p_delta: k - (+link.base || 0), p_lives: lives(), p_unlocks: un })
        // 이 기기가 다른 계정에 연결돼 있었다면(계정 바꿔 로그인) 기기 잔액은 이전 계정 몫 → 새 계정에 복사하지 않음
        : await sb.rpc('link_device', { p_karma: (link && link.uid && link.uid !== user.id) ? 0 : k, p_lives: lives(), p_unlocks: un });
      if (error) { if (linked && /not linked/.test(error.message || '')) { try { localStorage.removeItem(LKEY); } catch (e) { } again = true; } return false; }
      const r = Array.isArray(data) ? data[0] : data; if (!r) return false;
      const extra = curKarma() - k;                // 보내는 사이 기기에서 또 바뀐 만큼 → 다음 번에 보냄
      const ok = applyRow(r, extra); if (extra) again = true;
      emit(); return ok;
    } catch (e) { return false; }
  }
  function sync(soon) {
    if (!user || !sb) return Promise.resolve(false);
    clearTimeout(timer);
    if (soon) { timer = setTimeout(() => sync(), 1500); return Promise.resolve(true); }   // 연속으로 쓸 때는 모아서 한 번
    if (syncing) { again = true; return syncing; }
    syncing = (async () => { let ok; do { again = false; ok = await flush(); } while (again); return ok; })().finally(() => { syncing = null; });
    return syncing;
  }
  const SIGNUP = () => ((window.STORE_CONFIG || {}).signupBonus) || 0;
  // 로그인 직후 한 번: 기기 연결 → 가입 보너스(서버가 계정당 1번만 지급) → 다시 맞춤
  function welcome() {
    if (welcoming) return welcoming;
    welcoming = (async () => {
      await sync();
      if (!user || !SIGNUP()) return;
      try {
        const { data } = await sb.rpc('claim_signup_bonus', { p_amount: SIGNUP() });
        if (data === true) { await sync(); if (typeof Hub !== 'undefined') Hub.toast(`🎉 회원가입 보너스 · 카르마 +${SIGNUP()}`); }
      } catch (e) { }
    })().finally(() => { welcoming = null; });
    return welcoming;
  }
  // 탈퇴: 서버의 계정·카르마 기록 삭제 후 로그아웃 (기기의 정보·카르마는 그대로)
  async function deleteAccount() {
    const c = await client(); if (!c || !user) return false;
    try { const { error } = await c.rpc('delete_my_account'); if (error) return false; } catch (e) { return false; }
    try { localStorage.removeItem(LKEY); } catch (e) { }
    try { await c.auth.signOut(); } catch (e) { }
    user = null; emit(); return true;
  }

  // 저장된 세션이 있거나 로그인에서 막 돌아왔으면 바로 연결 (그 외에는 SDK도 불러오지 않음)
  if (canLogin() && ((!native() && /[?&]code=/.test(location.search)) || localStorage.getItem('p8b_auth'))) client();
  // 로그인 취소·실패로 돌아온 경우(?error=...): 주소를 정리하고 짧게 안내
  if (/[?&#]error=/.test(location.search + location.hash)) {
    const cancel = /access_denied|cancel/i.test(location.search + location.hash);
    history.replaceState(history.state, '', location.pathname);
    setTimeout(() => { if (typeof Hub !== 'undefined' && Hub.toast) Hub.toast(cancel ? '로그인을 취소했어요' : '로그인하지 못했어요. 잠시 후 다시 시도해 주세요'); }, 800);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sync(); });
  // 카르마 저장(받기·쓰기·충전·게임)과 콘텐츠 열기 뒤에 자동으로 계정에 반영 (로그인했을 때만, 1.5초 모아서)
  window.onMetaSaved = () => { if (user && !applying) sync(true); };   // game.js saveMeta 저장 성공 후 호출
  if (typeof Store !== 'undefined' && Store.onChange) Store.onChange(() => { if (user && !applying) sync(true); });

  return {
    ready, native, canLogin, login, logout, sync, welcome, deleteAccount, client,
    isTest: () => false,
    user: () => user, name: () => name(user), provider: () => provider(user), avatar: () => avatar(user),
    syncedAt: () => jget('p8b_synced', 0),
    on: f => subs.push(f),
  };
})();
