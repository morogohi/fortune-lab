/* 운명 연구소 · 앱 로직 (저장 없음: 모든 값은 메모리에서만 계산) */
const DECK=buildDeck();
fillProfileInputs();
["mbti","pmbti"].forEach(id=>MB.forEach(m=>$(id).add(new Option(m,m))));
$("mbti").value="INTJ";$("pmbti").value="ENFP";
let S=null,lastDraw=null;
const TABS=["saju","me","luck","tojeong","tarot","star","match","career","share"];
const LVTABS=["saju","me","luck","tojeong","tarot","star","match","career"];
const pct=(c,t)=>t?c/t*100:0;
const lacksOf=cnt=>cnt.map((c,i)=>c===0?i:-1).filter(i=>i>=0);
function bRel(a,b){const he=[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]].some(([x,z])=>(x===a&&z===b)||(x===b&&z===a));
  return he?"he":(a%4===b%4&&a!==b)?"sam":mod(a-b,12)===6?"chung":"none"}

/* ===== 계산 ===== */
function readForm(){
  const [y,m,d]=($("birth").value||"").split("-").map(Number);
  const [hh,mm]=($("btime").value||"12:00").split(":").map(Number);
  return{name:esc($("name").value.trim()||"당신"),cal:$("cal").value,y,m,d,hh,mm,unk:$("tunk").checked||!$("btime").value,corr:$("corr").checked,g:$("gender").value,mbti:$("mbti").value,Y:+$("year").value};
}
function analyze(P){
  const me=P.d.s,cnt=[0,0,0,0,0];[P.y,P.m,P.d,P.h].forEach(p=>{if(p){cnt[SE[p.s]]++;cnt[BE[p.b]]++}});
  const gc=[0,0,0,0,0];
  [P.y,P.m,P.h].forEach(p=>{if(p)gc[tg10(me,p.s).g]++});
  [["y",P.y],["m",P.m],["d",P.d],["h",P.h]].forEach(([k,p])=>{if(p)gc[tg10(me,HID[p.b]).g]+=k==="m"?2:1});
  const strong=gc[0]+gc[4]>=4;
  const lucky=strong?[mod(SE[me]+1,5),mod(SE[me]+2,5)]:[mod(SE[me]+4,5),SE[me]];
  // 신살
  const brs=[P.y,P.m,P.d,P.h].filter(Boolean).map(p=>p.b),ss=[];
  const DO={0:9,2:3,1:6,3:0},YM={0:2,2:8,1:11,3:5},HG={0:4,2:10,1:1,3:7};
  [P.y.b,P.d.b].forEach(base=>{const g=base%4;
    if(brs.includes(DO[g]))ss.push("도화");if(brs.includes(YM[g]))ss.push("역마");if(brs.includes(HG[g])&&HG[g]!==base)ss.push("화개")});
  const GW={0:[1,7],4:[1,7],6:[1,7],1:[0,8],5:[0,8],2:[11,9],3:[11,9],7:[2,6],8:[5,3],9:[5,3]};
  if(brs.some(b=>GW[me].includes(b)))ss.push("귀인");
  return{me,cnt,gc,strong,lucky,sinsal:[...new Set(ss)]};
}
function compute(){
  const f=readForm();if(!f.y)return false;
  let P;try{P=pillars(f.cal,f.y,f.m,f.d,f.hh,f.mm,f.unk,f.corr,f.g)}catch(e){$("chart").innerHTML=`<p>입력한 음력 날짜가 그해 달력에 없습니다. 윤달 여부와 날짜(29일·30일)를 확인하세요.</p>`;return false}
  S={f,P,...analyze(P)};
  S.z=zodiac(P.solar.m,P.solar.d);
  // 토정
  const lm=Math.abs(P.lunar.m),ld=P.lunar.d,age=f.Y-P.lunar.y+1,yg=yearGz(f.Y);
  const num=g=>{const x=gzi(g);return TAE.s[x.s]+TAE.b[x.b]};
  const tae=TAE.s[yg.s]+TAE.b[yg.b],up=mod(age+tae,8)||8;
  const dc=LunarYear.fromYear(f.Y).getMonth(lm).getDayCount(),L2=Lunar.fromYmd(f.Y,lm,Math.min(ld,dc));
  const wg=num(L2.getMonthInGanZhi()),ij=num(L2.getDayInGanZhi());
  const mid=mod(dc+wg,6)||6,low=mod(ld+ij,3)||3;
  S.tj={lm,ld,age,tae,up,dc,wg,ij,mid,low,code:up*100+mid*10+low,tone:["길(吉) · 순풍이 부는 해","평(平) · 지키면 얻는 해","주의 · 내실을 다지는 해"][(up+mid+low)%3]};
  // 직업
  const e=SE[S.me],max=S.cnt.indexOf(Math.max(...S.cnt)),t=f.mbti;
  S.temp=t[1]==="N"?(t[2]==="T"?"NT":"NF"):(t[2]==="T"?"ST":"SF");
  const out=[...FJOB[S.temp].map(j=>[j[0],`미래 유망 · ${S.temp} 기질의 ${j[1]}`]),...EJOB[e].slice(0,2).map(j=>[j[0],`일간 ${EN[e]} · ${j[1]}`]),
    ...EJOB[max].slice(max===e?2:0,max===e?3:1).map(j=>[j[0],`강한 오행 ${EN[max]} · ${j[1]}`]),[MJOB[t],`MBTI ${t}의 전통 적성`]];
  const seen=new Set();S.jobs=out.filter(j=>!seen.has(j[0])&&seen.add(j[0]));
  return true;
}

/* ===== 공통 조각 ===== */
function heroHTML(C,cls=""){
  const {f,P,me,z,strong}=S,dm=DMX[me],so=P.solar,lu=P.lunar;
  return`<div class="hero ${cls}"><div>${scene(me,C)}</div>
    <div class="section" style="gap:10px"><div class="label">${f.name}님의 본성 이미지</div>
      <div class="big"><span class="e${SE[me]}">${ST[me]}${EK[SE[me]]}</span> · ${dm.nm}</div><p>${dm.key}</p>
      <div class="tags"><span class="pill">${ANI[P.y.b]}띠</span><span class="pill">${z[0]}</span><span class="pill">${f.mbti}</span><span class="pill">${strong?"신강":"신약"}</span></div>
      <div class="lunar">양력 ${so.y}.${so.m}.${so.d} · 음력 ${lu.y}.${lu.m<0?"윤"+(-lu.m):lu.m}.${lu.d}${f.unk?" · 시각 모름":` · ${$("btime").value}${f.corr?" (보정 −32분)":""}`}</div></div></div>`}
function pillarsHTML(){
  const {P,me,cnt}=S,cols=[["시주",P.h],["일주",P.d],["월주",P.m],["년주",P.y]],tot=cnt.reduce((a,b)=>a+b,0);
  return`<div class="pillars avoid">${cols.map(([c,p])=>{const day=c==="일주";
     if(!p)return`<div class="pillar"><span class="cap">${c}</span><span class="tg">&nbsp;</span><span class="han" style="color:var(--muted)">?</span><span class="han" style="color:var(--muted)">?</span><span class="tg">&nbsp;</span><span class="ko">시각 모름</span></div>`;
     return`<div class="pillar ${day?"day":""}"><span class="cap">${c}</span><span class="tg">${day?"일간":tg10(me,p.s).n}</span><span class="han e${SE[p.s]}">${ST[p.s]}</span><span class="han e${BE[p.b]}">${BR[p.b]}</span><span class="tg">${tg10(me,HID[p.b]).n}</span><span class="ko">${STK[p.s]}${BRK[p.b]}</span></div>`}).join("")}</div>
   <div class="bars avoid">${cnt.map((c,i)=>`<div class="bar"><div class="track"><div class="fill b${i}" style="height:${pct(c,tot)}%"></div></div><span class="e${i}" style="font-weight:600">${EN[i]}</span><span class="num">${c}</span></div>`).join("")}</div>`}

/* ===== 사주풀이 ===== */
function bSaju(){
  const {P,cnt,gc,strong,lucky,me,sinsal}=S,dm=DMX[me];
  const lacks=lacksOf(cnt),max=cnt.indexOf(Math.max(...cnt)),gmax=gc.indexOf(Math.max(...gc)),gl=lacksOf(gc);
  const s=`<h3>${ST[me]}${EK[SE[me]]} 일간 · ${dm.nm}</h3>
  <dl class="dl">${["성격","강점","약점","연애","재물","건강"].map(k=>`<dt>${k}</dt><dd>${dm[k]}</dd>`).join("")}</dl>
  <div class="grid2">
   <div class="card"><span class="label">신강 · 신약</span><h3>${strong?"신강(身强) · 내 기운이 강한 편":"신약(身弱) · 도움 기운이 필요한 편"}</h3>
    <p>${strong?"스스로 밀고 나가는 힘이 있습니다. 힘을 쓸 곳(표현·재물·직위)을 만들어 줄 때 운이 열립니다.":"혼자보다 팀과 후원자가 중요합니다. 배움과 동료의 기운을 채울 때 운이 열립니다."}</p></div>
   <div class="card"><span class="label">행운의 오행</span><h3>${lucky.map(i=>`<span class="e${i}">${EN[i]}</span>`).join(" · ")}</h3><p>색 ${ECOL[lucky[0]]}, 방향 ${EDIR[lucky[0]]}, 숫자 ${ENUM[lucky[0]]}. ${dm.개운}이 기운을 돋웁니다.</p></div>
   <div class="card"><span class="label">가장 강한 오행</span><h3 class="e${max}">${EN[max]}</h3><p>${["성장과 기획","표현과 열정","신용과 중재","결단과 실행","지혜와 유연함"][max]}의 기운이 삶의 색깔을 만듭니다.</p></div>
   <div class="card"><span class="label">부족한 오행</span><h3>${lacks.length?lacks.map(i=>`<span class="e${i}">${EN[i]}</span>`).join(" · "):"고르게 분포"}</h3><p>${lacks.length?`${EN[lacks[0]]}의 색(${ECOL[lacks[0]]})과 방향(${EDIR[lacks[0]]})을 생활에 들이면 균형에 도움이 됩니다.`:"오행이 고루 갖춰진 드문 명식입니다."}</p></div>
  </div>
  <div class="card avoid"><span class="label">십신 분포 · 무엇으로 사는가</span>
   <div class="bars" style="margin-top:6px">${gc.map((c,i)=>`<div class="bar"><div class="track" style="height:44px"><div class="fill" style="background:var(--accent);height:${Math.min(100,c/8*100)}%"></div></div><span style="font-weight:600;font-size:13px">${GRP[i]}</span><span class="num">${c}</span></div>`).join("")}</div>
   <p><b>${GRP[gmax]}</b>이 가장 강합니다. ${GDOM[gmax]}</p>${gl.length?`<p>${gl.map(i=>`<b>${GRP[i]}</b>이 없습니다. ${GLACK[i]}`).join(" ")}</p>`:""}</div>`;
  const cols=[P.y,P.m,P.d,P.h];
  const pRows=cols.map((p,i)=>{if(!p)return`<div class="card"><span class="label">${POS[i][0]}</span><p>태어난 시각을 모르면 시주는 풀이하지 않습니다. ${POS[i][1]}을 보는 자리입니다.</p></div>`;
    const ts=i===2?null:tg10(me,p.s),tb=tg10(me,HID[p.b]);
    return`<div class="card"><span class="label">${POS[i][0]} · ${ST[p.s]}${BR[p.b]} (${STK[p.s]}${BRK[p.b]})</span><p class="note">${POS[i][1]}</p>
     ${ts?`<p><b>천간 ${ST[p.s]} · ${ts.n}</b> — ${TGX[ts.n][0]} ${TGX[ts.n][1]}</p>`:`<p><b>천간 ${ST[p.s]} · 일간(나)</b> — ${DMX[me].key}. 이 글자가 사주 전체의 주인공입니다.</p>`}
     <p><b>지지 ${BR[p.b]}(${ANI[p.b]}) · ${tb.n}</b> — ${TGX[tb.n][0]} ${i===2?"":POS[i][2]}</p><p class="note">주의할 점: ${TGX[tb.n][2]}</p></div>`}).join("");
  const sp=tg10(me,HID[P.d.b]);
  const present=[...new Set([P.y,P.m,P.h].filter(Boolean).map(p=>tg10(me,p.s).n).concat(cols.filter(Boolean).map(p=>tg10(me,HID[p.b]).n)))];
  const d=`<div class="dethead">기둥별 상세 해설</div><div class="grid2">${pRows}</div>
  <div class="card avoid"><span class="label">배우자궁 · 일지 ${BR[P.d.b]} (${sp.n})</span><p>${SPOUSE[sp.g]}</p><p class="note">${TGX[sp.n][0]}</p></div>
  <div class="dethead">오행별 상세</div>
  <div class="tw"><table class="t"><tr><th>오행</th><th>개수</th><th>해석</th></tr>${cnt.map((c,i)=>`<tr><td class="e${i}" style="font-weight:600">${EN[i]}</td><td class="num">${c}</td><td>${ELV[i][c===0?0:c<=2?1:2]}</td></tr>`).join("")}</table></div>
  <div class="dethead">내 사주에 있는 십신</div>
  <div class="grid2">${present.map(n=>`<div class="card"><h3>${n}</h3><p>${TGX[n][0]}</p><p>${TGX[n][1]}</p><p class="note">주의: ${TGX[n][2]}</p></div>`).join("")}</div>
  <div class="dethead">신살</div>
  ${sinsal.length?`<div class="grid2">${sinsal.map(k=>`<div class="card"><h3>${SINSAL[k][0]}</h3><p>${SINSAL[k][1]}</p></div>`).join("")}</div>`:`<p>도화·역마·화개·천을귀인 가운데 뚜렷하게 드러나는 신살은 없습니다. 특정 기운에 치우치지 않아 상황에 따라 고르게 쓰는 사주입니다.</p>`}
  <p class="note">신살은 년지·일지 기준 삼합으로, 천을귀인은 일간 기준으로 보았습니다. 신강·신약은 비겁과 인성의 합(월지 2배)으로 간단히 판정합니다.</p>`;
  return{s,d};
}

/* ===== 대운·세운 ===== */
function bLuck(){
  const {f,P,me}=S,yg=yearGz(f.Y),ts=tg10(me,yg.s),tb=tg10(me,HID[yg.b]),sx=SEUN[ts.g];
  const cur=P.dy.find(x=>f.Y>=x.yr&&f.Y<x.yr+10),ct=cur?tg10(me,cur.gz.s):null;
  const months=[];for(let k=0;k<12;k++){const m=k+2,yy=m>12?f.Y+1:f.Y,mm=m>12?m-12:m;
    const gz=gzi(Solar.fromYmd(yy,mm,20).getLunar().getMonthInGanZhiExact());months.push({yy,mm,gz,t:tg10(me,gz.s),tb:tg10(me,HID[gz.b])})}
  const s=`<h3>대운 · 10년 주기 흐름</h3>
  <div class="dayun">${P.dy.map(x=>`<div class="dy ${x===cur?"now":""}"><span class="num">${x.age}세</span><span class="han e${SE[x.gz.s]}">${ST[x.gz.s]}</span><span class="han e${BE[x.gz.b]}">${BR[x.gz.b]}</span><span class="tg">${tg10(me,x.gz.s).n}</span><span class="note">${x.yr}</span></div>`).join("")}</div>
  ${cur?`<p>${f.Y}년은 <b>${ST[cur.gz.s]}${BR[cur.gz.b]} 대운</b>(${cur.yr}–${cur.yr+9}) 안에 있습니다. 대운 천간이 <span class="pill">${ct.n}</span>이라 이 10년의 큰 주제는 ‘${["자립과 경쟁","표현과 성과","재물과 실리","직위와 책임","배움과 후원"][ct.g]}’입니다.</p>`:""}
  <h3>${f.Y}년 세운 · ${ST[yg.s]}${BR[yg.b]} ${STK[yg.s]}${BRK[yg.b]}년</h3>
  <div class="tags"><span class="pill">천간 ${ts.n}</span><span class="pill">지지 ${tb.n}</span></div>
  <dl class="dl">${["총운","직업","재물","연애","건강"].map(k=>`<dt>${k}</dt><dd>${sx[k]}</dd>`).join("")}</dl>
  <h3>월운 · 절기 기준 12개월</h3>
  <div class="months">${months.map(o=>`<div class="month"><b>${o.mm}월</b><span>${ST[o.gz.s]}${BR[o.gz.b]} · ${o.t.n}<small>${WOL[o.t.g]}</small></span></div>`).join("")}</div>`;
  const d=`<div class="dethead">대운별 상세 해설</div>
  <div class="grid2">${P.dy.map(x=>{const a=tg10(me,x.gz.s),b=tg10(me,HID[x.gz.b]);return`<div class="card" ${x===cur?'style="border-color:var(--accent)"':""}><span class="label">${x.age}–${x.age+9}세 · ${x.yr}–${x.yr+9}${x===cur?" · 현재":""}</span>
    <h3><span class="e${SE[x.gz.s]}">${ST[x.gz.s]}</span><span class="e${BE[x.gz.b]}">${BR[x.gz.b]}</span> 대운 · ${a.n} / ${b.n}</h3><p>${DTHEME[a.g]}</p><p class="note">후반 5년은 지지 ${b.n}의 기운이 커집니다. ${TGX[b.n][1]}</p></div>`}).join("")}</div>
  <div class="dethead">${f.Y}년 세운 상세</div>
  <div class="grid2"><div class="card"><span class="label">상반기 · 천간 ${ST[yg.s]} ${ts.n}</span><p>${TGX[ts.n][0]} ${sx.총운}</p><p class="note">${TGX[ts.n][2]}</p></div>
   <div class="card"><span class="label">하반기 · 지지 ${BR[yg.b]} ${tb.n}</span><p>${TGX[tb.n][0]} ${SEUN[tb.g].총운}</p><p class="note">${TGX[tb.n][2]}</p></div>
   <div class="card"><span class="label">일지와의 관계 · ${BR[P.d.b]} ↔ ${BR[yg.b]}</span><p>${BRELX[bRel(P.d.b,yg.b)]}</p></div>
   <div class="card"><span class="label">대운과 세운의 조합</span><p>${cur?`10년 흐름(${ct.n})과 올해의 기운(${ts.n})이 ${ct.g===ts.g?"같은 방향이라 그 주제가 아주 강하게 드러나는 해입니다.":"서로 다른 주제라 두 가지 일을 함께 챙겨야 하는 해입니다."}`:"대운 정보가 없습니다."}</p></div></div>
  <div class="dethead">월운 상세</div>
  <div class="months">${months.map(o=>`<div class="month"><b>${o.mm}월</b><span>${ST[o.gz.s]}${BR[o.gz.b]} · ${o.t.n}/${o.tb.n}<small>${WOLX[o.t.g]} ${o.tb.g!==o.t.g?WOL[o.tb.g]:""}</small></span></div>`).join("")}</div>
  <p class="note">각 달은 그달 절입일(4–8일경)부터 다음 달 절입 전까지입니다. 대운 시작 나이는 성별과 출생 후 절기까지의 날짜로 계산합니다.</p>`;
  return{s,d};
}

/* ===== 토정비결 ===== */
function bTojeong(){
  const {f}=S,t=S.tj;
  const ms=Array.from({length:12},(_,i)=>({a:MPOOL[hash(t.code*13+i*7)%MPOOL.length],b:MADV[hash(t.code*7+i*11)%MADV.length],q:hash(t.code*3+i*5)%3}));
  const s=`<h3>${f.Y}년 토정비결</h3>
  <div class="grid2"><div class="card"><span class="label">작괘 (상 · 중 · 하)</span><span class="gwae">${t.up} ${t.mid} ${t.low}</span>
   <span class="note">상괘: 세는나이 ${t.age} + 태세수 ${t.tae} ÷ 8<br>중괘: 음력 ${t.lm}월 ${t.dc===30?"대월 30":"소월 29"} + 월건수 ${t.wg} ÷ 6<br>하괘: 생일 ${t.ld} + 일진수 ${t.ij} ÷ 3</span></div>
  <div class="card"><span class="label">총평</span><h3>${t.tone}</h3><p>“${UP[t.up-1]}.”</p><p>${UPX[t.up-1]}</p></div></div>
  <dl class="dl"><dt>재물·가정</dt><dd>${MID[t.mid-1]}.</dd><dt>처세</dt><dd>${LOW[t.low-1]}.</dd></dl>
  <h3>월별 신수 (음력)</h3><div class="months">${ms.map((m,i)=>`<div class="month"><b>${i+1}월</b><span>${m.a}</span></div>`).join("")}</div>`;
  const good=ms.map((m,i)=>m.q===0?i+1:0).filter(Boolean),bad=ms.map((m,i)=>m.q===2?i+1:0).filter(Boolean);
  const d=`<div class="dethead">괘 상세 풀이</div>
  <dl class="dl"><dt>상괘 ${t.up}</dt><dd>${UPD[t.up-1]}</dd><dt>중괘 ${t.mid}</dt><dd>${MIDD[t.mid-1]}</dd><dt>하괘 ${t.low}</dt><dd>${LOWD[t.low-1]}</dd></dl>
  <div class="grid2"><div class="card"><span class="label">기운이 좋은 달</span><h3>${good.length?good.map(x=>x+"월").join(" · "):"고르게 평탄"}</h3><p>새 일을 시작하거나 중요한 약속을 잡기 좋습니다.</p></div>
   <div class="card"><span class="label">조심할 달</span><h3>${bad.length?bad.map(x=>x+"월").join(" · "):"특별히 없음"}</h3><p>큰 지출과 계약은 한 번 더 확인하고, 건강을 챙기세요.</p></div></div>
  <div class="dethead">월별 상세 신수와 실천 팁</div>
  <div class="months">${ms.map((m,i)=>`<div class="month ${m.q===0?"hi":""}"><b>${i+1}월</b><span>${m.a}<small>${["기운 좋음","보통","조심"][m.q]} · ${m.b}</small></span></div>`).join("")}</div>
  <p class="note">음력 생월·생일을 기준으로 ${f.Y}년 해당 음력 달의 크기와 월건·일진의 수로 괘를 뽑았습니다. 괘사는 원전을 요약한 현대어 풀이입니다.</p>`;
  return{s,d};
}

/* ===== 별자리·MBTI ===== */
function bStar(){
  const {f,z}=S,zx=ZX[z[0]],ze=ZEX[z[0]],t=f.mbti,mt=MBT[t],fn=MFN[t],tp=TEMPX[S.temp];
  const s=`<div class="grid2">
   <div class="card"><span class="glyph">${zx[0]}&#xFE0E;</span><h3>${z[0]}</h3><div class="tags"><span class="pill">${z[3]}의 원소</span><span class="pill">수호성 ${zx[1]}</span></div>
    <dl class="dl"><dt>성격</dt><dd>${zx[2]}</dd><dt>연애</dt><dd>${zx[3]}</dd><dt>일</dt><dd>${zx[4]}</dd><dt>행운</dt><dd>${zx[5]}</dd></dl></div>
   <div class="card"><span class="glyph" style="font-family:var(--mono);font-size:36px">${t}</span><h3>${mt[0]}</h3>
    <div class="dim">${t.split("").map(c=>`<b>${c}</b><span>${DIMX[c]}</span>`).join("")}</div>
    <dl class="dl"><dt>강점</dt><dd>${mt[1]}</dd><dt>약점</dt><dd>${mt[2]}</dd><dt>연애</dt><dd>${mt[3]}</dd></dl></div></div>
  <div class="card"><span class="label">세 가지 렌즈의 교차점</span><p>사주의 일간 <b>${DMX[S.me].nm}</b>, ${z[0]}의 <b>${z[3]}</b> 원소, ${t}의 <b>${mt[0]}</b> 성향이 겹치는 지점이 핵심 강점입니다. ${["불","바람"].includes(z[3])===(t[0]==="E")?"외향 기질이 별자리와 MBTI에서 일관되게 나타납니다.":"별자리와 MBTI의 기질이 서로 다르게 나타나, 상황에 따라 모드를 바꾸는 유연함이 무기입니다."}</p></div>`;
  const d=`<div class="dethead">별자리 상세</div>
  <div class="grid2"><div class="card"><span class="label">강점</span><p>${ze[0]}</p></div><div class="card"><span class="label">약점</span><p>${ze[1]}</p></div>
   <div class="card"><span class="label">잘 맞는 별자리</span><p>${ze[2]}</p></div><div class="card"><span class="label">${z[3]}의 원소</span><p>${ZEL[z[3]]}</p></div></div>
  <div class="dethead">MBTI 인지기능</div>
  <div class="grid2"><div class="card"><span class="label">주기능 · ${fn[0]}</span><p>${FNX[fn[0]]}</p><p class="note">가장 자연스럽게 쓰는 능력으로, 몰입할 때 이 기능이 앞장섭니다.</p></div>
   <div class="card"><span class="label">부기능 · ${fn[1]}</span><p>${FNX[fn[1]]}</p><p class="note">주기능을 보조하며, 이 기능을 키울수록 균형이 잡힙니다.</p></div>
   <div class="card"><span class="label">기질 · ${S.temp} ${tp[0]}</span><p>${tp[1]}</p></div>
   <div class="card"><span class="label">사주와 연결</span><p>${["확장","표현","안정","결단","지혜"][SE[S.me]]}을 상징하는 일간 기운이 ${fn[0]} 주기능과 만나, ${t[0]==="E"?"사람들 앞에서":"혼자 깊이 몰입할 때"} 가장 큰 성과를 냅니다.</p></div></div>`;
  return{s,d};
}

/* ===== 적성·직업 ===== */
function bCareer(){
  const {f,cnt,me,gc,strong,P}=S,e=SE[me],max=cnt.indexOf(Math.max(...cnt)),t=f.mbti,gmax=gc.indexOf(Math.max(...gc));
  const s=`<div class="grid2"><div class="card"><span class="label">일하는 방식</span><p>${t[3]==="J"?"마감과 체계가 분명한 조직":"재량권이 큰 프로젝트형 조직"}에서 강합니다. ${t[0]==="E"?"사람을 만나는 대외 업무":"깊이 몰입하는 전문 업무"}가 에너지를 지켜 줍니다.</p></div>
  <div class="card"><span class="label">사주 적성</span><p>${["기획·교육·성장","표현·마케팅·에너지","관리·중재·부동산","기술·실행·보안","분석·전략·유통"][e]} 계열이 일간과 맞고, 강한 ${EN[max]} 기운이 ${["확장성","추진력","안정감","정확성","통찰력"][max]}을 더합니다.</p></div>
  <div class="card"><span class="label">성공 방식 · ${GRP[gmax]} 중심</span><p>${["자기 이름을 건 독립·전문직","콘텐츠·기술·교육으로 결과물을 내는 일","영업·사업·투자처럼 성과가 숫자로 나오는 일","조직 안에서 직급과 자격으로 올라가는 일","연구·학위·자격으로 권위를 쌓는 일"][gmax]}에서 가장 빠르게 성장합니다.</p></div>
  <div class="card"><span class="label">피해야 할 환경</span><p>${t[3]==="J"?"우선순위가 매일 바뀌는 혼란한 조직":"세세한 규정과 보고가 많은 조직"}, ${strong?"재량 없이 지시만 따르는 자리":"혼자 모든 것을 떠안는 자리"}는 실력을 깎아 먹습니다.</p></div></div>
  <div>${S.jobs.map((j,i)=>`<div class="job"><span class="rank">${String(i+1).padStart(2,"0")}</span><b>${j[0]}</b><span class="tag">${j[1]}</span></div>`).join("")}</div>`;
  const peaks=P.dy.filter(x=>[2,3,1].includes(tg10(me,x.gz.s).g));
  const d=`<div class="dethead">오행별 어울리는 업종</div>
  <div class="tw"><table class="t"><tr><th>구분</th><th>오행</th><th>업종</th></tr>
   <tr><td>일간</td><td class="e${e}">${EN[e]}</td><td>${EIND[e]}</td></tr>${max!==e?`<tr><td>강한 오행</td><td class="e${max}">${EN[max]}</td><td>${EIND[max]}</td></tr>`:""}
   ${S.lucky.map(i=>`<tr><td>행운 오행</td><td class="e${i}">${EN[i]}</td><td>${EIND[i]}</td></tr>`).join("")}</table></div>
  <div class="dethead">커리어 상승기 (대운 기준)</div>
  ${peaks.length?`<div class="grid2">${peaks.map(x=>{const a=tg10(me,x.gz.s);return`<div class="card"><span class="label">${x.age}–${x.age+9}세 · ${x.yr}–${x.yr+9}</span><h3>${ST[x.gz.s]}${BR[x.gz.b]} · ${a.n}</h3><p>${["","결과물과 성과로 이름을 알리는 시기","재물과 사업 기회가 커지는 시기","직위와 책임이 올라가는 시기"][a.g]}입니다.</p></div>`}).join("")}</div>`:"<p>대운이 고르게 흘러 특정 시기보다 꾸준함이 커리어를 만듭니다.</p>"}
  <div class="dethead">미래 직업 준비 로드맵 · ${S.temp}</div>
  <ol style="margin:0;padding-left:1.3em">${ROADMAP[S.temp].map((r,i)=>`<li><b>${["지금","1–2년","3–5년"][i]}</b> · ${r}</li>`).join("")}</ol>
  <p class="note">추천 직업은 사주 오행과 MBTI 기질을 조합한 참고용 제안입니다.</p>`;
  return{s,d};
}

/* ===== 궁합 ===== */
function bMatch(){
  const [y,m,d0]=($("pbirth").value||"").split("-").map(Number);if(!y)return{s:"<p>상대 생년월일을 입력하세요.</p>",d:""};
  let Q;try{Q=pillars($("pcal").value,y,m,d0,12,0,true,false,"m")}catch(e){return{s:`<p class="note">상대의 음력 날짜가 그해 달력에 없습니다.</p>`,d:""}}
  const QA=analyze(Q);
  const A=S.P,rel=$("rel").value,pn=esc($("pname").value.trim()||"상대"),nm=S.f.name;
  const r=mod(SE[Q.d.s]-SE[A.d.s],5),dmS=[70,85,65,60,90][r];
  const yr=bRel(A.y.b,Q.y.b),dr=bRel(A.d.b,Q.d.b);
  const bs={he:95,sam:88,chung:45,none:68},brS=rel==="love"?Math.round((bs[yr]+bs[dr])/2):bs[yr];
  const z1=S.z[3],z2=zodiac(Q.solar.m,Q.solar.d)[3];
  const zS=z1===z2?85:(["불바람","바람불","흙물","물흙"].includes(z1+z2)?90:60);
  const m1=S.f.mbti,m2=$("pmbti").value;
  const mScore={love:(m1[1]===m2[1]?25:8)+(m1[0]!==m2[0]?20:12)+(m1[2]!==m2[2]?18:14)+(m1[3]!==m2[3]?17:13),
    work:(m1[3]===m2[3]?25:12)+(m1[1]===m2[1]?22:12)+(m1[2]!==m2[2]?20:15)+15,
    hobby:(m1[0]===m2[0]?25:15)+(m1[1]===m2[1]?25:12)+(m1[3]===m2[3]?18:14)+12}[rel];
  const w={love:[.35,.25,.15,.25],work:[.3,.15,.1,.45],hobby:[.2,.2,.25,.35]}[rel];
  const total=Math.round(dmS*w[0]+brS*w[1]+zS*w[2]+mScore*w[3]);
  const relK={love:"연인",work:"직장",hobby:"취미"}[rel];
  const dmTxt=[`같은 오행이라 서로를 거울처럼 이해합니다. 다만 고집이 부딪히면 둘 다 양보하지 않습니다.`,
   `${nm}님이 ${pn}님을 키워 주는 관계입니다. 베푸는 쪽이 지치지 않게 주고받는 균형을 잡으세요.`,
   `${nm}님이 주도권을 쥐는 관계입니다. 상대의 자율을 존중할수록 오래 갑니다.`,
   `${pn}님이 ${nm}님을 다잡아 주는 관계입니다. 긴장감이 성장의 동력이 됩니다.`,
   `${pn}님이 ${nm}님을 든든히 받쳐 주는 관계입니다. 감사 표현이 관계를 지킵니다.`][r];
  const bt={he:"육합(六合) · 자연스럽게 끌리는 인연입니다.",sam:"삼합(三合) · 목표를 함께 이루는 동지 관계입니다.",chung:"충(沖) · 부딪힘이 있지만 서로에게 자극이 됩니다.",none:"특별한 합이나 충이 없는 무난한 관계입니다."};
  const tips={love:["표현 방식이 다를 때는 ‘무엇을 원하는지’를 직접 말하는 규칙을 정하세요.","평범한 하루의 루틴을 함께 만드는 쪽이 관계를 단단하게 합니다.","다툼은 그날 안에, 서운함은 일주일 안에 꺼내 이야기하세요."],
   work:["역할과 결정 권한을 문서로 나누면 갈등 대부분이 사라집니다.","정기 1:1 대화로 기대치를 맞추세요.","공은 함께, 피드백은 사적으로 주는 원칙을 지키세요."],
   hobby:["두 사람의 에너지 수준이 비슷한 활동을 고르세요.","번갈아 가며 활동을 고르면 새로운 재미를 발견합니다.","가끔은 각자의 시간을 존중하세요."]}[rel];
  const s=`<div class="grid2">
   <div class="card"><span class="label">${relK} 궁합 총점</span><span class="score">${total}<span style="font-size:20px">점</span></span><div class="meter"><i style="width:${total}%"></i></div>
    <p>${total>=82?"천생연분에 가까운 조합입니다.":total>=70?"서로 노력하면 잘 맞는 조합입니다.":"차이가 큰 만큼 배울 것도 많은 조합입니다."}</p></div>
   <div class="card"><span class="label">일간 관계 · ${ST[A.d.s]} ↔ ${ST[Q.d.s]}</span><p>${dmTxt}</p></div>
   <div class="card"><span class="label">띠 · ${ANI[A.y.b]} ↔ ${ANI[Q.y.b]}</span><p>${bt[yr]}</p>${rel==="love"?`<p><b>배우자궁(일지) ${BR[A.d.b]} ↔ ${BR[Q.d.b]}</b>: ${bt[dr]}</p>`:""}</div>
   <div class="card"><span class="label">별자리 · MBTI</span><p>${z1}과 ${z2}의 원소 조합, ${m1}와 ${m2}의 만남입니다.</p></div></div>
  <div class="grid2">${[["사주 일간",dmS],[rel==="love"?"띠 · 배우자궁":"띠",brS],["별자리",zS],["MBTI",mScore]].map(([k,v])=>`<div class="card"><span class="label">${k}</span><span class="num">${v}점</span><div class="meter"><i style="width:${v}%"></i></div></div>`).join("")}</div>
  <div class="card"><span class="label">관계를 좋게 하는 법</span><ul style="margin:0;padding-left:1.2em">${tips.map(t=>`<li>${t}</li>`).join("")}</ul></div>`;
  const myL=lacksOf(S.cnt),pL=lacksOf(QA.cnt);
  const fillMe=myL.filter(i=>QA.cnt[i]>0),fillP=pL.filter(i=>S.cnt[i]>0);
  const t1=tg10(A.d.s,Q.d.s),t2=tg10(Q.d.s,A.d.s);
  const DIMN={0:["에너지 방향","E","I"],1:["보는 방식","S","N"],2:["판단 기준","T","F"],3:["생활 방식","J","P"]};
  const d=`<div class="dethead">두 사람의 오행 보완</div>
  <div class="tw"><table class="t"><tr><th></th>${EN.map((n,i)=>`<th class="e${i}">${n}</th>`).join("")}</tr>
   <tr><td>${nm}</td>${S.cnt.map(c=>`<td class="num">${c}</td>`).join("")}</tr><tr><td>${pn}</td>${QA.cnt.map(c=>`<td class="num">${c}</td>`).join("")}</tr></table></div>
  <p>${fillMe.length?`${pn}님이 ${nm}님에게 부족한 ${fillMe.map(i=>EN[i]).join("·")} 기운을 채워 줍니다. `:""}${fillP.length?`${nm}님은 ${pn}님에게 부족한 ${fillP.map(i=>EN[i]).join("·")} 기운을 채워 줍니다. `:""}${!fillMe.length&&!fillP.length?"서로 부족한 오행을 직접 채워 주지는 않으니, 함께 새로운 경험을 쌓으며 균형을 만드세요.":"서로의 빈자리를 메우는 보완 관계입니다."}</p>
  <div class="grid2"><div class="card"><span class="label">${nm}님에게 ${pn}님은 · ${t1.n}</span><p>${TGX[t1.n][0]}</p></div>
   <div class="card"><span class="label">${pn}님에게 ${nm}님은 · ${t2.n}</span><p>${TGX[t2.n][0]}</p></div>
   <div class="card"><span class="label">${pn}님의 일간</span><h3>${ST[Q.d.s]}${EK[SE[Q.d.s]]} · ${DMX[Q.d.s].nm}</h3><p>${DMX[Q.d.s].key}. ${DMX[Q.d.s].연애}</p></div></div>
  <div class="dethead">MBTI 차원별 비교</div>
  <div class="tw"><table class="t"><tr><th>차원</th><th>${nm}</th><th>${pn}</th><th>관계에서</th></tr>${[0,1,2,3].map(i=>`<tr><td>${DIMN[i][0]}</td><td class="num">${m1[i]}</td><td class="num">${m2[i]}</td><td>${m1[i]===m2[i]?"같아서 편하지만 비슷한 약점도 함께 가집니다.":["한 사람은 밖에서, 한 사람은 안에서 충전합니다. 혼자 있을 시간을 존중하세요.","현실과 가능성을 서로 보완합니다. 대화할 때 구체적인 예와 큰 그림을 함께 주세요.","논리와 감정이 엇갈릴 수 있습니다. 결론보다 마음을 먼저 확인하세요.","계획형과 즉흥형의 차이입니다. 큰 일정만 함께 정하고 세부는 유연하게 두세요."][i]}</td></tr>`).join("")}</table></div>
  <div class="card"><span class="label">갈등 포인트와 해법</span><p>${yr==="chung"||dr==="chung"?"띠 또는 배우자궁에 충이 있어 생활 리듬이 부딪히기 쉽습니다. 함께 사는 공간과 일정의 규칙을 먼저 정하세요. ":""}${r===2||r===3?"한쪽이 주도하고 한쪽이 따르는 구도라, 결정 방식을 미리 합의하면 다툼이 줄어듭니다. ":""}${m1[2]!==m2[2]?"말의 온도 차이가 오해를 부를 수 있으니 중요한 대화는 시간을 정해 차분히 하세요.":"판단 기준이 같아 결정은 빠르지만, 같은 실수를 함께 반복하지 않도록 제3자 의견을 들으세요."}</p></div>`;
  return{s,d};
}

/* ===== 타로 ===== */
const SPREADS={1:[["오늘의 카드","오늘 하루를 이끄는 기운입니다."]],3:[["과거","지금 상황을 만든 배경과 원인입니다."],["현재","지금 가장 큰 영향을 주는 기운입니다."],["미래","이대로 갈 때 다가올 흐름입니다."]],
 5:[["현재 상황","질문을 둘러싼 지금의 모습입니다."],["장애물","앞을 가로막는 문제입니다."],["숨은 원인","겉으로 보이지 않는 뿌리입니다."],["조언","지금 취하면 좋은 태도입니다."],["결과","조언을 따를 때의 결과입니다."]]};
function rnd(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}
function drawCards(n,topic){const pool=[...Array(DECK.length).keys()],cards=[];
  for(let k=0;k<n;k++){const j=rnd(pool.length);cards.push({c:DECK[pool.splice(j,1)[0]],rev:rnd(100)<30})}
  return{n,cards,topic,opened:new Set()}}
function draw(){
  const n=+$("tspread").value;lastDraw=drawCards(n,$("ttopic").value);
  const deck=$("deck");deck.innerHTML=Array.from({length:7},(_,k)=>`<span style="--dx:${(k-3)*14}px;--r:${(k-3)*7}deg;left:calc(50% - 28px + ${(k-3)*3}px)"></span>`).join("");
  deck.classList.remove("go");void deck.offsetWidth;deck.classList.add("go");
  $("spread").innerHTML=lastDraw.cards.map((x,k)=>`<div class="slot"><span class="label">${SPREADS[n][k][0]}</span><button class="flip" type="button" data-k="${k}" aria-label="${SPREADS[n][k][0]} 카드 뒤집기"><div class="in"><span class="face">${TBACK}</span><img class="face front ${x.rev?"rev":""}" src="cards/${x.c.id}.jpg" alt="${x.c.ko}${x.rev?" 역방향":""}"></div></button></div>`).join("");
  setBody("tarot",{s:`<p class="note" style="text-align:center">카드를 눌러 한 장씩 뒤집으세요.</p>`,d:""});
}
function yesno(x){if(x.rev)return YESNO[1];if(x.c.major&&["m13","m15","m16","m18"].includes(x.c.id))return YESNO[2];if(x.c.id[0]==="s")return YESNO[2];return YESNO[0]}
function advice(x){const el=x.c.el,act={"불":"먼저 움직이세요","물":"마음을 솔직하게 표현하세요","바람":"생각을 정리해 분명히 말하세요","흙":"작은 것부터 실천하세요"}[el];
  return x.rev?`‘${x.c.kw}’의 기운이 막혀 있습니다. ${act.replace("세요","기")} 전에 무엇이 걸림돌인지 먼저 점검하세요.`:`‘${x.c.kw}’의 흐름을 믿고 ${act}.`}
function bTarot(D=lastDraw){
  if(!D||D.opened.size<D.n)return{s:`<p class="note">주제와 스프레드를 고르고 ‘카드 섞고 뽑기’를 누르세요.</p>`,d:""};
  const {n,cards,topic}=D,pos=SPREADS[n];
  const tk={all:null,love:"love",work:"work",money:"money"}[topic],tn={all:"종합",love:"연애",work:"일",money:"재물"}[topic];
  const sum=cards.map((x,k)=>{const C=x.c;return`<div class="card tcard"><img src="cards/${C.id}.jpg" class="${x.rev?"rev":""}" alt="${C.ko}"><div class="section" style="gap:6px">
     <span class="label">${pos[k][0]}</span><h3>${C.ko} <span class="note">${C.en}</span> <span class="pill">${x.rev?"역방향":"정방향"}</span></h3>
     <p><b>${C.kw}</b> · ${x.rev?C.rev:C.up}</p>${tk?`<p class="note">${tn} · ${C[tk]}${x.rev?" 다만 역방향이라 이 흐름이 늦게 오거나 약하게 나타납니다.":""}</p>`:""}</div></div>`}).join("");
  const revs=cards.filter(x=>x.rev).length,cnt={};cards.forEach(x=>cnt[x.c.el]=(cnt[x.c.el]||0)+1);
  const domE=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0],majors=cards.filter(x=>x.c.major).length;
  let syn=n===1?(cards[0].rev?"역방향 카드는 조심하고 점검하라는 신호입니다. 오늘은 무리한 결정을 미루세요.":"정방향 카드입니다. 카드의 기운을 오늘 하루의 행동 지침으로 삼으세요.")
    :`${revs===0?"모든 카드가 정방향입니다. 흐름이 막힘없이 이어집니다.":revs===n?"모든 카드가 역방향입니다. 밀어붙이기보다 점검하고 정리할 때입니다.":`${revs}장이 역방향입니다. 그 자리의 메시지가 지금 풀어야 할 과제입니다.`} ${cards.map((x,k)=>`${pos[k][0]}의 <b>${x.c.kw}</b>`).join(", ")}로 이어지는 흐름이며, <b>${domE}</b>의 원소가 두드러집니다.`;
  syn+=majors>=Math.ceil(n/2)?" 메이저 카드가 많아 개인의 노력을 넘어서는 큰 흐름이 작용하는 시기입니다.":n>1?" 마이너 카드가 많아 일상의 선택으로 충분히 바꿀 수 있는 문제입니다.":"";
  let link="";
  if(S){const te=T2E[domE],lk=lacksOf(S.cnt);
    link=lk.includes(te)?`사주에서 부족한 <b class="e${te}">${EN[te]}</b> 기운을 카드가 채워 주고 있습니다. 그 방향으로 움직일 때 균형이 맞습니다.`:
      S.lucky.includes(te)?`카드의 원소가 사주의 행운 오행 <b class="e${te}">${EN[te]}</b>과 같은 결입니다. 흐름을 믿고 움직여도 좋습니다.`:
      `카드의 원소(${EN[te]})는 사주의 행운 오행(${S.lucky.map(i=>EN[i]).join("·")})과 다릅니다. 결과보다 과정의 균형을 챙기세요.`}
  const s=`<div class="section" style="gap:12px">${sum}</div><div class="card avoid"><span class="label">종합 리딩 · ${tn}</span><p>${syn}</p>${link?`<p>${link}</p>`:""}</div>
   <button class="btn ghost noprint" type="button" id="redraw" style="align-self:start">다시 뽑기</button>`;
  const d=`<div class="dethead">카드별 상세 해설</div>${cards.map((x,k)=>{const C=x.c;return`<div class="card avoid"><span class="label">${pos[k][0]} — ${pos[k][1]}</span>
   <h3>${C.ko} · ${C.en} <span class="pill">${x.rev?"역방향":"정방향"}</span> <span class="pill">${C.el}의 원소</span></h3>
   <dl class="dl"><dt>그림 읽기</dt><dd>${C.pic}</dd><dt>정방향</dt><dd>${C.up}</dd><dt>역방향</dt><dd>${C.rev}</dd>
    <dt>연애</dt><dd>${C.love}</dd><dt>일</dt><dd>${C.work}</dd><dt>재물</dt><dd>${C.money}</dd><dt>예 / 아니오</dt><dd>${yesno(x)}</dd><dt>조언</dt><dd>${advice(x)}</dd></dl></div>`}).join("")}
   <p class="note">타로 원소는 불=화, 물=수, 바람=목, 흙=토로 사주 오행과 연결했습니다. 예/아니오는 참고용 경향입니다.</p>`;
  return{s,d};
}

/* ===== 패널 출력 ===== */
const BUILD={saju:bSaju,me:bPersona,luck:bLuck,tojeong:bTojeong,tarot:()=>bTarot(),star:bStar,match:bMatch,career:bCareer};
function setBody(k,{s,d}){const p=$("v-"+k);p.querySelector(".body").innerHTML=`<div class="section">${s}</div>${d?`<div class="det">${d}</div>`:""}`;
  p.querySelector(".lv").hidden=!d}
function renderAll(){
  if(!S)return;
  $("chart").innerHTML=heroHTML({el:EVAR[SE[S.me]],bg:"var(--scene)",soft:"var(--line)",ink:"var(--ink)"})+pillarsHTML();
  for(const k of LVTABS)setBody(k,BUILD[k]());
  renderShare();
}
LVTABS.forEach(k=>{const lv=$("v-"+k).querySelector(".lv");
  lv.innerHTML=`<button type="button" data-l="s" aria-pressed="true">요약</button><button type="button" data-l="d" aria-pressed="false">상세 해설</button>`;
  lv.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    lv.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));$("v-"+k).classList.toggle("deep",b.dataset.l==="d")})});

/* ===== 공유 카드 ===== */
function svgImg(svg){return new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)})}
async function renderShare(){
  if(!S)return;
  const {f,P,me}=S,c=document.createElement("canvas");c.width=1080;c.height=1350;const x=c.getContext("2d");
  try{await Promise.all([document.fonts.load('800 120px "Nanum Myeongjo"'),document.fonts.load('600 40px "IBM Plex Sans KR"')])}catch(e){}
  const SER='"Nanum Myeongjo","Batang",serif',SAN='"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  x.fillStyle="#141a2e";x.fillRect(0,0,1080,1350);x.strokeStyle="#2c3556";x.lineWidth=2;x.strokeRect(48,48,984,1254);
  const im=await svgImg(scene(me,{el:ELIT[SE[me]],bg:"#1d2442",soft:"#2c3556",ink:"#eef0f6"}));if(im)x.drawImage(im,96,96,888,500);
  const gr=x.createLinearGradient(0,400,0,596);gr.addColorStop(0,"rgba(20,26,46,0)");gr.addColorStop(1,"rgba(20,26,46,.96)");x.fillStyle=gr;x.fillRect(96,400,888,196);
  const nm=$("sharename").checked?($("name").value.trim()||""):"";
  x.fillStyle="#9aa8ff";x.font=`600 28px ${SAN}`;x.fillText("운명 연구소",128,516);
  x.fillStyle="#eef0f6";x.font=`800 60px ${SER}`;x.fillText(`${nm?nm+"님 · ":""}${ST[me]}${EK[SE[me]]} ${DMX[me].nm}`,128,578);
  x.fillStyle="#9aa1b5";x.font=`400 29px ${SAN}`;x.fillText(`${ANI[P.y.b]}띠 · ${f.mbti} · ${S.z[0]}`,96,650);
  const cols=[["시",P.h],["일",P.d],["월",P.m],["년",P.y]];
  cols.forEach(([k,p],i)=>{const cx=96+i*228+102;x.fillStyle=k==="일"?"#252d4d":"#1b2240";x.fillRect(cx-102,690,204,300);
    x.fillStyle="#9aa1b5";x.font=`600 26px ${SAN}`;x.textAlign="center";x.fillText(k+"주",cx,734);x.font=`800 104px ${SER}`;
    if(p){x.fillStyle=ELIT[SE[p.s]];x.fillText(ST[p.s],cx,846);x.fillStyle=ELIT[BE[p.b]];x.fillText(BR[p.b],cx,960)}else{x.fillStyle="#4a5272";x.fillText("?",cx,846);x.fillText("?",cx,960)}x.textAlign="left"});
  [[`${f.Y} 토정`,`${S.tj.code}괘 · ${S.tj.tone.split(" · ")[0]}`],["행운 오행",S.lucky.map(i=>EK[i]).join(" · ")],["추천 직업",S.jobs[0][0]]].forEach(([k,v],i)=>{const y=1052+i*80;
    x.fillStyle="#9aa1b5";x.font=`600 26px ${SAN}`;x.fillText(k,96,y);x.fillStyle="#eef0f6";x.font=`600 38px ${SAN}`;x.fillText(v,300,y+2)});
  x.fillStyle="#6c7390";x.font=`400 22px ${SAN}`;x.fillText("오락·자기성찰용 풀이입니다",96,1272);
  $("cardimg").src=c.toDataURL("image/png");
  $("sharetxt").value=`[운명 연구소] ${nm?nm+"님의 ":""}사주\n명식: ${cols.slice().reverse().map(([k,p])=>p?ST[p.s]+BR[p.b]:"??").join(" ")} (년월일시)\n일간: ${ST[me]}${EK[SE[me]]} · ${DMX[me].nm} (${DMX[me].key})\n${f.Y}년 토정비결: ${S.tj.code}괘, ${S.tj.tone}\n행운 오행: ${S.lucky.map(i=>EK[i]).join("·")}\n${f.mbti} · ${S.z[0]} · 추천 직업 ${S.jobs[0][0]}`;
}

/* ===== PDF 보고서 ===== */
const LIBS=["https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"];
function loadScript(u){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>no(new Error("load "+u));document.head.appendChild(s)})}
async function loadPDFLibs(){if(!window.html2canvas)await loadScript(LIBS[0]);if(!(window.jspdf&&window.jspdf.jsPDF))await loadScript(LIBS[1])}
/* 긴 캔버스를 A4 높이로 자르되, 글자가 잘리지 않게 위쪽의 빈 행을 찾아 자른다 */
function findCut(ctx,w,target,minY){
  const span=Math.max(1,target-minY),data=ctx.getImageData(0,minY,w,span).data;
  for(let r=span-1;r>=0;r-=2){let blank=true;
    for(let x=0;x<w;x+=6){const i=(r*w+x)*4;if(data[i]<244||data[i+1]<244||data[i+2]<244){blank=false;break}}
    if(blank)return minY+r}
  return target}
async function renderPDF(root){
  const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
  const M=12,CW=210-2*M,CH=297-M-16;let first=true,page=0;
  for(const el of root.querySelectorAll(":scope > .rsec")){
    const cv=await html2canvas(el,{scale:2,backgroundColor:"#ffffff",useCORS:true,scrollX:0,scrollY:0,windowWidth:760,width:760});
    const ppm=cv.width/CW,pageH=Math.floor(CH*ppm),ctx=cv.getContext("2d",{willReadFrequently:true});
    let y=0;
    while(y<cv.height-4){
      let end=Math.min(cv.height,y+pageH);
      if(end<cv.height)end=findCut(ctx,cv.width,end,y+Math.floor(pageH*.6));
      const part=document.createElement("canvas");part.width=cv.width;part.height=end-y;
      part.getContext("2d").drawImage(cv,0,y,cv.width,end-y,0,0,cv.width,end-y);
      if(!first)pdf.addPage();first=false;page++;
      pdf.addImage(part.toDataURL("image/jpeg",.9),"JPEG",M,M,CW,(end-y)/ppm);
      pdf.setFontSize(8);pdf.setTextColor(140);pdf.text(`Fortune Lab  ·  ${page}`,210/2,297-8,{align:"center"});
      y=end;
    }
  }
  return pdf;
}
function buildReport(){
  let D=lastDraw;if(!D||D.opened.size<D.n){D=drawCards(3,"all");D.cards.forEach((_,k)=>D.opened.add(k));D.auto=true}
  const today=new Date(),ds=`${today.getFullYear()}.${today.getMonth()+1}.${today.getDate()}`;
  const sec=(t,o,extra="")=>`<div class="rsec"><h2>${t}</h2>${extra}<div class="section">${o.s}</div>${o.d?`<div class="det">${o.d}</div>`:""}</div>`;
  const tar=bTarot(D);
  const toc=["사주 원국","사주풀이","나에게 맞춘 해설","대운 · 세운 · 월운","토정비결","타로 리딩","별자리 · MBTI","궁합","적성 · 미래 직업"];
  return`<div class="report">
   <div class="rsec cover"><div class="label">종합 운명 보고서</div><h1>운명 연구소</h1>
    ${scene(S.me,{el:ELIT[SE[S.me]].replace("#c3cad6","#8b93a3"),bg:"#e6eaf3",soft:"#cfd5e2",ink:"#1b2033"})}
    <div class="big">${S.f.name}님 · ${ST[S.me]}${EK[SE[S.me]]} ${DMX[S.me].nm}</div><p>${DMX[S.me].key}</p>
    <p class="note">작성일 ${ds} · 운세 기준 연도 ${S.f.Y}년</p>
    <ol style="text-align:left;margin:20px auto 0;width:300px">${toc.map(t=>`<li>${t}</li>`).join("")}</ol></div>
   <div class="rsec"><h2>1. 사주 원국</h2>${heroHTML({el:ELIT[SE[S.me]].replace("#c3cad6","#8b93a3"),bg:"#e6eaf3",soft:"#cfd5e2",ink:"#1b2033"})}${pillarsHTML()}</div>
   ${sec("2. 사주풀이",bSaju())}${sec("3. 나에게 맞춘 해설",bPersona())}${sec("4. 대운 · 세운 · 월운",bLuck())}${sec("5. 토정비결",bTojeong())}
   ${sec("6. 타로 리딩",{s:tar.s.replace(/<button[^>]*id="redraw"[^>]*>.*?<\/button>/,""),d:tar.d},D.auto?`<p class="note">화면에서 뽑은 카드가 없어 보고서를 만들 때 과거·현재·미래 3장을 새로 뽑았습니다.</p>`:"")}
   ${sec("7. 별자리 · MBTI",bStar())}${sec("8. 궁합",bMatch(),`<p class="note">상대: ${esc($("pname").value.trim()||"상대")} · ${$("pbirth").value} · ${$("pmbti").value} · ${$("rel").selectedOptions[0].text}</p>`)}${sec("9. 적성 · 미래 직업",bCareer())}
   <div class="rsec"><p class="note">이 보고서는 전통 명리 계산식, 타로 상징, 성격 유형론을 조합한 오락·자기성찰용 콘텐츠입니다. 타로 그림: 라이더-웨이트-스미스(1909), 파멜라 콜먼 스미스 · 퍼블릭 도메인.</p></div></div>`;
}
let restoreY=null;
async function makePDF(){
  if(!S)return;
  const btn=$("pdfbtn"),msg=$("pdfmsg");btn.disabled=true;btn.textContent="보고서 만드는 중…";msg.hidden=false;msg.textContent="모든 탭의 상세 해설을 모아 페이지를 그리는 중입니다. 10–30초 걸릴 수 있습니다.";
  const wrap=$("rwrap");
  try{
    await loadPDFLibs();
    const sv=scene(S.me,{el:ELIT[SE[S.me]].replace("#c3cad6","#8b93a3"),bg:"#e6eaf3",soft:"#cfd5e2",ink:"#1b2033"});
    const im=await svgImg(sv);let png="";
    if(im){const c=document.createElement("canvas");c.width=960;c.height=540;c.getContext("2d").drawImage(im,0,0,960,540);png=c.toDataURL("image/png")}
    wrap.innerHTML=buildReport().replace(/<svg viewBox="0 0 320 180"[\s\S]*?<\/svg>/g,()=>png?`<img alt="" style="width:100%;display:block;border-radius:8px" src="${png}">`:"");
    await Promise.all([...wrap.querySelectorAll("img")].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));
    try{await document.fonts.ready}catch(e){}
    const fname=`운명연구소_보고서_${S.f.Y}.pdf`;
    restoreY=window.scrollY;window.scrollTo(0,0);
    const pdf=await renderPDF(wrap.firstElementChild);
    if(window.claude&&window.claude.use){
      const dl=await window.claude.use("downloads").catch(()=>null);
      if(!dl){msg.textContent="이 화면에서는 파일 저장을 지원하지 않습니다. 깃허브 페이지 버전에서 PDF를 받을 수 있습니다.";return}
      try{await dl.save({filename:fname,data:pdf.output("blob")});msg.textContent="PDF 보고서를 저장했습니다. 개인정보는 이 파일에만 담기니 공유할 때 주의하세요."}
      catch(e){msg.textContent=e&&e.code==="declined"?"저장을 취소했습니다.":"저장하지 못했습니다. 잠시 후 다시 시도하세요."}
    }else{pdf.save(fname);msg.textContent="PDF 보고서를 내려받았습니다. 개인정보는 이 파일에만 담기니 공유할 때 주의하세요."}
  }catch(e){console.error("PDF",e&&e.stack||e);msg.textContent="보고서를 만들지 못했습니다. 네트워크를 확인하고 다시 시도하세요."}
  finally{if(restoreY!==null){window.scrollTo(0,restoreY);restoreY=null}wrap.innerHTML="";btn.disabled=false;btn.textContent="PDF 보고서 만들기"}
}

/* ===== 이벤트 ===== */
function run(){if(!LIB){$("libwarn").hidden=false;return}if(compute()){$("results").hidden=false;renderAll()}}
$("f").addEventListener("submit",e=>{e.preventDefault();$("demo").hidden=true;run()});
$("mf").addEventListener("submit",e=>{e.preventDefault();if(S)setBody("match",bMatch())});
$("tf").addEventListener("submit",e=>{e.preventDefault();draw()});
$("spread").addEventListener("click",e=>{const b=e.target.closest(".flip");if(!b||!lastDraw)return;b.classList.add("open");lastDraw.opened.add(+b.dataset.k);
  if(lastDraw.opened.size===lastDraw.n)setTimeout(()=>setBody("tarot",bTarot()),500)});
$("v-tarot").addEventListener("click",e=>{if(e.target.id==="redraw"){draw();$("v-tarot").scrollIntoView({behavior:"smooth",block:"start"})}});
$("tunk").addEventListener("change",()=>{$("btime").disabled=$("tunk").checked;$("corr").disabled=$("tunk").checked});
$("sharename").addEventListener("change",renderShare);
["prov","occ","fam","house"].forEach(k=>$(k).addEventListener("change",()=>{if(S)setBody("me",bPersona())}));
$("ints").addEventListener("change",()=>{if(S)setBody("me",bPersona())});
$("pdfbtn").addEventListener("click",makePDF);
$("clear").addEventListener("click",()=>{
  ["name","birth","btime","pname","pbirth"].forEach(k=>$(k).value="");$("tunk").checked=false;$("cal").value="s";["prov","occ","fam","house"].forEach(k=>$(k).value="");$("ints").querySelectorAll("input").forEach(i=>i.checked=false);$("pcal").value="s";
  S=null;lastDraw=null;$("spread").innerHTML="";$("deck").innerHTML="";$("chart").innerHTML="";$("cardimg").removeAttribute("src");$("sharetxt").value="";
  $("results").hidden=true;$("demo").hidden=false;$("demo").textContent="입력을 모두 지웠습니다. 생년월일을 넣고 ‘풀이 보기’를 누르세요.";$("tunk").dispatchEvent(new Event("change"))});
$("copybtn").addEventListener("click",()=>{const t=$("sharetxt");
  Promise.resolve().then(()=>navigator.clipboard.writeText(t.value)).then(()=>{$("copybtn").textContent="복사했습니다"},()=>{t.select();$("copybtn").textContent="선택됨 · 직접 복사하세요"});
  setTimeout(()=>{$("copybtn").textContent="요약 문구 복사"},2000)});
function showTab(k){document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.t===k));TABS.forEach(x=>$("v-"+x).hidden=x!==k)}
$("tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(b)showTab(b.dataset.t)});
$("tunk").dispatchEvent(new Event("change"));run();
if(TABS.includes(location.hash.slice(1)))showTab(location.hash.slice(1));
