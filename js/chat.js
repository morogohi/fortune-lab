/* 운명 연구소 · 상담 챗봇
   연결 방식 (자동 선택)
   1) Claude 아티팩트 안: claude.use("sample") — 보는 사람의 Claude 구독으로 답변, 키 불필요
   2) FORTUNE_CONFIG.chatEndpoint 가 있으면: 중계 서버(worker/)가 숨겨 둔 API 키로 답변
   3) 그 밖: 방문자가 입력한 Anthropic API 키로 브라우저에서 직접 호출 (메모리에만 보관, 저장 안 함) */
const CFG=Object.assign({chatEndpoint:"",model:"claude-sonnet-5-5",maxTokens:900},window.FORTUNE_CONFIG||{});
let chatTurns=[],chatMode=null,sampler=null,chatCtl=null,byokKey="";
const CHAT_RULES=`당신은 재미와 자기성찰을 위한 운세 사이트 ‘운명 연구소’의 상담가입니다.
- 아래 [풀이 요약]은 사용자가 이 사이트에서 본 사주·토정비결·타로·별자리·MBTI 결과입니다. 이를 근거로 따뜻하고 구체적으로 답하세요.
- 사주 용어는 쉬운 말로 풀어 쓰고, 단정하거나 겁주지 마세요. 운세는 참고일 뿐 선택은 본인의 몫이라는 태도를 지키세요.
- 건강·법률·투자·세금 같은 중요한 결정은 전문가 상담을 권하세요. 특정 종목이나 상품을 추천하지 마세요.
- 사용자가 극단적 선택이나 자해를 암시하면 운세 이야기를 멈추고, 자살예방상담전화 109(24시간)나 가까운 사람에게 도움을 청하도록 진심으로 권하세요.
- 논어·채근담·사기 같은 고전을 인용할 때는 원문이 확실한 구절만 쓰고, 출전 편명을 함께 적으세요. 확실하지 않으면 인용하지 마세요.
- 한국어 존댓말로, 보통 3–6문단 이내로 답하세요. 사용자의 이름이나 생년월일을 되묻지 마세요.`;

function chatContext(){
  if(!S)return"(아직 풀이 결과가 없습니다.)";
  const {f,P,me,cnt,gc,strong,lucky,z,tj}=S,cols=[["년",P.y],["월",P.m],["일",P.d],["시",P.h]];
  const yg=yearGz(f.Y),ts=tg10(me,yg.s),cur=P.dy.find(x=>f.Y>=x.yr&&f.Y<x.yr+10);
  const pf=readProfile(),occ=OCCS.find(o=>o[0]===pf.occ),fam=FAMS.find(o=>o[0]===pf.fam),house=HOUSES.find(o=>o[0]===pf.house);
  const L=[`성별: ${f.g==="m"?"남":"여"}, 나이: 만 ${f.Y-P.solar.y}세 무렵(${ageBand(f.Y-P.solar.y)})`,
   `명식: ${cols.map(([k,p])=>p?`${k}주 ${ST[p.s]}${BR[p.b]}`:`${k}주 미상`).join(", ")}`,
   `일간: ${ST[me]}${EK[SE[me]]} (${DMX[me].nm}, ${DMX[me].key}), ${strong?"신강":"신약"}, 행운 오행 ${lucky.map(i=>EK[i]).join("·")}`,
   `오행 개수: ${cnt.map((c,i)=>EK[i]+c).join(" ")}, 십신 분포: ${gc.map((c,i)=>GRP[i]+c).join(" ")}`,
   `${f.Y}년 세운: ${ST[yg.s]}${BR[yg.b]} (천간 ${ts.n})${cur?`, 현재 대운 ${ST[cur.gz.s]}${BR[cur.gz.b]}(${cur.yr}–${cur.yr+9})`:""}`,
   `${f.Y}년 토정비결: ${tj.code}괘, ${tj.tone}`,
   `별자리: ${z[0]}, MBTI: ${f.mbti}`,
   `추천 직업 상위: ${S.jobs.slice(0,3).map(j=>j[0]).join(", ")}`];
  if(pf.prov||occ||fam||house||pf.ints.length)L.push(`생활 프로필: ${[pf.prov&&`${P2R[pf.prov]} 거주`,occ&&occ[1],fam&&fam[1],house&&house[1],pf.ints.length&&("관심사 "+pf.ints.map(k=>INTS.find(o=>o[0]===k)[1]).join("·"))].filter(Boolean).join(", ")}`);
  if(lastDraw&&lastDraw.opened.size===lastDraw.n)L.push(`타로(${lastDraw.n}장, 주제 ${$("ttopic").selectedOptions[0].text}): ${lastDraw.cards.map((x,k)=>`${SPREADS[lastDraw.n][k][0]} ${x.c.ko}${x.rev?"(역)":""}`).join(", ")}`);
  if($("matchOn").checked&&$("pbirth").value)L.push(`궁합 보기: ${$("rel").selectedOptions[0].text}, 상대 MBTI ${$("pmbti").value} (상대 이름과 생년월일은 보내지 않음)`);
  return L.join("\n");
}
async function detectChat(){
  sampler=window.claude&&window.claude.use?await window.claude.use("sample").catch(()=>null):null;
  chatMode=sampler?"sample":CFG.chatEndpoint?"endpoint":"byok";
  const st=$("chatmode");
  st.textContent={sample:"Claude 계정으로 답변합니다. 처음 보낼 때 사용 허락 창이 뜹니다.",endpoint:"운영자가 연결한 Claude API로 답변합니다.",byok:"이 페이지에는 상담 서버가 연결되어 있지 않습니다. 본인의 Anthropic API 키를 넣으면 이 창에서만 사용합니다."}[chatMode];
  $("byok").hidden=chatMode!=="byok";
}
function bubble(role,text){const d=document.createElement("div");d.className="msg "+role;d.textContent=text;$("chatlog").appendChild(d);d.scrollIntoView({block:"nearest"});return d}
async function callEndpoint(context,messages,signal){
  const r=await fetch(CFG.chatEndpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({context,messages}),signal});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw{code:"http",message:j.error||("HTTP "+r.status)};return j.text||"";
}
async function callAnthropic(sys,rest,signal){
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal,headers:{"content-type":"application/json","x-api-key":byokKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:CFG.model,max_tokens:CFG.maxTokens,system:sys,messages:rest})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw{code:"http",message:(j.error&&j.error.message)||("HTTP "+r.status)};
  return(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n");
}
async function sendChat(text){
  text=(text||"").trim();if(!text||chatCtl)return;
  if(chatMode==="byok"&&!byokKey){byokKey=$("apikey").value.trim();if(!byokKey){$("chatnote").textContent="API 키를 먼저 넣어 주세요.";return}}
  $("chatnote").textContent="";$("chatin").value="";
  bubble("user",text);chatTurns.push({role:"user",content:text});
  const ctx=$("chatctx").checked?`[풀이 요약]\n${chatContext()}`:"[풀이 요약]\n(사용자가 풀이 요약을 보내지 않기로 했습니다.)";
  const turns=chatTurns.slice(-12);while(turns.length&&turns[0].role!=="user")turns.shift();
  const out=bubble("assistant","생각하는 중…");out.classList.add("wait");
  chatCtl=new AbortController();$("chatsend").hidden=true;$("chatstop").hidden=false;
  try{
    let ans="";
    if(chatMode==="sample"){const r=await sampler([{role:"user",content:CHAT_RULES+"\n\n"+ctx},...turns],{cache:false,signal:chatCtl.signal,modelTier:"default",onText:({text})=>{out.classList.remove("wait");out.textContent=text}});ans=r.text}
    else if(chatMode==="endpoint")ans=await callEndpoint(ctx,turns,chatCtl.signal);
    else ans=await callAnthropic(CHAT_RULES+"\n\n"+ctx,turns,chatCtl.signal);
    out.classList.remove("wait");out.textContent=ans;chatTurns.push({role:"assistant",content:ans});
  }catch(e){
    out.classList.remove("wait");
    if(e&&(e.code==="cancelled"||e.name==="AbortError")){out.textContent=(e.text||"")+" (멈춤)";if(e.text)chatTurns.push({role:"assistant",content:e.text})}
    else{out.remove();chatTurns.pop();
      $("chatnote").textContent={not_granted:"Claude 사용을 허락하지 않아 상담을 쓸 수 없습니다.",sampling_disabled:"이 계정에서는 Claude 상담을 쓸 수 없습니다.",rate_limited:"요청이 많습니다. 잠시 후 다시 보내 주세요.",refused:"이 질문에는 답할 수 없습니다. 다르게 물어봐 주세요."}[e&&e.code]
        ||(chatMode==="byok"?`답변을 받지 못했습니다. API 키와 크레딧을 확인하세요. (${e&&e.message||"오류"})`:`답변을 받지 못했습니다. 잠시 후 다시 시도하세요. (${e&&e.message||"오류"})`);
      if(chatMode==="byok"&&/auth|key|401/i.test(e&&e.message||""))byokKey=""}
  }finally{chatCtl=null;$("chatsend").hidden=false;$("chatstop").hidden=true}
}
function clearChat(){chatTurns=[];byokKey="";$("chatlog").innerHTML="";const k=$("apikey");if(k)k.value=""}
$("chatform").addEventListener("submit",e=>{e.preventDefault();sendChat($("chatin").value)});
$("chatin").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendChat($("chatin").value)}});
$("chatstop").addEventListener("click",()=>chatCtl&&chatCtl.abort());
$("chatsugg").addEventListener("click",e=>{const b=e.target.closest("button");if(b)sendChat(b.textContent)});
$("chatreset").addEventListener("click",clearChat);
detectChat();
