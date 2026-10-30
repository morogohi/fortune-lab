/*
 * Ads — AdMob 연동 (앱에서만 동작, 웹에서는 아무 일도 하지 않음)
 *  - 배너: 첫 화면·탄생 뽑기·엔딩에서만 표시. 플레이 중엔 숨김 (실수로 누르는 것 방지)
 *  - 전면 광고: 엔딩 화면으로 넘어갈 때만, 빈도 제한 적용
 *  - 보상형 광고: 사용자가 직접 선택해서 시청 → 카르마 보상 / 무료 기적
 *  - 동의: 구글 UMP(유럽 GDPR 등) → 아이폰은 추적 허용(ATT) 팝업
 */
window.Ads = (() => {
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform());
  const plat = native ? C.getPlatform() : 'web';
  const A = native ? C.Plugins.AdMob : null;
  const CFG = window.AD_CONFIG || {};
  const ID = CFG[plat] || {};

  let ready = false, wantBanner = false, bannerShown = false, bannerAlive = false;
  let interLoaded = false, rewardLoaded = false, lastInter = 0, endings = 0;
  let privacyRequired = false, rewardCb = null, rewardGot = false;
  const listeners = new Set();
  const notify = () => listeners.forEach(f => { try { f() } catch (e) {} });

  const day = () => new Date().toISOString().slice(0, 10);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} },
  };
  function rewardsLeft() {
    const r = store.get('ads_reward_day', { d: '', n: 0 });
    return (r.d === day() ? CFG.rewardDailyLimit - r.n : CFG.rewardDailyLimit);
  }
  function countReward() {
    const r = store.get('ads_reward_day', { d: '', n: 0 });
    store.set('ads_reward_day', r.d === day() ? { d: r.d, n: r.n + 1 } : { d: day(), n: 1 });
  }

  function setBannerHeight(h) {
    document.documentElement.style.setProperty('--ad-h', (h || 0) + 'px');
    window.dispatchEvent(new Event('resize'));
  }

  async function init() {
    if (!native) return;
    try {
      // 1) 광고 동의(UMP) — 유럽 등 동의가 필요한 지역에서 동의 창 표시
      let ci = await A.requestConsentInfo();
      if (ci.isConsentFormAvailable && ci.status === 'REQUIRED') ci = await A.showConsentForm();
      privacyRequired = ci.privacyOptionsRequirementStatus === 'REQUIRED';
      // 2) 아이폰 추적 허용(ATT) 팝업
      if (plat === 'ios') {
        try {
          const st = await A.trackingAuthorizationStatus();
          if (st.status === 'notDetermined') await A.requestTrackingAuthorization();
        } catch (e) {}
      }
      if (!ci.canRequestAds) { notify(); return; }
      await A.initialize({ initializeForTesting: !!CFG.testing });
      ready = true;

      A.addListener('bannerAdSizeChanged', s => setBannerHeight(bannerShown ? s.height : 0));
      A.addListener('interstitialAdDismissed', () => { interLoaded = false; preloadInter(); });
      A.addListener('interstitialAdFailedToShow', () => { interLoaded = false; preloadInter(); });
      A.addListener('onRewardedVideoAdReward', () => { rewardGot = true; });
      A.addListener('onRewardedVideoAdDismissed', () => finishReward());
      A.addListener('onRewardedVideoAdFailedToShow', () => finishReward());

      preloadInter(); preloadReward();
      if (wantBanner) banner(true);
      notify();
    } catch (e) { console.warn('[Ads] init', e); }
  }

  async function preloadInter() {
    if (!ready || !ID.interstitial) return;
    try { await A.prepareInterstitial({ adId: ID.interstitial, isTesting: !!CFG.testing }); interLoaded = true; }
    catch (e) { interLoaded = false; setTimeout(preloadInter, 30000); }
  }
  async function preloadReward() {
    if (!ready || !ID.rewarded) return;
    try { await A.prepareRewardVideoAd({ adId: ID.rewarded, isTesting: !!CFG.testing }); rewardLoaded = true; notify(); }
    catch (e) { rewardLoaded = false; notify(); setTimeout(preloadReward, 30000); }
  }

  async function banner(on) {
    wantBanner = on;
    if (!ready || !ID.banner) return;
    try {
      if (on && !bannerShown) {
        if (bannerAlive) await A.resumeBanner();
        else {
          await A.showBanner({ adId: ID.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: !!CFG.testing });
          bannerAlive = true;
        }
        bannerShown = true;
      } else if (!on && bannerShown) {
        await A.hideBanner(); bannerShown = false; setBannerHeight(0);
      }
    } catch (e) { console.warn('[Ads] banner', e); }
  }

  /* 엔딩으로 넘어갈 때 호출. 광고가 닫히면 done() 실행 (광고를 안 띄우면 바로 실행) */
  async function maybeInterstitial(done) {
    endings++;
    const gapOk = (Date.now() - lastInter) / 1000 >= (CFG.interstitialMinGapSec || 0);
    if (!ready || !interLoaded || endings % (CFG.interstitialEveryNEndings || 2) !== 0 || !gapOk) { done && done(); return; }
    let fired = false;
    const fin = () => { if (fired) return; fired = true; done && done(); };
    const h = await A.addListener('interstitialAdDismissed', () => { h.remove(); fin(); });
    try { await banner(false); lastInter = Date.now(); await A.showInterstitial(); }
    catch (e) { h.remove(); fin(); }
    setTimeout(fin, 60000);
  }

  function canReward() { return ready && rewardLoaded && rewardsLeft() > 0; }
  /* cb(보상받음:true/false) — 광고가 닫힐 때 호출 */
  async function showReward(onGranted) {
    if (!canReward()) { onGranted && onGranted(false); return false; }
    rewardCb = onGranted; rewardGot = false; rewardLoaded = false; notify();
    try { await A.showRewardVideoAd(); } catch (e) { finishReward(); }
    return true;
  }
  function finishReward() {
    const cb = rewardCb, got = rewardGot;
    if (got) countReward();
    if (cb) { try { cb(got) } catch (e) {} }
    rewardCb = null; rewardGot = false; preloadReward(); notify();
  }

  async function privacyOptions() {
    if (!native) return;
    try { await A.showPrivacyOptionsForm(); } catch (e) {}
  }

  return {
    native, platform: plat, init, banner, maybeInterstitial, showReward, canReward, rewardsLeft,
    privacyOptions, get privacyRequired() { return privacyRequired },
    onChange(f) { listeners.add(f) },
  };
})();

/* 앱 기능: 진동·공유·시작 화면·상태바 */
window.Native = (() => {
  const C = window.Capacitor, native = !!(C && C.isNativePlatform && C.isNativePlatform());
  return {
    vibrate(ms) {
      if (native && C.Plugins.Haptics) {
        const strong = Array.isArray(ms) || ms >= 60;
        C.Plugins.Haptics.impact({ style: strong ? 'HEAVY' : ms >= 25 ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
      } else { try { navigator.vibrate && navigator.vibrate(ms) } catch (e) {} }
    },
    async share(text) {
      if (native && C.Plugins.Share) { await C.Plugins.Share.share({ title: '프로젝트 80억', text }); return 'shared'; }
      if (navigator.share) { await navigator.share({ text }); return 'shared'; }
      await navigator.clipboard.writeText(text); return 'copied';
    },
    hideSplash() { if (native && C.Plugins.SplashScreen) C.Plugins.SplashScreen.hide().catch(() => {}); },
    statusBar() {
      if (native && C.Plugins.StatusBar) {
        C.Plugins.StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
        if (C.getPlatform() === 'android') C.Plugins.StatusBar.setBackgroundColor({ color: '#1b1530' }).catch(() => {});
      }
    },
  };
})();
