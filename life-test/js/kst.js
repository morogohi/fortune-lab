/* =====================================================================
 * 한국 시간(Asia/Seoul, UTC+9) 기준 날짜 도우미
 *   운세·일진·출석·광고 횟수·같은 날 재열람·내역의 '오늘'은 기기 시간대와 관계없이 한국 날짜로 계산한다.
 *   KST.now()  : 지역(로컬) 필드(getFullYear·getMonth·getDate·getHours…)가 한국 시각을 가리키는 Date
 *                (날짜·요일·시각을 읽는 용도 · 실제 시점 비교에는 Date.now() 사용)
 *   KST.ymd(t) : 실제 시점 t(ms)의 한국 날짜 'YYYY-MM-DD'
 *   KST.startOfDay(t) / endOfDay(t) : 그 한국 날짜의 0시 / 23:59:59.999 (실제 시점 ms)
 *   생년월일은 문자열로만 다루므로 이 변환의 영향을 받지 않는다.
 * ===================================================================== */
(function () {
  const OFF = 9 * 60;   // 한국은 서머타임 없음
  // 테스트 모드 가상 날짜: 테스트 도구 「다음 날로」가 하루씩 앞당김 (실제 서비스 모드에서는 Karma 가 0으로 되돌림)
  const off = () => { if (window.P8B_MODE !== 'commercial' && !window.__kstTestOK) return 0; try { const v = +JSON.parse(localStorage.getItem('p8b_test_dayoff') || '0'); return Number.isFinite(v) ? v : 0; } catch (e) { return 0; } };
  const nowMs = () => (typeof window.__kstNow === 'number' ? window.__kstNow : Date.now()) + off() * 864e5;
  const shift = t => { const d = new Date(t); return new Date(t + (OFF + d.getTimezoneOffset()) * 60000); };
  const pad = n => String(n).padStart(2, '0');
  const KST = {
    nowMs, offsetDays: off,
    now: () => shift(nowMs()),
    at: t => shift(t),
    ymd: (t = nowMs()) => { const d = shift(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    startOfDay: (t = nowMs()) => { const d = shift(t); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - OFF * 60000; },
    endOfDay: (t = nowMs()) => KST.startOfDay(t) + 864e5 - 1,
    startOfMonth: (t = nowMs()) => { const d = shift(t); return Date.UTC(d.getFullYear(), d.getMonth(), 1) - OFF * 60000; },
    year: () => shift(nowMs()).getFullYear(),
    /* 신년운세·토정비결의 기준 해: 11월부터 다음 해 */
    fortuneYear: () => { const d = shift(nowMs()); return d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear(); },
    /* 기록 표시용 (한국 시간) */
    fmt: (t, withTime) => { const d = shift(t); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.${withTime ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''}`; },
  };
  window.KST = KST;
})();
