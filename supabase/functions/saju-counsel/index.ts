// Supabase Edge Function: saju-counsel
// 두 가지 방식:
//  ① mode 'chat' (기본 화면): 대화 내용(최근 12개) + 사주 요약으로 자연스러운 대화 상담 — 앱이 질문 1개마다 카르마 차감
//  ② 예전 방식: '사주 요약 + MBTI + 고민 + 기기 안 계산 결과'로 상담 답변
// - 이름·생년월일은 받지 않습니다 (앱이 보내지 않음). 질문·답변은 DB에 저장하지 않습니다.
// - 로그인한 사용자만 호출 가능, 하루 이용 횟수 제한(counsel_usage 테이블).
// 배포:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (선택) ANTHROPIC_MODEL, COUNSEL_DAILY_LIMIT
//        supabase functions deploy saju-counsel
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SYSTEM = `당신은 '운명 연구소' 앱의 AI 사주상담사입니다.
사용자는 인생의 갈림길(진로·창업·공부·연애·돈·이사)에서 고민하고 있습니다.
앱이 계산한 사주 요약(일간·오행·대운·좋은 달), MBTI, 선택지별 점수, 인생 게임 가상 실행 결과를 받습니다.
- 한국어 존댓말, 따뜻하고 구체적으로. 5~8문단, 각 문단 2~3문장.
- 순서: 공감 한 줄 → 선택지별 장단점(사주·MBTI·가상 인생 근거) → 추천과 그 조건 → 시기(좋은 달) → 바로 할 일 2~3개.
- 운명론으로 단정하지 말고 '흐름'과 '경향'으로 말하기. 결정은 사용자의 몫임을 존중.
- 의료·법률·투자 판단은 전문가 상담을 권하고, 자해·위기 신호가 보이면 상담 대신 전문 기관(자살예방상담 109)을 안내.
- 앱이 준 숫자를 바꾸거나 없는 사실을 지어내지 않기.`;

const SYSTEM_CHAT = `당신은 '운명 연구소' 앱의 AI 사주상담사입니다. 사용자와 메신저처럼 자연스럽게 대화하며 고민을 함께 정리합니다.
앱이 사용자의 사주 요약(일간·성향·오행 개수·강한/부족한 기운·지금 대운·다음 대운·올해 흐름·좋은 달·조심할 달), MBTI, 나이대를 함께 줍니다.
- 한국어 존댓말, 따뜻하고 구체적으로. 3~6문단, 문단마다 1~3문장. 목록보다 대화체로.
- 먼저 사용자의 말과 감정을 짧게 받아 주고, 사주 흐름(대운·올해·좋은 달)과 성향을 근거로 생각할 거리를 주세요.
- 두 가지 선택을 고민하면 각각의 장단점을 사주·성향 근거로 비교하고, 결정은 사용자의 몫임을 존중하세요.
- 한 번에 다 말하지 말고, 마지막에 상황을 더 알 수 있는 질문을 하나만 하세요.
- 운명론으로 단정하지 말고 '흐름'과 '경향'으로 말하기. 앱이 준 사주 정보를 바꾸거나 없는 사실을 지어내지 않기.
- 의료·법률·투자 판단은 전문가 상담을 권하세요. 자해·자살 등 위기 신호가 보이면 공감과 함께 자살예방상담전화 109(24시간), 정신건강위기상담 1577-0199, 위급 시 112·119를 안내하세요.
- 이름·연락처 같은 개인정보를 묻지 마세요.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: u } = await sb.auth.getUser(auth.replace('Bearer ', ''));
  if (!u?.user) return json({ error: 'login' }, 401);

  // 하루 이용 제한 (질문 수)
  const limit = +(Deno.env.get('COUNSEL_DAILY_LIMIT') || 30), day = new Date().toISOString().slice(0, 10);
  const { data: row } = await sb.from('counsel_usage').select('n').eq('user_id', u.user.id).eq('day', day).maybeSingle();
  if ((row?.n || 0) >= limit) return json({ error: 'limit', reply: `오늘 AI 상담은 ${limit}회까지예요. 내일 다시 이용해 주세요.` }, 429);

  let body: any; try { body = await req.json(); } catch { return json({ error: 'body' }, 400); }
  const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);
  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5';
  const callAI = async (system: string, messages: { role: string; content: string }[], max: number) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: max, system, messages }),
    });
    if (!r.ok) return null;
    const out = await r.json();
    return (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
  };

  // ① 대화 상담
  if (body.mode === 'chat') {
    const raw = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const msgs = raw.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: clip(m.content, 1200) })).filter((m: any) => m.content);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();          // 첫 메시지는 사용자
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'messages' }, 400);
    const ctx = { saju: body.saju ?? null, mbti: clip(body.mbti, 4), ageBand: clip(body.ageBand, 6), year: +body.year || null };
    const system = SYSTEM_CHAT + `\n\n[사용자 사주 요약(JSON)]\n${JSON.stringify(ctx)}`;
    const reply = await callAI(system, msgs, 900);
    if (!reply) return json({ error: 'ai' }, 502);
    await sb.from('counsel_usage').upsert({ user_id: u.user.id, day, n: (row?.n || 0) + 1 });
    return json({ reply });
  }
  const input = {
    topic: clip(body.topic, 20), question: clip(body.question, 300),
    options: (Array.isArray(body.options) ? body.options : []).slice(0, 3).map((o: unknown) => clip(o, 60)),
    saju: body.saju ?? null, mbti: clip(body.mbti, 4), ageBand: clip(body.ageBand, 6),
    scores: Array.isArray(body.scores) ? body.scores.slice(0, 3) : null, sims: Array.isArray(body.sims) ? body.sims.slice(0, 3) : null,
  };
  if (input.options.length < 2) return json({ error: 'options' }, 400);

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5', max_tokens: 1200, system: SYSTEM,
      messages: [{ role: 'user', content: `상담 자료(JSON):\n${JSON.stringify(input)}\n\n위 자료로 상담해 주세요.` }],
    }),
  });
  if (!r.ok) return json({ error: 'ai', status: r.status }, 502);
  const out = await r.json();
  const reply = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();

  await sb.from('counsel_usage').upsert({ user_id: u.user.id, day, n: (row?.n || 0) + 1 });
  return json({ reply });
});
