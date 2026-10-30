/*
 * AdMob 광고 설정
 * ------------------------------------------------------------
 * 1) 개발 중에는 testing:true 그대로 두세요 → 구글 공식 테스트 광고만 나옵니다.
 *    (본인 폰에서 실제 광고를 누르면 부정 클릭으로 AdMob 계정이 정지될 수 있어요.)
 * 2) 출시 전: AdMob 콘솔에서 만든 광고 단위 ID를 아래에 넣고 testing:false 로 바꾸세요.
 *    앱 ID는 다른 곳에 넣습니다: 안드로이드 → android/app/src/main/res/values/strings.xml,
 *    아이폰 → ios/App/App/Info.plist (GADApplicationIdentifier).
 */
window.AD_CONFIG = {
  testing: true,

  // 광고 빈도 (수익과 사용자 경험 사이에서 조절)
  interstitialEveryNEndings: 2,   // 사망 N번마다 전면 광고 1번
  interstitialMinGapSec: 120,     // 전면 광고 사이 최소 간격(초)
  rewardKarma: 20,                // 보상형 광고 1회 시청 시 받는 카르마
  rewardDailyLimit: 10,           // 보상형 광고 하루 최대 횟수

  android: {
    banner:       'ca-app-pub-3940256099942544/9214589741', // ← 교체 (적응형 배너 테스트 ID)
    interstitial: 'ca-app-pub-3940256099942544/1033173712', // ← 교체
    rewarded:     'ca-app-pub-3940256099942544/5224354917', // ← 교체
  },
  ios: {
    banner:       'ca-app-pub-3940256099942544/2934735716', // ← 교체
    interstitial: 'ca-app-pub-3940256099942544/4411468910', // ← 교체
    rewarded:     'ca-app-pub-3940256099942544/1712485313', // ← 교체
  },
};
