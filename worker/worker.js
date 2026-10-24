/* 운명 연구소 상담 중계 서버 (Cloudflare Worker)
   - Anthropic API 키는 Worker 비밀값(ANTHROPIC_API_KEY)에만 두고, 공개 페이지에는 넣지 않습니다.
   - 허용한 사이트(ALLOWED_ORIGIN)에서 온 요청만 받고, 대화 길이와 요청 빈도를 제한합니다.
   - 대화 내용은 저장하지 않습니다(로그 기록 없음).
   배포: worker/README.md 참고 */
const RULES = `당신은 재미와 자기성찰을 위한 운세 사이트 ‘운명 연구소’의 상담가입니다.
- [풀이 요약]은 사용자가 이 사이트에서 본 사주·토정비결·타로·별자리·MBTI 결과입니다. 이를 근거로 따뜻하고 구체적으로 답하세요.
- 사주 용어는 쉬운 말로 풀어 쓰고, 단정하거나 겁주지 마세요. 운세는 참고일 뿐 선택은 본인의 몫입니다.
- 건강·법률·투자·세금 같은 중요한 결정은 전문가 상담을 권하고, 특정 종목이나 상품을 추천하지 마세요.
- 극단적 선택이나 자해를 암시하면 운세 이야기를 멈추고 자살예방상담전화 109(24시간)나 가까운 사람에게 도움을 청하도록 권하세요.
- 고전을 인용할 때는 원문이 확실한 구절만 출전과 함께 쓰세요.
- 운세·사주·타로·성격·진로·관계 상담과 무관한 요청(코딩, 숙제 대행 등)은 정중히 사양하세요.
- 한국어 존댓말로, 보통 3–6문단 이내로 답하세요.`;

const LIMIT = { turns: 12, chars: 1500, context: 4000, perHour: 30 };
const hits = new Map(); // 같은 인스턴스 안에서의 간이 빈도 제한

function cors(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, "content-type": "application/json; charset=utf-8" } });

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN || "https://morogohi.github.io";
    const origin = req.headers.get("Origin") || "";
    const h = cors(origin, allowed);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method !== "POST") return json({ error: "POST만 받습니다." }, 405, h);
    if (origin !== allowed) return json({ error: "허용되지 않은 사이트입니다." }, 403, h);

    const ip = req.headers.get("CF-Connecting-IP") || "?";
    const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
    if (list.length >= LIMIT.perHour) return json({ error: "요청이 많습니다. 잠시 후 다시 시도하세요." }, 429, h);
    list.push(now); hits.set(ip, list);

    let body;
    try { body = await req.json(); } catch { return json({ error: "잘못된 요청입니다." }, 400, h); }
    const context = String(body.context || "").slice(0, LIMIT.context);
    let messages = Array.isArray(body.messages) ? body.messages.slice(-LIMIT.turns) : [];
    messages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, LIMIT.chars) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "질문이 비어 있습니다." }, 400, h);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.MODEL || "claude-sonnet-5-5", max_tokens: 900, system: RULES + "\n\n" + context, messages }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: (j.error && j.error.message) || `상담 서버 오류 (${r.status})` }, 502, h);
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return json({ text }, 200, h);
  },
};
