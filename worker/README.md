# 상담 챗봇 중계 서버 배포 (Cloudflare Worker, 무료 플랜 가능)

공개 사이트에 API 키를 그대로 넣으면 누구나 키를 가져가 크레딧을 쓸 수 있습니다.
이 Worker가 키를 비밀값으로 보관하고, 허용한 사이트에서 온 요청만 Claude API로 전달합니다.

## 1. API 키 준비 (Claude Max 플랜 크레딧 사용)
1. claude.ai → Settings → Billing → **API credits** 에서 Console 조직을 연결합니다.
   (Max 5x는 매월 100달러, Max 20x는 매월 200달러의 API 크레딧이 들어옵니다. 이월되지 않습니다.)
2. https://console.anthropic.com → 연결한 조직 → **API Keys** 에서 키를 만듭니다.

## 2. Worker 배포
```bash
npm i -g wrangler
cd worker
wrangler login
wrangler secret put ANTHROPIC_API_KEY      # 위에서 만든 키 붙여넣기
wrangler deploy
```
배포가 끝나면 `https://fortune-lab-chat.<계정>.workers.dev` 같은 주소가 나옵니다.

## 3. 사이트에 연결
`js/config.js` 의 `chatEndpoint` 에 위 주소를 넣고 커밋·푸시합니다.
```js
window.FORTUNE_CONFIG = { chatEndpoint: "https://fortune-lab-chat.<계정>.workers.dev", model: "claude-sonnet-5-5" };
```

## 보호 장치
- `ALLOWED_ORIGIN`(기본 `https://morogohi.github.io`)이 아닌 곳에서 온 요청은 거절합니다.
- 질문 12턴, 한 메시지 1,500자, 풀이 요약 4,000자로 자릅니다.
- 같은 IP는 시간당 30회로 제한합니다(인스턴스 단위 간이 제한).
- 시스템 지침은 서버에 고정되어 있어 운세와 무관한 용도로 쓰기 어렵습니다.
- 대화 내용을 저장하거나 로그로 남기지 않습니다.
