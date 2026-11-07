/* 화면 테마: 화이트(한지) · 블랙(먹) · 시스템 설정 따르기
 * 저장 키 p8b_mode = 'light' | 'dark' | 'system' (기본 'light')
 * 실제 적용은 <html data-theme="light|dark"> — index.html <head>의 인라인 스크립트가 첫 그림 전에 먼저 적용한다 */
window.Theme = (() => {
  const KEY = 'p8b_mode', MQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const BG = { light: '#f6f3ee', dark: '#111114' };
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || 'light'; } catch (e) { return 'light'; } };
  const resolve = m => m === 'system' ? (MQ && MQ.matches ? 'dark' : 'light') : (m === 'dark' ? 'dark' : 'light');
  function apply() {
    const t = resolve(get());
    document.documentElement.dataset.theme = t;
    let meta = document.querySelector('meta[name=theme-color]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = BG[t];
    const C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins.StatusBar) {
      // Capacitor: LIGHT = 어두운 글씨(밝은 바탕용), DARK = 밝은 글씨
      C.Plugins.StatusBar.setStyle({ style: t === 'light' ? 'LIGHT' : 'DARK' }).catch(() => {});
      if (C.getPlatform() === 'android') C.Plugins.StatusBar.setBackgroundColor({ color: BG[t] }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
    return t;
  }
  function set(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} return apply(); }
  if (MQ) (MQ.addEventListener ? MQ.addEventListener('change', () => get() === 'system' && apply()) : MQ.addListener(() => get() === 'system' && apply()));
  return { mode: get, set, apply, current: () => resolve(get()), cssVar: n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() };
})();
