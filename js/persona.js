/* 운명 연구소 · 대한민국 생활 맞춤 해설 (개인 특성 × 사회적 특성) */
const PROVS=["서울","경기","인천","부산","대구","광주","대전","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"];
const P2R={서울:"수도권",경기:"수도권",인천:"수도권",대전:"충청권",세종:"충청권",충북:"충청권",충남:"충청권",광주:"호남권",전북:"호남권",전남:"호남권",부산:"영남권",대구:"영남권",울산:"영남권",경북:"영남권",경남:"영남권",강원:"강원·제주권",제주:"강원·제주권"};
const REGX={수도권:"일자리와 기회가 가장 몰리는 대신 경쟁과 주거비 부담이 큰 권역입니다. 속도보다 방향, 비교보다 자기 기준이 운을 지킵니다.",
 충청권:"수도권 접근성과 생활 여유를 함께 누리는 권역입니다. 행정·연구·제조 거점이 많아 안정적인 커리어를 쌓기 좋습니다.",
 호남권:"정과 공동체 문화가 깊고 먹거리·문화 자원이 풍부한 권역입니다. 지역 네트워크가 곧 기회이며, 에너지·농생명 산업과 인연이 깊습니다.",
 영남권:"제조·조선·자동차 등 산업 기반이 단단한 권역입니다. 기술과 현장 경험이 자산이 되고, 의리와 신뢰가 관계의 중심입니다.",
 "강원·제주권":"자연과 관광 자원이 풍부한 권역입니다. 계절과 날씨에 따라 생활 리듬이 달라지니 비수기를 배움과 재충전의 시간으로 쓰세요."};
const OCCS=[["office","사무·행정직",2],["manage","경영·관리직",2],["pro","전문·연구직",4],["tech","기술·엔지니어",3],["it","IT·개발직",4],["edu","교육직",0],["med","의료·돌봄직",0],
 ["sales","판매·영업직",1],["service","서비스직",1],["prod","생산·기능직",3],["trans","운송·물류직",4],["self","자영업·창업",1],["art","예술·창작직",1],["public","공무원·공공기관",2],
 ["farm","농림어업",2],["student","학생·취업 준비",0],["home","가사·육아",2],["retire","은퇴·휴식 중",4]];
const OCCX={office:"정해진 절차 안에서 신뢰를 쌓는 일입니다.",manage:"사람과 자원을 조율해 성과를 내는 일입니다.",pro:"지식과 분석으로 가치를 만드는 일입니다.",tech:"기계와 설비를 다루며 정확성이 생명인 일입니다.",it:"정보와 흐름을 설계하는 일입니다.",
 edu:"사람을 키우고 성장시키는 일입니다.",med:"사람을 돌보고 살리는 일입니다.",sales:"사람을 만나 마음을 움직이는 일입니다.",service:"현장에서 사람에게 만족을 주는 일입니다.",prod:"손과 기술로 실물을 만들어 내는 일입니다.",trans:"사람과 물건을 흐르게 하는 일입니다.",
 self:"내 이름을 걸고 판을 꾸리는 일입니다.",art:"감각과 표현으로 사람을 움직이는 일입니다.",public:"규범과 공익을 지키는 일입니다.",farm:"땅과 자연을 기르는 일입니다.",student:"배움으로 기반을 다지는 시기입니다.",home:"가정과 사람을 돌보는 일입니다.",retire:"그동안 쌓은 것을 정리하고 새 의미를 찾는 시기입니다."};
const LIFE={
 "20대":{t:"탐색과 기반의 시기",w:"전공·첫 직장·자격증처럼 평생 쓸 기초 체력을 쌓을 때입니다. 여러 경험을 해 보되 2–3년 단위로 방향을 점검하세요.",m:"소득보다 습관이 중요합니다. 월급의 일정 비율을 자동 저축하고 청년 대상 금융·주거 지원 제도를 확인해 두세요.",r:"관계의 폭을 넓히는 시기입니다. 나와 결이 맞는 사람을 알아보는 눈을 기르세요.",h:"수면과 식사 리듬이 무너지기 쉬운 시기입니다. 체력은 지금 만들어 둔 만큼 오래 갑니다."},
 "30대":{t:"선택과 정착의 시기",w:"전문성이 굳어지고 이직·승진·창업의 선택지가 동시에 옵니다. 커리어의 큰 줄기를 하나로 모을 때입니다.",m:"내 집 마련, 결혼·출산 등 목돈 이벤트가 몰립니다. 대출과 저축 계획을 함께 세우고 비상금 6개월 치를 먼저 확보하세요.",r:"가정을 꾸리거나 인생의 동반자를 고르는 시기입니다. 역할 분담과 돈 이야기를 일찍 솔직하게 나누세요.",h:"일과 가정이 동시에 바빠 번아웃이 오기 쉽습니다. 주 2회 운동을 일정에 먼저 넣으세요."},
 "40대":{t:"책임과 확장의 시기",w:"조직의 중간 리더나 사업의 중심이 됩니다. 실무에서 사람을 키우는 역할로 무게중심을 옮기세요.",m:"자녀 교육비와 노후 준비가 겹칩니다. 교육비 상한을 정하고 연금·노후 자산을 따로 쌓기 시작하세요.",r:"부모 세대와 자녀 세대를 함께 챙기는 샌드위치 시기입니다. 나를 돌볼 시간도 확보하세요.",h:"건강검진 결과를 꼼꼼히 확인하고 혈압·혈당·체중 관리를 시작할 때입니다."},
 "50대":{t:"수확과 전환의 시기",w:"그동안의 경력이 정점에 이르고, 퇴직 이후의 두 번째 일을 준비할 때입니다. 전문성을 강의·컨설팅·창업으로 옮길 길을 찾으세요.",m:"자산을 지키는 운용이 맞습니다. 고위험 투자는 줄이고 은퇴 시점의 현금 흐름을 계산해 두세요.",r:"자녀의 독립과 부모 봉양이 겹칩니다. 배우자와 둘만의 시간을 다시 만드세요.",h:"관절과 근력 관리가 노후 삶의 질을 좌우합니다. 근력 운동을 꾸준히 하세요."},
 "60대":{t:"자유와 의미의 시기",w:"의무로 하던 일에서 원하는 일로 옮겨 가는 시기입니다. 경험을 나누는 봉사·강의·취미형 일이 잘 맞습니다.",m:"연금과 고정 지출을 맞추는 것이 핵심입니다. 자녀 지원과 내 노후 자금의 경계를 분명히 하세요.",r:"친구와 모임, 지역 공동체가 삶의 큰 버팀목이 됩니다. 새 모임에 한 곳 이상 참여해 보세요.",h:"정기 검진과 걷기, 균형 운동이 가장 좋은 보약입니다."},
 "70대+":{t:"지혜와 나눔의 시기",w:"삶의 지혜를 다음 세대에 전하는 역할이 잘 맞습니다. 기록과 이야기로 남겨 보세요.",m:"자산을 정리하고 가족과 미리 이야기해 두면 마음이 편합니다.",r:"가족과 이웃과의 정기적인 연락이 활력을 줍니다.",h:"낙상 예방과 꾸준한 걷기, 사람들과의 대화가 건강을 지킵니다."}};
const FAMS=[["solo","1인 가구"],["couple","부부 가구"],["kids","자녀와 함께"],["parents","부모님과 함께"],["multi","3세대 이상"]];
const FAMX={solo:"혼자 사는 만큼 생활 리듬과 인간관계를 스스로 설계해야 합니다. 정기적인 모임 하나와 비상 연락망을 꼭 만들어 두세요.",
 couple:"두 사람의 리듬을 맞추는 것이 운을 키웁니다. 한 달에 한 번 ‘우리 둘만의 계획 회의’를 해 보세요.",
 kids:"자녀의 성장이 가정의 큰 흐름을 만듭니다. 교육 계획과 함께 부부만의 시간도 일정에 넣으세요.",
 parents:"부모님과 함께 지내는 만큼 세대 간 생활 방식을 존중하는 대화가 중요합니다. 각자의 공간과 시간을 정해 두세요.",
 multi:"여러 세대가 함께하는 만큼 역할 분담과 공동 규칙이 화목을 지킵니다."};
const HOUSES=[["own","자가"],["jeonse","전세"],["wolse","월세"],["family","가족 소유 집"],["etc","기숙사·기타"]];
const HOUSEX={own:"이미 자리를 잡은 만큼 지키는 운용이 맞습니다. 대출이 있다면 금리 변동에 대비한 상환 계획을 세우세요.",
 jeonse:"보증금 안전이 최우선입니다. 계약 전 등기부와 보증보험을 꼭 확인하고, 다음 이사 시점에 맞춰 자금 계획을 세우세요.",
 wolse:"고정 지출인 월세를 줄이는 것이 첫걸음입니다. 청약통장과 주거 지원 제도를 꾸준히 챙기세요.",
 family:"주거비 부담이 적은 지금이 종잣돈을 모을 최적기입니다.",etc:"생활 기반을 다지는 시기입니다. 이동이 잦다면 짐과 지출을 가볍게 유지하세요."};
const INTS=[["sport","운동",1],["travel","여행",4],["book","독서·공부",0],["music","음악",4],["cook","요리",1],["invest","재테크",2],["game","게임",3],["pet","반려동물",0],["volunteer","봉사",2],["craft","공예·DIY",3],["garden","원예·캠핑",0],["art","미술·전시",3]];
const ELACT=["숲길 산책, 원예, 새로운 공부","땀 흘리는 운동, 공연 관람, 요리","등산, 저축 습관, 정리정돈","정리정돈, 악기 연습, 근력 운동","수영, 여행, 명상"];

function fillProfileInputs(){
  $("prov").innerHTML='<option value="">선택 안 함</option>'+PROVS.map(p=>`<option>${p}</option>`).join("");
  $("occ").innerHTML='<option value="">선택 안 함</option>'+OCCS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("");
  $("fam").innerHTML='<option value="">선택 안 함</option>'+FAMS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("");
  $("house").innerHTML='<option value="">선택 안 함</option>'+HOUSES.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("");
  $("ints").innerHTML=INTS.map(o=>`<label class="chipck"><input type="checkbox" value="${o[0]}"> ${o[1]}</label>`).join("");
}
function readProfile(){
  return{prov:$("prov").value,occ:$("occ").value,fam:$("fam").value,house:$("house").value,ints:[...$("ints").querySelectorAll("input:checked")].map(i=>i.value)};
}
function ageBand(age){return age>=70?"70대+":`${Math.max(20,Math.floor(age/10)*10)}대`}

function bPersona(){
  const pf=readProfile(),{f,P,me,lucky,gc}=S,e=SE[me];
  const age=f.Y-P.solar.y,band=ageBand(f.Y-P.solar.y),L=LIFE[band],rg=pf.prov?P2R[pf.prov]:null,sx=f.g==="m"?"남":"여";
  const yg=yearGz(f.Y),ts=tg10(me,yg.s);
  const occ=OCCS.find(o=>o[0]===pf.occ),fam=FAMS.find(o=>o[0]===pf.fam),house=HOUSES.find(o=>o[0]===pf.house);
  const filled=[pf.prov,pf.occ,pf.fam,pf.house].filter(Boolean).length+(pf.ints.length?1:0);
  let occFit="";
  if(occ){const oe=occ[2],r=mod(oe-e,5);
    occFit=lucky.includes(oe)?`${occ[1]} 일은 ${EN[oe]} 기운이라 행운 오행과 맞고,, 지금 하는 일이 운을 돕고 있습니다.`:
      oe===e?`${occ[1]} 일은 일간과 같은 ${EN[oe]} 기운이라 자기 색이 잘 드러나는 일입니다. 다만 경쟁이 치열하니 차별점을 만드세요.`:
      r===3?`${occ[1]}의 기운이 일간을 다잡는 관계(관성)라, 책임이 무겁지만 그만큼 성장하는 일입니다.`:
      r===2?`일간이 ${occ[1]}의 기운을 다스리는 관계(재성)라, 성과가 돈으로 이어지기 쉬운 일입니다.`:
      r===1?`일간의 기운이 ${occ[1]} 일로 흘러가는 관계(식상)라, 재능을 표현하며 결과물을 내기 좋은 일입니다.`:
      `${occ[1]}의 기운이 일간을 돕는 관계(인성)라, 배우고 인정받으며 성장하는 일입니다.`}
  const intRec=pf.ints.length?(()=>{const good=pf.ints.map(k=>INTS.find(o=>o[0]===k)).filter(o=>lucky.includes(o[2]));const all=pf.ints.map(k=>INTS.find(o=>o[0]===k)[1]);
    return good.length?`관심사 가운데 <b>${good.map(o=>o[1]).join(", ")}</b>이 행운 오행과 맞아 개운 활동으로 특히 좋습니다.`:`선택한 관심사(${all.join(", ")})를 즐기되, 행운 오행에 맞는 ${ELACT[lucky[0]]}을 하나 더해 보세요.`})():"";
  // 페르소나 통계
  const PS=window.PERSONA_STATS,key=PS&&PS.seg&&(PS.seg[`${band}|${sx}|${rg}`]?`${band}|${sx}|${rg}`:PS.seg[`${band}|${sx}|전국`]?`${band}|${sx}|전국`:null),seg=key?PS.seg[key]:null;
  const dist=(arr)=>{const mx=Math.max(...arr.map(a=>a[1]),1);return arr.map(([k,v])=>`<div class="pbar"><span>${esc(k)}</span><i style="width:${Math.round(v/mx*100)}%"></i><b class="num">${v}%</b></div>`).join("")};
  const statCard=seg?`<div class="card avoid"><span class="label">대한민국 합성 페르소나 비교 · ${key.split("|").join(" · ")} · ${seg.n.toLocaleString()}명 <span class="src syn">합성 데이터 · 실제 국민 조사 아님</span></span>
    <p>같은 조건의 합성 페르소나 ${seg.n.toLocaleString()}명 가운데 기혼 비율은 ${seg.married}%입니다.</p>
    <div class="grid2"><div><h3>주요 직업</h3>${dist(seg.occupation)}</div><div><h3>가구 형태</h3>${dist(seg.household)}</div>
    ${seg.hobby.length?`<div><h3>많이 즐기는 취미</h3>${dist(seg.hobby)}</div>`:""}${seg.education.length?`<div><h3>학력</h3>${dist(seg.education)}</div>`:""}</div>
    <p class="note">출처: ${esc(PS.meta.source)} · 총 ${PS.meta.total.toLocaleString()}명 집계(${PS.meta.built}). 개별 페르소나 없이 ${PS.meta.min_segment}명 이상 집단의 비율만 담았습니다. 실제 인구 통계가 아닌 합성 데이터입니다.</p></div>`
    :natCard();
  function natCard(){
    const N=PS&&PS.nat;if(!N)return`<div class="card"><span class="label">대한민국 페르소나 비교</span><p class="note">페르소나 통계 파일이 없습니다. <code>tools/build_persona_stats.py</code>로 생성할 수 있습니다.</p></div>`;
    const T=PS.meta.total,P=n=>(n/T*100).toFixed(1),bars=o=>dist(Object.entries(o).slice(0,6).map(([k,v])=>[k,+P(v)]));
    const bin=(N.ageHist||[]).find(([k])=>{const m=(k.match(/\d+/g)||[]).map(Number);if(!m.length)return false;if(m.length>1)return age>=m[0]&&age<=m[1];if(/대$/.test(k))return age>=m[0]&&age<m[0]+10;return age>=m[0]});
    const fk={solo:"1인 가구",couple:"부부 가구",kids:"자녀와 함께 사는 가구",parents:"부모님과 함께 사는 가구",multi:"3세대 이상 가구"};
    const lines=[bin?`만 ${age}세가 속한 ${bin[0]} 구간은 전체의 ${P(bin[1])}%입니다.`:"",
      pf.prov&&N.province&&N.province[pf.prov]?`${pf.prov} 거주자는 ${P(N.province[pf.prov])}%로 17개 시도 중 ${Object.values(N.province).sort((a,b)=>b-a).indexOf(N.province[pf.prov])+1}번째로 많습니다.`:"",
      pf.fam&&N.famGroup&&N.famGroup[pf.fam]?`${fk[pf.fam]}는 ${P(N.famGroup[pf.fam])}%입니다.${pf.fam==="solo"?" 열 명 중 한 명 이상이 혼자 사는 셈이라, 1인 가구를 위한 모임과 서비스가 계속 늘고 있습니다.":""}`:"",
      N.marital&&N.marital["배우자있음"]?`전체의 ${P(N.marital["배우자있음"])}%가 배우자가 있습니다.${N.housing?` 아파트 거주는 ${P(N.housing["아파트"])}%입니다.`:""}`:""].filter(Boolean);
    return`<div class="card avoid"><span class="label">대한민국 합성 페르소나 비교 · 전국 ${T.toLocaleString()}명 <span class="src syn">합성 데이터 · 실제 국민 조사 아님</span></span>
     <p>NVIDIA가 한국 인구 분포를 본떠 만든 합성 페르소나 100만 명 안에서 보면, ${lines.join(" ")}</p>
     <div class="grid2">${[["혼인 상태",N.marital],["주거 형태",N.housing],["학력",N.education],["대학 전공 계열",N.major]].filter(x=>x[1]).map(([h,o])=>`<div><h3>${h}</h3>${bars(o)}</div>`).join("")}</div>
     <p class="note">출처: ${esc(PS.meta.source)} · 전국 ${T.toLocaleString()}명 분포(${PS.meta.built} 집계). 개별 페르소나는 쓰지 않았으며 실제 인구 통계가 아닌 합성 데이터입니다. 연령대·성별·권역별 비교는 원본 DB로 <code>tools/build_persona_stats.py</code>를 실행하면 더해집니다.</p></div>`;
  }
  const s=`${planHTML(false)}<div class="grid2">
   <div class="card"><span class="label">${band} · ${L.t}</span><p>만 ${age}세 무렵의 핵심 과제는 ‘${L.t.split("의")[0]}’입니다. ${f.Y}년 세운이 <b>${ts.n}</b>이라 ${["자립","표현과 성과","재물","책임과 직위","배움"][ts.g]}의 기운이 이 과제를 밀어 줍니다.</p></div>
   ${occ?`<div class="card"><span class="label">직업 · ${occ[1]}</span><p>${OCCX[occ[0]]} ${occFit}</p></div>`:""}
   ${rg?`<div class="card"><span class="label">거주 권역 · ${pf.prov} (${rg})</span><p>${REGX[rg]}</p><p class="note">행운 방향 ${EDIR[lucky[0]]}: 거주지에서 ${EDIR[lucky[0]]}으로의 나들이나 이동이 기분 전환에 좋습니다.</p></div>`:""}
   ${fam?`<div class="card"><span class="label">가구 · ${fam[1]}</span><p>${FAMX[fam[0]]}</p></div>`:""}
   ${house?`<div class="card"><span class="label">주거 · ${house[1]}</span><p>${HOUSEX[house[0]]}</p></div>`:""}
   ${intRec?`<div class="card"><span class="label">관심사와 개운</span><p>${intRec}</p></div>`:""}</div>
   ${filled===0?`<p class="note">위의 ‘생활 프로필’을 채우면 직업·지역·가구·주거·관심사에 맞춘 해설이 더해집니다.</p>`:""}
   ${statCard}`;
  const d=`<div class="dethead">${band} 생애 단계 맞춤 조언</div>
  <dl class="dl"><dt>일</dt><dd>${L.w}</dd><dt>돈</dt><dd>${L.m}${house?" "+HOUSEX[house[0]]:""}</dd><dt>관계</dt><dd>${L.r}${fam?" "+FAMX[fam[0]]:""}</dd><dt>건강</dt><dd>${L.h} ${DMX[me].건강}</dd></dl>
  <div class="dethead">사주 × 생활 조건</div>
  <div class="grid2"><div class="card"><span class="label">올해 일의 방향</span><p>${SEUN[ts.g].직업}${occ?` ${occ[1]} 일을 한다면 ${["독립·전문성 강화","성과 공개와 발표","실적과 보상 협상","승진·자격 도전","교육·자격 취득"][ts.g]}에 힘을 실으세요.`:""}</p></div>
   <div class="card"><span class="label">올해 돈의 방향</span><p>${SEUN[ts.g].재물}${band==="30대"||band==="40대"?" 목돈 이벤트가 많은 시기라 지출 계획을 분기마다 점검하세요.":""}</p></div>
   <div class="card"><span class="label">관계의 방향</span><p>${SEUN[ts.g].연애}${fam&&fam[0]==="solo"?" 1인 가구라면 새 모임이 인연의 통로가 됩니다.":""}</p></div>
   <div class="card"><span class="label">나에게 맞는 개운 루틴</span><p>${ELACT[lucky[0]]}. ${DMX[me].개운}.${pf.ints.length?" "+intRec.replace(/<[^>]+>/g,""):""}</p></div></div>
  ${seg?`<div class="dethead">같은 조건 페르소나와 비교해 본 나</div>
   <p>${occ?`같은 집단에서 가장 흔한 직업은 ${esc(seg.occupation[0][0])}(${seg.occupation[0][1]}%)입니다. `:""}${fam?`가구 형태는 ${esc(seg.household[0][0])}가 가장 많습니다(${seg.household[0][1]}%). `:""}${seg.hobby[0]?`이 집단이 가장 많이 즐기는 취미는 ‘${esc(seg.hobby[0][0])}’입니다. 새로운 사람을 만나고 싶다면 이런 모임이 좋은 출발점이 됩니다.`:""}</p>`:""}
  <p class="note">생활 프로필은 화면 안에서만 쓰이며 저장되거나 전송되지 않습니다. 맞춤 조언은 생애 단계와 사회적 조건에 대한 일반적인 경향을 사주 풀이와 엮은 참고용입니다.</p>`;
  return{s,d};
}
