/* 운명 연구소 · 자기성찰 → 행동계획 (목표 해석 · 일치 검사 · 시간 합산 · 주간 체크인)
   행동계획은 사주가 아니라 사용자가 적은 목표·고민·가용 시간을 근거로 만듭니다. 사주는 참고 한 줄로만 덧붙입니다. */
const PLAN_RULES="plan v2026.10.24";
const CONCERNS={work:"일 · 이직 · 승진",money:"돈 · 재테크",love:"연애 · 관계",health:"건강 · 생활 습관",study:"공부 · 자격증",mind:"마음 · 진로 고민"};
const GOAL_KW={
 study:/(합격|시험|자격|기능사|산업기사|기사|기술사|토익|토플|TOEIC|TOEFL|오픽|점수|공부|학위|논문|수능|면허|자격증|필기|실기|[12]차|강의|수료|어학|독학)/i,
 work:/(이직|취업|승진|연봉|면접|입사|창업|프로젝트|업무|커리어|포트폴리오|이력서|사업|부업|매출|고객|퇴사|전직)/,
 money:/(저축|적금|예금|투자|부채|빚|대출|상환|모으|만\s?원|억|재테크|가계부|지출|월세|청약|비상금|절약)/,
 health:/(체중|다이어트|감량|kg|킬로|운동|헬스|러닝|달리기|마라톤|금연|금주|수면|걷기|근력|건강|요가|식단)/i,
 love:/(연애|결혼|소개팅|이성|관계|화해|가족|부부|친구|데이트|배우자|아이|육아)/,
 mind:/(마음|불안|스트레스|자존감|명상|진로|방향|번아웃|휴식|감정|우울|행복|여유)/};
function parseGoal(t){
  t=(t||"").trim();if(!t)return null;
  const score={};for(const [k,re] of Object.entries(GOAL_KW)){const m=t.match(new RegExp(re.source,re.flags+"g"));if(m)score[k]=m.length}
  if(score.work&&score.money&&/(연봉|매출|부업)/.test(t))score.work+=1;
  const cat=Object.keys(score).sort((a,b)=>score[b]-score[a])[0]||null;
  let weeks=12;const mm=t.match(/(\d+)\s*(개월|달)/),ww=t.match(/(\d+)\s*주/),mo=t.match(/(\d{1,2})\s*월/);
  if(mm)weeks=Math.max(1,+mm[1]*4);else if(ww)weeks=+ww[1];else if(mo){const now=new Date().getMonth()+1,tm=+mo[1];weeks=Math.max(2,((tm-now+12)%12||12)*4)}
  const exam=(t.match(/([가-힣A-Za-z0-9]+(?:기술사|산업기사|기능사|기사|자격증|면허|시험|TOEIC|토익|토플|오픽))/i)||[])[1]||"";
  const stage=(t.match(/(필기|실기|[12]\s?차|면접)/)||[])[1]||"";
  const amt=(t.match(/(\d+(?:\.\d+)?)\s*(만\s?원|억)/)||[]);const kg=(t.match(/(\d+(?:\.\d+)?)\s*(kg|킬로)/i)||[]);
  const sub=cat==="work"?(/(창업|사업|부업|매출)/.test(t)?"startup":/(승진|평가)/.test(t)?"promo":"move"):cat==="love"?(/(결혼|소개팅|연애|이성|데이트)/.test(t)?"meet":"bond"):"";
  return{text:t,cat,weeks,exam,stage:stage.replace(/\s/g,""),amount:amt[1]?{v:+amt[1],u:amt[2].replace(/\s/g,"")}:null,kg:kg[1]?+kg[1]:null,sub};
}
function readGoals(){return{concern:$("concern").value,hours:+$("hours").value||4,skills:$("skills").value.trim().slice(0,60),goal:$("goal3").value.trim().slice(0,80)}}
let planBasis="goal";             // 목표와 고민이 다를 때: goal | concern
let planState={week:1,history:[]}; // 메모리에만 보관 (파일로 내보내기/불러오기 가능)

/* 주차별 단계 × 분류별 과제. h = 가용 시간 대비 비율, min = 최소 시간 */
const PHASES={
 study:[
  [["진단","{X} 기출 1회분을 실제 시험처럼 시간을 재고 풀어, 틀린 유형 3개를 적으세요.","현재 수준을 알아야 남은 {W}주의 분량을 정할 수 있습니다.",.35,1.5],
   ["분량 배분","남은 {W}주에 맞춰 범위를 주 단위로 나누고, 이번 주 분량을 먼저 끝내세요.","주간 분량이 정해지면 목표일까지 범위를 다 돌 수 있습니다.",.45,1],
   ["오답 복습","이번 주에 틀린 문제를 유형별로 정리하고 3일 뒤 다시 풀어 보세요.","같은 실수를 줄이는 것이 점수를 가장 빨리 올립니다.",.2,.5]],
  [["약점 집중","지난주 찾은 약점 유형 1개를 골라 관련 문제를 집중해서 푸세요.","가장 많이 틀리는 유형을 잡으면 합격선에 가까워집니다.",.4,1.5],
   ["범위 진도","이번 주 범위 분량을 이어서 끝내세요.","진도가 밀리지 않아야 마지막 달에 실전 연습을 할 수 있습니다.",.4,1],
   ["오답 재시험","지난주 오답을 다시 풀고, 또 틀린 문제만 따로 모으세요.","두 번 틀린 문제가 진짜 약점입니다.",.2,.5]],
  [["실전 모의","{X} 1회분을 실전 시간 그대로 풀고 점수를 기록하세요.","실전 감각과 시간 배분을 점검합니다.",.4,2],
   ["시간 배분","시간이 모자랐던 파트를 골라 빠르게 푸는 연습을 하세요.","아는 문제를 시간 안에 푸는 것이 점수가 됩니다.",.35,1],
   ["요약 노트","자주 나오는 공식·개념을 한 장으로 정리하세요.","시험 직전에 볼 자료가 됩니다.",.25,.5]],
  [["최종 점검","모의고사 점수 추이를 보고 남은 기간 우선순위를 다시 정하세요.","남은 시간을 점수가 가장 오를 곳에 씁니다.",.3,1],
   ["반복 실전","실전 모의를 한 번 더 풀어 보세요.","실전 연습이 쌓일수록 긴장이 줄어듭니다.",.45,2],
   ["컨디션","시험 시간에 맞춰 잠들고 일어나는 시간을 고정하세요.","시험 당일 집중력은 생활 리듬에서 나옵니다.",.25,.5]]],
 work_move:[
  [["경력 한 장","{S}을(를) 성과가 드러나는 문장 3줄로 정리하세요. 숫자(기간·규모·결과)를 하나씩 넣습니다.","지원서와 면접의 출발점이 됩니다.",.3,1],
   ["공고 분석","목표와 가까운 공고 {N}개를 찾아 요구 역량과 내 경력을 표로 비교하세요.","부족한 역량을 알아야 준비 순서를 정할 수 있습니다.",.4,1],
   ["사람 한 명","그 분야에 있는 지인 1명에게 15분 대화를 청하세요.","공고에 없는 정보를 얻습니다.",.3,.5]],
  [["지원서 1건","가장 맞는 공고 1곳에 맞춰 이력서와 자기소개서를 다듬으세요.","실제 지원이 시작되어야 피드백이 옵니다.",.45,1.5],
   ["역량 보강","지난주 찾은 부족한 역량 1개를 채울 강의나 자료를 시작하세요.","면접에서 보완 계획을 말할 수 있습니다.",.35,1],
   ["면접 준비","예상 질문 5개에 대한 답을 소리 내어 연습하세요.","말로 해 봐야 다듬어집니다.",.2,.5]]],
 work_promo:[
  [["성과 기록","최근 3개월 성과를 숫자와 함께 5줄로 적으세요.","평가 때 근거가 됩니다.",.3,.5],
   ["기대치 확인","상사와 10분 대화로 올해 기대하는 결과를 확인하세요.","무엇이 승진 기준인지 알아야 합니다.",.2,.5],
   ["역량 하나","다음 직급에 필요한 역량 하나를 골라 이번 주 실천하세요.","한 단계 위의 일을 미리 해 보는 것이 가장 강한 신호입니다.",.5,1]]],
 work_startup:[
  [["고객 인터뷰","대상 고객 {N}명에게 지금 겪는 불편을 물어 기록하세요.","만들기 전에 문제를 확인합니다.",.4,1],
   ["경쟁 조사","비슷한 서비스 3곳의 가격과 장단점을 표로 정리하세요.","차별점을 찾습니다.",.3,1],
   ["작은 시험","한 문장 소개와 신청 폼으로 관심을 확인하세요.","실제 반응을 숫자로 봅니다.",.3,1]]],
 money:[
  [["지출 지도","지난달 지출을 항목별로 나누고 줄일 항목 1개를 정하세요.","{G}에 쓸 돈이 어디서 나올지 찾습니다.",.4,1],
   ["자동 저축","월급날 다음 날로 자동이체를 걸어 두세요.{A}","의지에 기대지 않고 목표 금액이 쌓이게 합니다.",.2,.5],
   ["고정비 점검","통신비·구독·보험 가운데 {N}개를 골라 지금 조건이 맞는지 확인하세요.","한 번 줄이면 매달 효과가 납니다.",.4,.5]],
  [["줄인 만큼 옮기기","지난주 줄인 지출만큼을 저축 계좌로 옮기세요.","절약이 실제 목표 금액으로 이어지게 합니다.",.2,.5],
   ["두 번째 항목","줄일 지출 항목을 하나 더 정하세요.","작은 항목이 모이면 큰 차이가 됩니다.",.4,.5],
   ["진행 확인","목표 대비 모인 금액을 기록하세요.","남은 기간 동안 얼마를 더 모아야 하는지 보입니다.",.4,.5]]],
 health:[
  [["몸 움직이기","이번 주 {N1}번, {E}를 30분씩 하세요.","{G}는 꾸준한 횟수에서 시작합니다.",.6,1.5],
   ["잠 고정","잠드는 시각을 일주일 동안 같은 시간으로 맞추세요.","수면이 일정해야 몸의 변화가 따라옵니다.",.1,0],
   ["기록","운동과 식사를 하루 한 줄씩 적으세요.","무엇이 잘되고 안 되는지 보입니다.",.3,.5]],
  [["횟수 늘리기","지난주보다 운동을 1번 늘리거나 시간을 10분 늘리세요.","부담 없이 조금씩 늘리는 것이 오래갑니다.",.6,1.5],
   ["환경 바꾸기","운동복을 미리 꺼내 두는 등 시작을 쉽게 만드는 장치 1개를 만드세요.","시작이 쉬워야 습관이 됩니다.",.1,0],
   ["돌아보기","한 주 기록을 보고 가장 잘된 날의 조건을 찾으세요.","잘된 조건을 반복합니다.",.3,.5]]],
 love_meet:[
  [["만남의 자리","관심사와 맞는 모임이나 수업에 {N2}번 나가 보세요.","새 인연은 새 자리에서 생깁니다.",.6,1.5],
   ["나를 알기","관계에서 원하는 것 3가지와 양보할 수 있는 것 3가지를 적으세요.","만남에서 무엇을 볼지 기준이 생깁니다.",.2,.5],
   ["소개 부탁","믿을 만한 지인 1명에게 소개나 모임 정보를 부탁하세요.","가까운 사람의 연결이 가장 확률이 높습니다.",.2,0]]],
 love_bond:[
  [["표현 한 번","가까운 사람에게 고마운 점 한 가지를 구체적으로 전하세요.","관계 회복은 작은 긍정 표현에서 시작합니다.",.2,0],
   ["대화 시간","방해 없이 30분 대화하는 시간을 한 번 잡으세요.","서로의 기대를 확인합니다.",.5,.5],
   ["나를 돌아보기","최근 다툼에서 내가 바꿀 수 있는 말투 하나를 적으세요.","상대를 바꾸기보다 쉬운 출발점입니다.",.3,.5]]],
 mind:[
  [["생각 적기","하루 10분, 떠오르는 고민을 판단 없이 적으세요.","머릿속을 비워야 방향이 보입니다.",.3,1],
   ["세 칸 표","‘하고 싶은 일 / 잘하는 일 / 돈이 되는 일’을 5개씩 적고 겹치는 것을 찾으세요.{K}","{G}에 맞는 후보를 좁힙니다.",.4,1],
   ["쉬는 시간","이번 주 일정에 아무것도 하지 않는 2시간을 먼저 넣으세요.","지친 상태로는 좋은 결정을 하기 어렵습니다.",.3,.5]]]};
const EXER=["숲길 걷기나 스트레칭","가벼운 유산소 운동","등산이나 계단 오르기","근력 운동","수영이나 가벼운 산책"];

function planKey(cat,goal){if(cat==="work")return"work_"+(goal&&goal.sub||"move");if(cat==="love")return"love_"+(goal&&goal.sub||"bond");return cat}
function buildPlan(){
  const g=readGoals(),goal=parseGoal(g.goal),{me,lucky,f}=S,ts=tg10(me,yearGz(f.Y).s);
  const auto=!g.concern&&!(goal&&goal.cat);
  const fromConcern=g.concern||["work","work","money","work","study"][ts.g];
  const mismatch=!!(goal&&goal.cat&&g.concern&&goal.cat!==g.concern);
  const cat=goal&&goal.cat&&(planBasis==="goal"||!g.concern)?goal.cat:fromConcern;
  const key=planKey(cat,cat===(goal&&goal.cat)?goal:null),ph=PHASES[key],week=planState.week;
  const step=ph[Math.min(week-1,ph.length-1)];
  const last=planState.history[planState.history.length-1];
  let load=1;if(last){const done=last.done.filter(Boolean).length,hard=last.diff.filter(d=>d==="hard").length,easy=last.diff.filter(d=>d==="easy").length;
    load=done===3&&easy>=2?1.2:done<=1||hard>=2?0.75:1}
  const H=g.hours*load,N=Math.max(1,Math.round(g.hours/2.5)),W=goal?Math.max(1,goal.weeks-(week-1)):12;
  const X=goal&&goal.exam?esc(goal.exam+(goal.stage?" "+goal.stage:"")):"목표 시험",G=goal?`‘${esc(goal.text)}’`:"목표";
  let A="";if(goal&&goal.amount){const won=goal.amount.u==="억"?goal.amount.v*10000:goal.amount.v;const per=Math.ceil(won/(goal.weeks/4.345));A=` 목표 금액을 기간으로 나누면 한 달에 약 ${per.toLocaleString()}만 원입니다. 부담되면 금액이나 기한을 조정하세요.`}
  const fill=s=>s.replace(/\{X\}/g,X).replace(/\{W\}/g,W).replace(/\{S\}/g,g.skills?esc(g.skills):"지금까지 해 온 일").replace(/\{N\}/g,N+1).replace(/\{N1\}/g,Math.min(5,N+1)).replace(/\{N2\}/g,N>2?2:1)
    .replace(/\{E\}/g,EXER[lucky[0]]).replace(/\{G\}/g,G).replace(/\{A\}/g,A).replace(/\{K\}/g,g.skills?` ${esc(g.skills)}도 한 칸에 넣어 보세요.`:"");
  const tasks=step.map(([t,body,why,r,min])=>({title:t,text:fill(body),why:fill(why),hours:Math.max(min,Math.round(H*r*2)/2)}));
  let total=tasks.reduce((a,t)=>a+t.hours,0);
  const cap=Math.round(g.hours*load*2)/2;            /* 가용 시간(체크인 반영) 안에 들도록 큰 과제부터 30분씩 줄임 */
  while(total>cap&&tasks.some(t=>t.hours>.5)){const t=tasks.reduce((a,b)=>b.hours>a.hours?b:a);t.hours-=.5;total-=.5}
  return{cat,key,week,load,auto,mismatch,goal,g,tasks,total,ts,adjusted:!!last};
}
function planHTML(compact){
  const p=buildPlan(),{goal,g}=p;
  const why=goal&&goal.cat?`적어 주신 목표 ${esc(goal.text)}${goal.exam?` (시험: ${esc(goal.exam)}${goal.stage?" "+goal.stage:""})`:""}, 남은 기간 약 ${Math.max(1,goal.weeks-(p.week-1))}주, 주당 ${g.hours}시간을 기준으로 만들었습니다.`
    :g.concern?`고른 고민 ‘${CONCERNS[g.concern]}’과 주당 ${g.hours}시간을 기준으로 만들었습니다.`:`목표와 고민을 적지 않아 올해 세운(${p.ts.n})에 맞춘 예시 과제입니다. ‘나의 목표’를 적으면 목표에 맞춰집니다.`;
  const warn=p.mismatch?`<div class="mismatch"><p>적어 주신 목표는 <b>‘${CONCERNS[goal.cat]}’</b> 쪽으로 보이는데, 고른 고민은 <b>‘${CONCERNS[g.concern]}’</b>입니다. 어느 쪽에 맞출까요?</p>
    <div class="row"><button type="button" class="btn ${planBasis==="goal"?"":"ghost"}" data-basis="goal">목표에 맞추기</button><button type="button" class="btn ${planBasis==="concern"?"":"ghost"}" data-basis="concern">고민에 맞추기</button></div></div>`:"";
  const over=p.total>g.hours+.01?`<p class="note warn">과제 시간 합계 ${p.total}시간이 원래 가용 시간 ${g.hours}시간보다 많습니다. 지난주에 여유가 있어 늘렸지만, 벅차면 2번 과제를 다음 주로 넘기세요.</p>`:`<p class="note">과제 시간 합계 <b>${p.total}시간</b> / 가용 시간 ${g.hours}시간</p>`;
  return`<!--plan--><div class="card avoid plancard"><span class="label">${p.week}주차 실행 과제 · ${CONCERNS[p.cat]} <span class="src site">사용자 입력 기반 제안</span></span>
   ${compact?"":warn}<p class="note">${why}${p.adjusted?` 지난주 체크인 결과로 분량을 ${p.load>1?"20% 늘렸습니다":p.load<1?"25% 줄였습니다":"유지했습니다"}.`:""}</p>
   <ol class="tasks">${p.tasks.map(t=>`<li><b>${t.title}</b> · ${t.text}${compact?"":`<br><span class="note">목표 기여: ${t.why} · 예상 ${t.hours}시간</span>`}</li>`).join("")}</ol>
   ${compact?"":over}${compact?"":`<p class="note">사주 참고(재미용): 올해 세운이 ${p.ts.n}이라 ${["자립","표현","실리","책임","배움"][p.ts.g]}의 기운이 함께합니다. 과제는 사주가 아니라 적어 주신 목표와 시간에서 나왔습니다.</p>`}</div><!--/plan-->`;
}
/* 주간 체크인 UI */
function checkinHTML(){
  const p=buildPlan();
  return`<div class="card avoid"><span class="label">${p.week}주차 체크인 · 한 주가 끝나면 표시하세요</span>
   ${p.tasks.map((t,i)=>`<div class="ci"><label class="checks"><input type="checkbox" id="ci-done-${i}"> ${t.title}</label>
     <select id="ci-diff-${i}" aria-label="${t.title} 난이도"><option value="ok">적당했음</option><option value="easy">쉬웠음</option><option value="hard">어려웠음</option></select></div>`).join("")}
   <input id="ci-memo" maxlength="120" placeholder="한 줄 회고 (선택)" autocomplete="off">
   <div class="row"><button type="button" class="btn" id="ci-next">다음 주 계획 만들기</button>
    <button type="button" class="btn ghost" id="ci-export">계획 파일로 내보내기</button>
    <label class="btn ghost" for="ci-import" style="cursor:pointer">불러오기</label><input type="file" id="ci-import" accept=".json,application/json" hidden>
    <button type="button" class="btn ghost" id="ci-reset">처음부터</button></div>
   <p class="note">기록은 이 화면에만 있다가 창을 닫으면 사라집니다. 다음 주에 이어 쓰려면 ‘계획 파일로 내보내기’로 내 기기에 저장한 뒤 ‘불러오기’로 여세요. 사이트는 이 파일을 받거나 보관하지 않습니다.</p></div>
   ${planState.history.length?`<div class="card"><span class="label">지난 기록</span><ul style="margin:0;padding-left:1.2em">${planState.history.map(h=>`<li>${h.week}주차 · 완료 ${h.done.filter(Boolean).length}/3${h.memo?` · ${esc(h.memo)}`:""}</li>`).join("")}</ul></div>`:""}`;
}
function bPlan(){
  const s=`${planHTML(false)}${checkinHTML()}`;
  return{s,d:""};
}
function planExport(){
  const g=readGoals(),data={app:"운명 연구소",rules:PLAN_RULES,saved:new Date().toISOString().slice(0,10),goals:g,basis:planBasis,state:planState};
  const txt=JSON.stringify(data,null,2),name=`운명연구소_계획_${data.saved}.json`;
  if(window.claude&&window.claude.use)return window.claude.use("downloads").then(dl=>dl?dl.save({filename:name,data:txt}):Promise.reject({code:"unavailable"}))
    .then(()=>flash("계획 파일을 저장했습니다."),e=>flash(e&&e.code==="declined"?"저장을 취소했습니다.":"이 화면에서는 파일 저장을 지원하지 않습니다."));
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);flash("계획 파일을 내려받았습니다.");
}
function planImport(file){
  const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(d.app!=="운명 연구소"||!d.state)throw 0;
    planState={week:+d.state.week||1,history:Array.isArray(d.state.history)?d.state.history.slice(-26):[]};planBasis=d.basis==="concern"?"concern":"goal";
    if(d.goals){$("concern").value=d.goals.concern||"";$("hours").value=String(d.goals.hours||4);$("skills").value=d.goals.skills||"";$("goal3").value=d.goals.goal||""}
    refreshPlan();flash(`${planState.week}주차 계획을 불러왔습니다.`)}catch(e){flash("운명 연구소 계획 파일이 아닙니다.")}};r.readAsText(file);
}
function flash(m){const n=$("planmsg");if(n){n.textContent=m;n.hidden=false}}
function refreshPlan(){if(!S)return;setBody("plan",bPlan());setBody("me",bPersona());setBody("wisdom",bWisdom())}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-basis]");if(b){planBasis=b.dataset.basis;refreshPlan();return}
  if(e.target.id==="ci-next"){const p=buildPlan();planState.history.push({week:p.week,cat:p.cat,done:p.tasks.map((_,i)=>$("ci-done-"+i).checked),diff:p.tasks.map((_,i)=>$("ci-diff-"+i).value),memo:$("ci-memo").value.trim().slice(0,120)});
    planState.week++;refreshPlan();flash(`${planState.week}주차 계획을 만들었습니다.`);$("v-plan").scrollIntoView({behavior:"smooth",block:"start"})}
  if(e.target.id==="ci-export")planExport();
  if(e.target.id==="ci-reset"){planState={week:1,history:[]};refreshPlan();flash("1주차부터 다시 시작합니다.")}
});
document.addEventListener("change",e=>{if(e.target.id==="ci-import"&&e.target.files[0]){planImport(e.target.files[0]);e.target.value=""}});
