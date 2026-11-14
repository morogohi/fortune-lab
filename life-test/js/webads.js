/* =====================================================================
 *  WebAds — 모바일 웹(브라우저)용 AdSense
 *   ① 디스플레이 배너 : 첫 화면·엔딩 화면 (<ins class="adsbygoogle">)
 *   ② H5 Games Ads   : 전면(adBreak type:'next')·보상형(type:'reward')
 *      → AdSense 계정 승인 + H5 Games Ads 베타 신청 승인 후 사용
 *  앱(Android·iOS)에서는 사용하지 않음 — 앱은 AdMob(ads.js)
 * ===================================================================== */
window.WEB_AD_CONFIG = {
  client: '',              // ← AdSense 게시자 ID (예: 'ca-pub-1234567890123456'). 비어 있으면 광고 끔
  displaySlot: '',         // ← 디스플레이 광고 단위 슬롯 ID (예: '1234567890'). 비어 있으면 배너 안 띄움
  h5: true,                // H5 Games Ads(전면·보상형) 사용 — 베타 승인 전엔 false 권장
  test: true,              // 테스트 모드(data-adbreak-test="on"). 실제 수익은 false
  frequencyHint: '120s',   // 전면 광고 최소 간격
};

window.WebAds = (() => {
  const C = window.Capacitor;
  const isApp = !!(C && C.isNativePlatform && C.isNativePlatform());
  const W = window.WEB_AD_CONFIG;
  const on = !isApp && !!W.client;
  let loaded = false, rewardFn = null, rewardCb = null, rewardGot = false;
  const listeners = new Set();
  const notify = () => listeners.forEach(f => { try { f(); } catch (e) {} });

  function load() {
    if (!on || loaded) return;
    loaded = true;
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(W.client);
    if (W.h5) {
      s.setAttribute('data-ad-frequency-hint', W.frequencyHint);
      if (W.test) s.setAttribute('data-adbreak-test', 'on');
    }
    document.head.appendChild(s);
    window.adsbygoogle = window.adsbygoogle || [];
    if (W.h5) {
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
      window.adConfig({ preloadAdBreaks: 'on', sound: (window.Snd && Snd.on.sfx) ? 'on' : 'off' });
      prepareReward();
    }
  }

  /* ① 디스플레이 배너 */
  function banner(containerId) {
    if (!on || !W.displaySlot) return;
    const box = document.getElementById(containerId);
    if (!box || box.dataset.filled) return;
    box.dataset.filled = '1'; box.style.display = 'block';
    box.innerHTML = `<div class="adlabel">광고</div><ins class="adsbygoogle" style="display:block" data-ad-client="${W.client}" data-ad-slot="${W.displaySlot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  }

  /* ② 전면 광고: 엔딩으로 넘어갈 때. 광고가 없으면 바로 done() */
  function interstitial(done) {
    if (!on || !W.h5 || !window.adBreak) { done && done(); return; }
    let fired = false; const fin = () => { if (!fired) { fired = true; done && done(); } };
    try {
      window.adBreak({
        type: 'next', name: 'life_end',
        beforeAd: () => { window.Snd && Snd.mute && Snd.mute(true); },
        afterAd: () => { window.Snd && Snd.mute && Snd.mute(false); },
        adBreakDone: fin,
      });
    } catch (e) { fin(); }
    setTimeout(fin, 15000);
  }

  /* ③ 보상형: 미리 요청해 두고, 준비되면 버튼 노출 */
  function prepareReward() {
    if (!on || !W.h5 || !window.adBreak) return;
    try {
      window.adBreak({
        type: 'reward', name: 'reward_bonus',
        beforeAd: () => { window.Snd && Snd.mute && Snd.mute(true); },
        afterAd: () => { window.Snd && Snd.mute && Snd.mute(false); },
        beforeReward: showAdFn => { rewardFn = showAdFn; notify(); },
        adViewed: () => { rewardGot = true; },
        adDismissed: () => { rewardGot = false; },
        adBreakDone: () => {
          const cb = rewardCb, got = rewardGot;
          rewardFn = null; rewardCb = null; rewardGot = false; notify();
          if (cb) cb(got);
          setTimeout(prepareReward, 3000);
        },
      });
    } catch (e) {}
  }
  function canReward() { return !!rewardFn; }
  function showReward(cb) {
    if (!rewardFn) { cb && cb(false); return false; }
    rewardCb = cb; const f = rewardFn; rewardFn = null; notify();
    try { f(); } catch (e) { rewardCb = null; cb && cb(false); }
    return true;
  }

  return { on, load, banner, interstitial, canReward, showReward, onChange: f => listeners.add(f) };
})();
