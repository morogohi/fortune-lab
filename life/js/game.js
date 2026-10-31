/* ================= 유틸 ================= */
const $=s=>document.querySelector(s);
const R=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const usd=m=>{const s=m<0?'-':'';m=Math.abs(m);
  if(m>=1e6)return s+'$'+(m/1e6).toFixed(m>=1e7?0:1)+'M';
  return s+'$'+Math.round(m).toLocaleString()};
const buzz=ms=>Native.vibrate(ms);
function wpick(arr,wf){const t=arr.reduce((s,x)=>s+wf(x),0);let r=Math.random()*t;for(const x of arr){if((r-=wf(x))<=0)return x}return arr[0]}
const M=x=>Math.round(x*P.mult); // 선진국 기준 금액 → 출생국 물가

/* ================= 저장(가능할 때만) ================= */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let karma=store.get('p8b_karma',20);
let hist=store.get('p8b_hist',[]);
const saveMeta=()=>{store.set('p8b_karma',karma);store.set('p8b_hist',hist.slice(0,20))};

/* ================= 세계 데이터 (인구 비중 %) ================= */
// [이름, 국기, 세계인구 비중%, 소득등급 1=고소득 2=중소득 3=저소득, 지역]
const COUNTRIES=[
 ['인도','🇮🇳',17.8,3,'s'],['중국','🇨🇳',17.5,2,'cn'],['미국','🇺🇸',4.2,1,'m'],['인도네시아','🇮🇩',3.5,2,'se'],
 ['파키스탄','🇵🇰',3.0,3,'s'],['나이지리아','🇳🇬',2.8,3,'af'],['브라질','🇧🇷',2.6,2,'la'],['방글라데시','🇧🇩',2.2,3,'s'],
 ['러시아','🇷🇺',1.8,2,'eu'],['에티오피아','🇪🇹',1.6,3,'af'],['멕시코','🇲🇽',1.6,2,'la'],['일본','🇯🇵',1.5,1,'jp'],
 ['필리핀','🇵🇭',1.4,3,'se'],['이집트','🇪🇬',1.4,3,'me'],['콩고민주공화국','🇨🇩',1.3,3,'af'],['베트남','🇻🇳',1.2,2,'se'],
 ['이란','🇮🇷',1.1,2,'me'],['튀르키예','🇹🇷',1.1,2,'me'],['독일','🇩🇪',1.0,1,'eu'],['태국','🇹🇭',0.9,2,'se'],
 ['영국','🇬🇧',0.85,1,'eu'],['프랑스','🇫🇷',0.8,1,'eu'],['케냐','🇰🇪',0.7,3,'af'],['한국','🇰🇷',0.65,1,'kr'],
 ['아프가니스탄','🇦🇫',0.55,3,'me'],['캐나다','🇨🇦',0.5,1,'m'],['호주','🇦🇺',0.33,1,'m'],['아이티','🇭🇹',0.15,3,'af'],
].map(([n,f,w,t,r])=>({n,f,w,t,r}));
const TIER={
 1:{mult:1,  rural:.18,hp:6, life:0, n:'고소득국',cls:[3,30,50,15,2]},
 2:{mult:.3, rural:.4, hp:0, life:-3,n:'중소득국',cls:[15,40,35,9,1]},
 3:{mult:.08,rural:.65,hp:-8,life:-8,n:'저소득국',cls:[45,35,15,4,1]},
};
const CLASSES=[
 {n:'극빈층',e:'🥣',wealth:0,     hap:-8, bond:5},
 {n:'서민층',e:'🏚️',wealth:6000,  hap:-2, bond:0},
 {n:'중산층',e:'🏡',wealth:60000, hap:3,  bond:0},
 {n:'부유층',e:'💎',wealth:600000,hap:6,  bond:-3},
 {n:'상위 1%',e:'👑',wealth:12e6,hap:8,  bond:-6},
];
const NAMES={
 kr:[['민준','서준','도윤','지호','현우'],['서연','지우','하은','민서','수아'],['김','이','박','최','정']],
 jp:[['하루토','렌','소타','유토'],['유이','하나','사쿠라','미오']],
 cn:[['왕웨이','리양','장하오','류천'],['리나','왕팡','천징','쉬란']],
 af:[['키마니','오몬디','치네두','아베베','무소니'],['와장구','아치엥','은고지','알레무','아미나']],
 s:[['아르준','라훌','무함마드','라비','아미르'],['프리야','아니타','파티마','수닐라','아이샤']],
 se:[['부디','안디','반안','솜차이','호세'],['시티','데위','린','말리','마리아']],
 me:[['아마드','오마르','메흐메트','알리'],['파티마','제이넵','레일라','마리암']],
 eu:[['루카스','토마스','올리버','막심','레옹'],['엠마','소피아','안나','클로에']],
 m:[['제임스','노아','리암','이선'],['올리비아','에바','미아','클레어']],
 la:[['산티아고','마테오','디에고','가브리엘'],['발렌티나','카밀라','루시아','이사벨라']],
};
const SKIN={kr:['#ffd9b3','#f6c79c'],jp:['#ffd9b3','#f6c79c'],cn:['#ffd9b3','#f6c79c'],af:['#7a4a2a','#5c3720','#8d5a36'],
 s:['#b5835a','#9c6b45','#c49069'],se:['#d9a578','#c99165'],me:['#e0b48a','#c99a72'],eu:['#ffe0c8','#f6d0b0'],m:['#ffe0c8','#e9b38a','#7a4a2a'],la:['#d9a578','#e9b38a']};
const TALENTS=[
 {n:'천재 두뇌',k:'smart',v:25,e:'🧠'},{n:'눈부신 매력',k:'look',v:25,e:'✨'},
 {n:'강철 체력',k:'hp',v:20,e:'💪'},{n:'타고난 낙천가',k:'hap',v:20,e:'😆'},
 {n:'예술 감각',k:'art',v:0,e:'🎨'},{n:'따뜻한 마음',k:'bond',v:20,e:'💗'},{n:'평범함',k:null,v:0,e:'🙂'},
];
const JOBS=[ // pay: 고소득국 기준 연봉($) → 출생국 물가 반영 · lad: 직급 사다리
 {id:'farm',n:'농부',e:'🌾',pay:24000,lad:'farm',req:p=>p.rural},
 {id:'day',n:'건설 노동자',e:'🧱',pay:24000,lad:'day',req:p=>true},
 {id:'market',n:'시장 상인',e:'🧺',pay:26000,lad:'market',req:p=>true},
 {id:'factory',n:'공장 노동자',e:'🏭',pay:30000,lad:'factory',req:p=>p.edu>=1&&!p.rural},
 {id:'driver',n:'배달 기사',e:'🛵',pay:28000,lad:'driver',req:p=>p.edu>=1},
 {id:'office',n:'회사원',e:'💼',pay:48000,lad:'corp',req:p=>p.edu>=2&&p.smart>=40},
 {id:'teacher',n:'교사',e:'📚',pay:52000,lad:'teacher',req:p=>p.major==='edu'||(p.edu>=3&&['hum','sci','pe','art'].includes(p.major))},
 {id:'nurse',n:'간호사',e:'💉',pay:62000,lad:'nurse',req:p=>p.major==='nurse'},
 {id:'eng',n:'엔지니어',e:'⚙️',pay:85000,lad:'corp',req:p=>['ee','cs','sci'].includes(p.major)&&p.smart>=50},
 {id:'elec',n:'전기기사',e:'⚡',pay:58000,lad:'elec',req:p=>p.certs.has('elec')||p.major==='ee'},
 {id:'dev',n:'개발자',e:'💻',pay:100000,lad:'dev',req:p=>p.major==='cs'||p.certs.has('it')||p.sub.code>=60},
 {id:'doctor',n:'의사',e:'👨‍⚕️',pay:190000,lad:'doctor',req:p=>p.major==='med'},
 {id:'lawyer',n:'변호사',e:'⚖️',pay:140000,lad:'lawyer',req:p=>p.major==='law'&&p.smart>=60},
 {id:'chef',n:'요리사',e:'👨‍🍳',pay:36000,lad:'chef',req:p=>p.certs.has('chef')||(p.hlv['요리']||0)>=3},
 {id:'athlete',n:'운동선수',e:'🏅',pay:-1,lad:'athlete',req:p=>(p.major==='pe'||p.sub.pe>=65)&&p.hp>=60},
 {id:'creator',n:'크리에이터',e:'📹',pay:-1,lad:'creator',req:p=>p.look>=45||p.hap>=60},
 {id:'artist',n:'예술가',e:'🎨',pay:-1,lad:'artist',req:p=>p.art||p.major==='art'},
];
function stageOf(a){
  if(a<=3)return{k:'baby',n:'아기'};if(a<=7)return{k:'kid',n:'어린이'};if(a<=13)return{k:'elem',n:'소년기'};
  if(a<=19)return{k:'teen',n:'청소년'};if(a<=29)return{k:'young',n:'청년'};if(a<=59)return{k:'adult',n:'중년'};return{k:'old',n:'노년'};
}

/* ================= 상태 ================= */
let P=null;
function newLife(opt={}){
  const c=(opt.country&&COUNTRIES.find(x=>x.n===opt.country))||wpick(COUNTRIES,x=>x.w);const T=TIER[c.t];
  const ci=opt.cls!=null?opt.cls:wpick([0,1,2,3,4],i=>T.cls[i]);const cl=CLASSES[ci];
  const male=opt.male!=null?opt.male:Math.random()<.5;
  const nm=NAMES[c.r];let name=pick(nm[male?0:1]);if(c.r==='kr')name=pick(nm[2])+name;
  const tal=(opt.talent!=null&&TALENTS[opt.talent])||pick(TALENTS);
  const rural=ci<=2&&Math.random()<T.rural;
  P={country:c,tier:c.t,mult:T.mult,cls:ci,clsInfo:cl,rural,male,name,tal,
    age:0,hap:R(45,68)+cl.hap,hp:R(55,78)+T.hp,smart:R(20,50),look:R(25,60),bond:R(45,70)+cl.bond,
    money:0,famWealth:Math.round(cl.wealth*T.mult),edu:0,inSchool:(c.t===1||ci>=2),
    job:null,jobPay:0,jobYears:0,partner:null,married:false,kids:0,kidAges:[],
    energy:2,alive:true,art:tal.k==='art',lifeHap:0,peak:0,trace:[],marks:new Set(),badges:new Set(),seen:new Set(),
    retired:false,house:false,pet:null,fame:0,biz:false,revived:false,beard:Math.random()<.5,hairLong:Math.random()<.5,
    moments:[],album:[],firstJob:null,peakAge:0,spouseName:null,deathReason:null,
    hair:pick(['#1a120c','#2b1b12','#111','#4a2c17']),skin:pick(SKIN[c.r]),
    shirt:pick(['#ff6b81','#5ec8ff','#ffcc4d','#5be08f','#c58bff','#ff8a3d']),
  };
  if(tal.k&&tal.k!=='art')P[tal.k]+=tal.v;
  if(opt.name)P.name=opt.name;
  P.custom=!!opt.birth;P.birth=opt.birth||Saju.randomBirth();
  initLife2(P);
  P.saju=Saju.analyze(P.birth,male);Saju.applyStats(P,P.saju);
  ['hap','hp','smart','look','bond'].forEach(k=>P[k]=clamp(P[k]));
  pickBucket(P);
  if(opt.mate&&P.saju){P.mate={...opt.mate};P.mate.saju=Saju.analyze(opt.mate.birth,opt.mate.male);P.mate.c=Saju.compatPair(P.saju,P.mate.saju)}
}

/* ================= 효과/로그 ================= */
const COL={hap:'var(--hap)',hp:'var(--hp)',smart:'var(--smart)',look:'var(--look)',bond:'var(--bond)',money:'var(--money)'};
const LAB={hap:'행복',hp:'건강',smart:'지능',look:'매력',bond:'가족유대',money:'돈'};
const ICON={hap:'😊',hp:'❤️',smart:'🧠',look:'✨',bond:'💗'};
function fx(o,quiet){
  let i=0;
  for(const k in o){const v=o[k];if(!v)continue;
    if(k==='money')P.money+=v;else P[k]=clamp(P[k]+v);
    if(!quiet){const txt=(v>0?'+':'')+(k==='money'?usd(v):v)+' '+LAB[k];setTimeout(()=>floatText(txt,COL[k]),i*170);i++}}
  const nw=netWorth();if(nw>P.peak){P.peak=nw;P.peakAge=P.age}renderStats();
}
function floatText(t,c){const d=document.createElement('div');d.className='float';d.textContent=t;d.style.color=c;
  d.style.left=(15+Math.random()*55)+'%';d.style.top=(35+Math.random()*30)+'%';$('#floatLayer').appendChild(d);setTimeout(()=>d.remove(),1500)}
function yearHeader(){const h=document.createElement('div');h.className='yr';const se=seasonOf(P.age);h.textContent=`${P.birth.y+P.age}년 · ${P.age}살 · ${stageOf(P.age).n} ${se.e}`;$('#log').appendChild(h)}
let lastLog='';
function log(t,cls=''){lastLog=t;const d=document.createElement('div');d.className='ln '+cls;d.textContent=t;$('#log').appendChild(d);$('#log').scrollTop=1e9}
function badge(b){if(!P.badges.has(b)){P.badges.add(b);log('🏅 업적: '+b,'good')}}
const kidWord=()=>P.kids>1?'아이들':'아이';

/* ================= 이벤트 ================= */
const poor=p=>p.cls<=1;
const EVENTS=[
 {id:'firstword',c:p=>p.age===1,once:1,e:'👶',t:'첫 마디!',d:'세상에 처음 내뱉은 단어는?',ch:[
  {t:'엄마',f:()=>{fx({bond:5});log('"엄마!" 온 가족이 감동했다','good')}},
  {t:'아빠',f:()=>{fx({bond:5});log('"아빠!" 아빠가 몰래 울었다','good')}},
  {t:'배고파',s:'???',f:()=>{fx({smart:4});log('첫 단어부터 생존형')}}]},
 {id:'doljabi',c:p=>p.age===1&&p.country.n==='한국',once:1,e:'🎂',t:'돌잡이',d:'돌상 위의 물건 중 하나를 잡았다',ch:[
  {t:'📚 연필',f:()=>{fx({smart:6});log('연필을 잡았다. 공부 잘할 팔자!')}},
  {t:'💵 돈',f:()=>{fx({hap:3});log('돈을 잡았다. 부자 될 팔자!')}},
  {t:'🧵 실',f:()=>{fx({hp:8});log('실을 잡았다. 무병장수!')}}]},
 {id:'water',c:p=>p.rural&&p.tier===3&&p.age>=6&&p.age<=12,once:1,e:'🪣',t:'물 긷는 아침',d:'우물까지 왕복 2시간. 오늘도 물을 길어와야 한다.',ch:[
  {t:'물 긷고 지각한다',f:()=>{fx({bond:6,smart:-2,hp:-2});log('가족은 고마워했지만 수업을 놓쳤다')}},
  {t:'새벽 4시에 일어나 둘 다 한다',f:()=>{fx({hp:-5,smart:2,bond:3});log('졸린 눈으로 수업을 들었다. 강해지고 있다');P.marks.add('grit')}},
  {t:'동생에게 미룬다',f:()=>{fx({bond:-6,smart:2});log('동생이 대신 갔다. 마음이 무겁다')}}]},
 {id:'school7',c:p=>p.age===7&&!p.inSchool,once:1,e:'🎒',t:'학교에 갈 수 있을까',d:'교복비와 학비가 없다. 부모님이 고민 중이다.',ch:[
  {t:'빚을 내서라도 보낸다',f:()=>{P.inSchool=true;P.edu=1;fx({bond:4,money:-M(500)});log('부모님이 빚을 내 학교에 보내주셨다','good')}},
  {t:'집안일과 농사를 돕는다',f:()=>{fx({bond:5,smart:-5,hp:3});log('학교 대신 밭으로 나갔다','bad');P.marks.add('noschool')}}]},
 {id:'school14',c:p=>p.age===14&&p.inSchool&&(poor(p)||p.tier===3),once:1,e:'🏫',t:'중학교 진학의 갈림길',d:'학비가 부족해 진학이 어렵다.',ch:[
  {t:'학교를 포기하고 시장에서 일한다',s:'돈 + / 지능 - / 건강 -',f:()=>{P.inSchool=false;fx({money:M(1500),smart:-4,hp:-3,bond:4});log('학교를 그만두고 일찍 철이 들었다','bad');P.marks.add('dropout')}},
  {t:'장학금 시험에 올인한다',s:'스트레스 ++ / 지능 필요',f:()=>{const ok=P.smart+R(-15,15)>=60;fx({hap:-6,hp:-2});if(ok){P.edu=2;fx({smart:6,hap:12});playAnim('grad');log('🎉 장학생 선발! 학교를 계속 다닌다','good');badge('장학생')}else{P.inSchool=false;fx({hap:-8});log('시험에 떨어졌다… 학교를 떠났다','bad');P.marks.add('dropout')}}},
  {t:'친척에게 돈을 빌린다',s:'관계 리스크',f:()=>{if(Math.random()<.55){P.edu=2;fx({bond:-4,money:-M(1200)});log('친척이 도와줬다. 대신 갚아야 할 빚이 생겼다')}else{fx({bond:-10,hap:-6});P.inSchool=false;log('거절당했다. 집안 분위기가 싸늘하다','bad');P.marks.add('dropout')}}}]},
 {id:'kinder',c:p=>p.age===5,once:1,e:'🧸',t:'친구와 다툼',d:'친구가 내 장난감을 뺏어갔다!',ch:[
  {t:'같이 놀자고 한다',f:()=>{fx({hap:6});log('평생 친구가 생겼다','good')}},
  {t:'다시 뺏어온다',f:()=>{fx({hp:2,hap:-1});log('엎치락뒤치락… 둘 다 혼났다')}}]},
 {id:'test',c:p=>p.age>=9&&p.age<=18&&p.inSchool,e:'📝',t:'시험 전날',d:'친구가 놀러 나가자고 한다',ch:[
  {t:'밤새 공부한다',f:()=>{fx({smart:5,hp:-3,hap:-2});log('시험 잘 봤다! 근데 피곤하다')}},
  {t:'놀러 간다',f:()=>{fx({hap:5,smart:-3});log('시험은 망했지만 추억은 남았다')}}]},
 {id:'crush',c:p=>p.age>=14&&p.age<=18,once:1,e:'💌',t:'첫사랑',d:'자꾸 눈에 밟히는 사람이 생겼다',ch:[
  {t:'고백한다',f:()=>{const ok=Math.random()<(.3+P.look/200);playAnim(ok?'love':'sad');fx(ok?{hap:12}:{hap:-8});log(ok?'풋풋한 첫 연애 💕':'차였다… 이불킥 3년 예약',ok?'good':'bad')}},
  {t:'마음속에 묻어둔다',f:()=>{fx({hap:-2,smart:1});log('그 마음은 아직도 기억난다')}}]},
 {id:'college',c:p=>p.age===18&&p.inSchool,once:1,e:'🎓',t:'대학 진학',d:'',dyn:p=>`지능 ${p.smart} · 가정형편 ${p.clsInfo.n}`,ch:[
  {t:'대학에 도전한다',f:()=>{const s=P.smart+R(-12,12)+(P.cls>=3?10:0);const cost=M(P.cls>=2?4000:9000);
    if(s>=55){P.edu=3;fx({hap:10,money:P.cls>=3?0:-cost});log('🎉 대학 합격!'+(P.cls>=3?'':' 학자금 '+usd(cost)),'good');if(s>=85)badge('명문대 합격');setTimeout(()=>chooseMajor(),60)}
    else{P.edu=Math.max(P.edu,2);fx({hap:-6});log('불합격… 바로 사회로 나간다','bad')}}},
  {t:'바로 돈을 번다',f:()=>{P.edu=Math.max(P.edu,2);fx({bond:3});log('가족을 위해 일을 택했다')}}]},
 {id:'army',c:p=>p.male&&p.age===21&&p.country.n==='한국',once:1,e:'🪖',t:'입영 통지서',d:'드디어 올 것이 왔다',ch:[
  {t:'씩씩하게 입대',f:()=>{fx({hp:10,hap:-5});log('18개월 복무 후 전역!');badge('병역 필')}}]},
 {id:'malaria',c:p=>p.tier===3&&p.age>=2,e:'🦟',t:'고열과 오한',d:'말라리아 증상이다. 병원은 멀고 돈이 든다.',ch:[
  {t:'먼 도시 병원까지 간다',f:()=>{fx({money:-M(800),hp:-4});log('치료를 받고 회복했다')}},
  {t:'집에서 버틴다',f:()=>{const b=Math.random()<.5;fx({hp:b?-25:-8});log(b?'생사를 오갔다…':'겨우 버텨냈다','bad');if(b)P.marks.add('sick')}}]},
 {id:'drought',c:p=>p.rural&&p.age>=10,e:'☀️',t:'가뭄',d:'올해 비가 오지 않는다. 작물이 말라간다.',ch:[
  {t:'가축을 팔아 버틴다',f:()=>{fx({money:M(600),hap:-6,bond:2});log('소중한 염소를 팔았다')}},
  {t:'도시로 일하러 간다',f:()=>{P.rural=false;fx({bond:-5,money:M(1500)});log('🏙️ 고향을 떠나 도시로 왔다');P.marks.add('migrant')}}]},
 {id:'migrate',c:p=>p.tier>=2&&p.age>=19&&p.age<=40&&!p.abroad,once:1,e:'✈️',t:'해외 취업 제안',d:'외국에서 일하면 몇 배를 벌 수 있다고 한다.',ch:[
  {t:'떠난다',s:'수입↑ 가족유대↓',f:()=>{P.abroad=true;P.mult=Math.min(1,P.mult*3);fx({bond:-12,hap:-3});log('🧳 가족을 위해 해외로 떠났다. 매달 송금한다');P.marks.add('migrant');badge('이주 노동자')}},
  {t:'가족 곁에 남는다',f:()=>{fx({bond:6});log('가난해도 함께가 좋다')}}]},
 {id:'baby',c:p=>p.married&&p.age<=44&&p.kids<4,e:'🍼',t:'새 생명',d:'가족이 늘어날 것 같다',ch:[
  {t:'아이를 맞이한다',f:()=>{const nm=addKid();fx({hap:12,bond:8,money:-M(1500),hp:-3});log(`👶 ${P.kids}번째 아이 ${nm}이(가) 태어났다!`,'good');badge('부모');P.moments.push({a:P.age,e:'👶',t:'출산',c:nm,r:''});checkBucket()}},
  {t:'지금은 어렵다',f:()=>{fx({hap:-1});log('다음을 기약했다')}}]},
 {id:'letter',c:p=>p.kidAges.some(a=>a>=7&&a<=10),once:1,e:'✉️',t:'아이의 손편지',html:p=>`<div class="letter">${p.male?'아빠':'엄마'}에게\n\n${p.male?'아빠':'엄마'} 맨날 일하느라 힘들지?\n나 커서 꼭 ${p.male?'아빠':'엄마'}한테 맛있는 거 사줄게.\n사랑해요 ♡\n\n- ${kidWord()==='아이'?'우리 아이':'첫째'} 올림</div>`,ch:[
  {t:'꼭 안아준다 🤗',f:()=>{fx({hap:15,bond:12});log('이 편지는 평생 지갑 속에 넣고 다녔다','good');P.marks.add('letter')}}]},
 {id:'kidfee',c:p=>p.kidAges.some(a=>a>=12&&a<=15)&&(poor(p)||p.money<M(3000)),once:1,e:'📚',t:'아이의 학비',d:'',dyn:p=>`${kidWord()} 학비가 부족하다. 모아둔 돈 ${usd(p.money)}.`,ch:[
  {t:'빚을 내서라도 보낸다',f:()=>{fx({money:-M(5000),hap:-4,bond:10});log(`${kidWord()}만큼은 끝까지 학교에 보내기로 했다`,'good');P.marks.add('kidschool');badge('아이를 지킨 부모')}},
  {t:'아이도 일을 돕게 한다',f:()=>{fx({money:M(1000),bond:-12,hap:-6});log('아이의 눈빛이 마음에 남았다','bad')}}]},
 {id:'biz',c:p=>p.age>=24&&p.age<=55&&!p.biz,e:'🏪',t:'창업 기회',d:'',dyn:p=>p.tier===3?'소액대출로 작은 가게를 열 수 있다':'모은 돈으로 사업을 해볼까?',ch:[
  {t:'대출 받아 창업한다',f:()=>{P.biz=true;fx({money:-M(8000)});
    const L=Saju.luckAt(P.saju,P.age);const r=Math.random()+P.smart/300+(L&&L.g===0?.15:0)+(P.major==='biz'?.08:0);
    if(r>1.0){fx({money:M(40000),hap:15});log('🚀 사업 대성공!','good');playAnim('jackpot',3);badge('사업 성공');P.marks.add('selfmade')}
    else if(r>.55){fx({money:M(9000),hap:4});log('가게가 그럭저럭 굴러간다')}
    else{fx({money:-M(12000),hap:-14,bond:-5});log('💥 사업 실패… 빚만 남았다','bad');playAnim('sad');P.marks.add('debt')}}},
  {t:'안정이 최고',f:()=>log('지금 자리를 지키기로 했다')}]},
 {id:'loss',c:p=>p.married&&p.age>=45,e:'🕯️',t:'이별',d:'',dyn:p=>`배우자 ${p.partner}이(가) 갑자기 쓰러졌다.`,ch:[
  {t:'곁을 지킨다',f:()=>{if(Math.random()<.5){fx({hap:-5,money:-M(3000)});log('긴 간병 끝에 회복했다','good')}else{P.married=false;P.widowed=true;fx({hap:-22,bond:-5});log(`${P.partner}을(를) 먼저 떠나보냈다…`,'bad');P.partner=null;P.rel=null;P.marks.add('loss')}}}]},
 {id:'lotto',c:p=>p.age>=20,e:'🎰',t:'복권 한 장?',d:'길가 복권 판매대가 눈에 띈다',ch:[
  {t:'한 장 산다',f:()=>{const r=Math.random();
    if(r<.004){fx({money:M(2e6),hap:30});log('🎊 복권 1등!!! 인생 역전!!','good');playAnim('jackpot',3);badge('복권 1등');P.marks.add('lotto');buzz([100,50,100,50,300])}
    else if(r<.04){fx({money:M(1000),hap:5});log('소액 당첨!','good')}else{fx({hap:-1});log('역시 꽝')}}},
  {t:'그냥 지나간다',f:()=>log('현명한 선택')}]},
 {id:'job_loss',c:p=>p.job&&p.age>=25&&p.age<60,e:'📉',t:'경기 불황',d:'회사가 어렵다며 감원을 시작했다',ch:[
  {t:'버틴다',f:()=>{if(Math.random()<.35){log('결국 일자리를 잃었다','bad');P.job=null;fx({hap:-15})}else{fx({hap:-3,hp:-3});log('살아남았다. 휴…')}}},
  {t:'다른 길을 찾는다',f:()=>{P.job=null;fx({money:M(2000),hap:-2});log('퇴사하고 새 출발을 준비한다')}}]},
 {id:'sick',c:p=>p.age>=35&&p.hp<45,e:'🏥',t:'건강 적신호',d:'몸이 예전 같지 않다',ch:[
  {t:'치료 받는다',f:()=>{fx({hp:15,money:-M(3000),hap:-2});log('치료비가 부담됐지만 몸이 좋아졌다')}},
  {t:'일해야 해서 참는다',f:()=>{fx({hp:-12,money:M(500)});log('병을 키우고 있다','bad');P.marks.add('sick')}}]},
 {id:'pet',c:p=>p.age>=8&&!p.pet,once:1,e:'🐶',t:'떠돌이 강아지',d:'강아지가 졸졸 따라온다',ch:[
  {t:'데려가서 키운다',f:()=>{P.pet=pick(['초코','룰루','바바','모모','보리']);fx({hap:10});log(`강아지 "${P.pet}"가 가족이 됐다 🐶`,'good')}},
  {t:'먹을 것만 주고 보낸다',f:()=>{fx({hap:2});log('잘 살길…')}}]},
 {id:'viral',c:p=>p.job&&p.job.id==='creator',e:'🔥',t:'영상 떡상 조짐',d:'어떤 콘텐츠를 올릴까?',ch:[
  {t:'우리 동네 일상',f:()=>{const g=R(0,3);P.fame+=g;fx({money:M(g*900),hap:3});log(g>1?'세계인이 우리 동네에 관심을 가졌다!':'평범한 반응')}},
  {t:'인생 시뮬 게임 리뷰',f:()=>{const g=R(1,3);P.fame+=g;fx({money:M(g*800),hap:4});log('"남의 인생 체험" 쇼츠가 터졌다!','good')}}]},
 {id:'scam',c:p=>p.age>=60&&p.money>M(2000),e:'📞',t:'수상한 전화',d:'"자녀분이 사고를 당했어요. 급히 송금하세요"',ch:[
  {t:'바로 송금한다',f:()=>{fx({money:-M(2000),hap:-15});log('사기였다…','bad')}},
  {t:'가족에게 확인한다',f:()=>{fx({smart:2,bond:3});log('침착하게 사기를 피했다','good')}}]},
 {id:'grand',c:p=>p.kidAges.some(a=>a>=25),once:1,e:'👵',t:'손주 탄생',d:'첫 손주가 태어났다!',ch:[
  {t:'두 팔 벌려 안아준다',f:()=>{fx({hap:15,bond:10});log('손주의 작은 손을 잡았다 🥰','good');badge('조부모')}}]},
 {id:'epidemic',c:p=>p.age>=10,e:'🦠',t:'전염병 유행',d:'세계적으로 전염병이 퍼지고 있다',ch:[
  {t:'조심 또 조심',f:()=>{fx({hp:-2,hap:-3});log('조심한 덕에 가볍게 지나갔다')}},
  {t:'생계 때문에 계속 일한다',f:()=>{const b=Math.random()<.5;fx({hp:b?-15:0,money:M(800)});log(b?'심하게 앓았다…':'운 좋게 피했다',b?'bad':'')}}]},
];

/* ================= 활동 ================= */
const ACTS={
 baby:[{e:'😭',n:'울기',f:()=>{fx({bond:3});say('응애~');log('응애~ 가족이 달려왔다')}},{e:'🧸',n:'옹알이',f:()=>{fx({hap:4,bond:1});say('까르르');log('까르르 웃었다')}},{e:'😴',n:'잠자기',f:()=>{fx({hp:4});say('쿨쿨…');log('쑥쑥 컸다')}}],
 kid:[{e:'🎈',n:'놀이',f:openPlay,free:1},{e:'📖',n:'그림책',f:()=>{fx({smart:3});P.sub.kor=clamp(P.sub.kor+3);say('가나다라~');log('📖 글자를 깨쳤다')}},
   {e:'🧹',n:'집안일',f:()=>{fx({bond:4,hp:-1});say('내가 도와줄게!');log('부모님을 도왔다')}},{e:'🎵',n:'노래',f:()=>{fx({hap:3});P.sub.music=clamp(P.sub.music+3);if(Math.random()<.2){P.art=true;log('🎵 음악적 재능이 보인다!','good')}else log('🎵 흥얼흥얼');say('🎶 랄라~')}}],
 elem:[{e:'📚',n:'공부',f:openStudy,free:1},{e:'🎈',n:'놀이',f:openPlay,free:1},{e:'🎯',n:'취미',f:openHobby,free:1},
   {e:'🧹',n:'집안일',f:()=>{fx({bond:4,hp:-1});say(P.rural?'닭 모이 주기':'설거지 완료!');log(P.rural?'가축을 돌봤다':'설거지를 했다')}}],
 teen:[{e:'📚',n:'공부',f:openStudy,free:1},{e:'🎯',n:'취미',f:openHobby,free:1},{e:'💄',n:'꾸미기',f:()=>{fx({look:4,hap:2});say('오늘 좀 괜찮은데?');log('스타일 변신!')}},
   {e:'🍔',n:'알바',f:()=>{fx({money:M(1500),hp:-2,bond:2});say('어서오세요~');log('번 돈 '+usd(M(1500))+' 중 일부를 집에 보탰다')}},
   {e:'👪',n:'가족시간',f:()=>{fx({bond:6});say('엄마 밥 최고');log('가족과 저녁을 먹었다')}}],
 young:[{e:'🎯',n:'취미',f:openHobby,free:1},{e:'📘',n:'자기계발',f:openSelfDev,free:1},
   {e:'⏰',n:'추가근무',f:()=>{if(!P.job){log('일이 없다');return}fx({money:Math.round(P.jobPay*.12),hp:-4,hap:-3});P.perf=clamp(P.perf+6);say('오늘도 야근…');log(`⏰ 야근 수당 · 성과 ${P.perf}`)}},
   {e:'✈️',n:'여행',f:()=>{fx({hap:10,money:-M(1500)});P.trips++;const d=pick(['제주도','오사카','파리','방콕','뉴욕','발리','다낭','로마']);say(`${d} 최고!`);log(`✈️ ${d} 여행 (${P.trips}번째)`);checkBucket()}},
   {e:'🍻',n:'친구들',f:()=>{fx({hap:5,hp:-2});say('건배~ 🍻');log('친구들과 밤새 수다')}},
   {e:'💪',n:'운동',f:()=>{fx({hp:5,look:2});say('하나 더!');log('💪 꾸준히 운동')}},
   {e:'👪',n:'가족시간',f:()=>{fx({bond:6,hap:2});say('잘 지내시죠?');log('부모님께 안부를 전했다')}}],
 adult:[{e:'👪',n:'가족시간',f:()=>{fx({bond:7,hap:3});if(P.rel&&P.married)P.rel.aff=clamp(P.rel.aff+5);say(P.kids?'우리 아이 최고!':'함께라서 좋아');log(P.kids?`${P.kidsList.map(k=>k.name).join(', ')}와(과) 놀아줬다`:'가족과 시간을 보냈다')}},
   {e:'⏰',n:'추가근무',f:()=>{if(!P.job){log('일이 없다');return}fx({money:Math.round(P.jobPay*.12),hp:-5,bond:-3});P.perf=clamp(P.perf+6);say('보고서 마감…');log(`⏰ 오늘도 늦게 퇴근 · 성과 ${P.perf}`)}},
   {e:'🎯',n:'취미',f:openHobby,free:1},{e:'📘',n:'자기계발',f:openSelfDev,free:1},
   {e:'💪',n:'운동',f:()=>{fx({hp:5});say('건강이 최고');log('💪 걷기 운동')}},
   {e:'🏥',n:'검진',f:()=>{fx({hp:7,money:-M(300)});say('이상 없음!');log('🏥 건강검진')}},
   {e:'✈️',n:'여행',f:()=>{fx({hap:9,bond:3,money:-M(2500)});P.trips++;const d=pick(['제주도','하와이','스위스','교토','싱가포르','이탈리아']);say(`${d} 가족여행!`);log(`✈️ ${d} 가족 여행 (${P.trips}번째)`);checkBucket()}},
   {e:'📈',n:'투자',f:()=>{const a=Math.min(Math.max(P.money*.2,0),M(20000));if(a<M(200)){log('투자할 돈이 없다');return}const L=Saju.luckAt(P.saju,P.age);const r=Math.random()<(.5+(L&&L.g===2?.15:0))?1:-1;fx({money:Math.round(a*R(10,40)/100*r),hap:r*4});say(r>0?'수익 났다 📈':'물렸다 📉');log((r>0?'📈 투자 수익':'📉 투자 손실…')+(L&&L.g===2?' (재물운)':''),r>0?'good':'bad')}}],
 old:[{e:'🚶',n:'산책',f:()=>{fx({hp:4,hap:3});say('날씨 좋다');log('동네 한 바퀴')}},{e:'🏥',n:'병원',f:()=>{fx({hp:8,money:-M(400)});say('관리 잘하고 있어요');log('정기 진료')}},
   {e:'🎯',n:'취미',f:openHobby,free:1},
   {e:'📞',n:'자식 연락',f:()=>{if(!P.kids){fx({hap:-2});log('연락할 자식이 없다…');return}fx({hap:7,bond:5});const k=pick(P.kidsList);say(`${k.name}아~`);log(`📞 ${k.name}의 목소리에 힘이 난다`)}},
   {e:'🤲',n:'나눔',f:()=>{if(P.money<M(3000)){log('나눌 여유가 없다');return}fx({money:-M(3000),hap:10});say('나눌수록 행복');log('마을에 기부했다','good');badge('나눔')}},
   {e:'📖',n:'회고록',f:()=>{fx({smart:2,hap:4});say('그땐 그랬지…');log('지나온 삶을 적었다')}}],
};

/* ================= 렌더 ================= */
function renderStats(){
  const s=['hap','hp','smart','look','bond'].map(k=>`<div class="stat"><div class="lab"><span>${ICON[k]} ${LAB[k]}</span><span>${P[k]}</span></div><div class="bar"><i style="width:${P[k]}%;background:${COL[k]}"></i></div></div>`).join('');
  const jobTxt=P.retired?'은퇴':(P.job?`${P.job.e} ${P.job.n} · ${rankName()}`:(P.age<18?(P.inSchool?'🎒 학생':'🧹 일손'):P.major&&P.age<23?'🎓 '+P.majorName+' 전공':'무직'));
  const h=HOMES[P.home.type];
  const fam=[P.married?'💍 '+P.partner:P.rel?'💕 '+P.rel.name+' '+P.rel.aff:'',P.kids?'👶×'+P.kids:'',P.pet?'🐶':'',h.e+h.n].filter(Boolean).join(' ');
  $('#stats').innerHTML=s+`<div id="moneyBox">💰 ${usd(P.money)}<small>${jobTxt}</small></div>
    <div id="subline"><span>${P.country.f} ${P.country.n} · ${P.rural?'농촌':'도시'}${P.abroad?' → 해외':''}</span><span>${fam}</span></div>`;
  $('#ageBig').innerHTML=`${P.age}살<small>${P.birth.y+P.age}년 ${seasonOf(P.age).e}</small>`;
  renderHud();
}
function renderHud(){
  if(!P||!P.bucket)return;const b=$('#bucketBtn');if(b)b.textContent=`🎯 ${P.bucket.filter(x=>x.done).length}/3`;
  const L=Saju.luckAt(P.saju,P.age),sb=$('#sajuBtn');if(sb)sb.textContent=L?`📜 ${L.e}${L.name}`:'📜 사주';
}
function actionList(){
  const list=ACTS[stageOf(P.age).k].slice();
  if(P.age>=17&&P.age<=60&&!P.rel&&!P.married)list.unshift({e:'💘',n:'만남',f:openMeet,free:1});
  if(P.rel&&!P.married)list.unshift({e:'💑',n:'데이트',f:openDate,free:1});
  if(P.age>=19)list.push({e:'🏠',n:'집',f:openHome,free:1});
  if(P.job&&!P.retired&&P.age>=22)list.push({e:'🚪',n:'이직·퇴사',f:openQuit,free:1});
  if(P.age>=18&&!P.job&&!P.retired&&P.age<65)list.unshift({e:'🔍',n:'구직',f:jobHunt,free:1});
  if(window.Grow)Grow.extraActions(list);
  return list;
}
/* 행동 실행 (손으로 누를 때와 자동 진행이 같은 길을 씀) */
function doAct(a){
  if(modalQ.length||!P.alive)return false;
  if(!a.free){if(P.energy<=0)return false;P.energy--}
  buzz(15);Snd.sfx('tap');if(!a.free)playAnim(ACT_POSE[a.n]);a.f();renderActions();checkBucket();checkDeath();return true;
}
function renderActions(){
  const list=actionList(),rec=window.Grow?Grow.recommend(list):null;
  $('#actions').innerHTML='';
  list.forEach(a=>{const b=document.createElement('button');b.className='act'+(rec&&rec.n===a.n?' rec':'')+(a.mini?' mini':'');b.innerHTML=`<span class="e">${a.e}</span>${a.n}`;
    b.disabled=!P.alive||(!a.free&&P.energy<=0);
    b.onclick=()=>{if(window.Grow)Grow.userTouched();doAct(a)};
    $('#actions').appendChild(b)});
  $('#energy').innerHTML='행동력<br>'+('⚡'.repeat(P.energy)||'—');
  $('#ageBtn').classList.toggle('nudge',P.alive&&P.energy<=0&&!modalQ.length);
}

/* ================= 모달 ================= */
let modalQ=[];
function showModal(ev){modalQ.push(ev);if(modalQ.length===1)openNext()}
function openNext(){
  const ev=modalQ[0];if(!ev){$('#modal').classList.remove('on');return}
  const d=ev.dyn?ev.dyn(P):ev.d;
  $('#sheet').innerHTML=`<div class="em">${ev.e}</div><h3>${ev.t}</h3>${ev.html?ev.html(P):`<p>${d||''}</p>`}`;
  $('#sheet').classList.toggle('grid',!!ev.grid);const gw=document.createElement('div');gw.className='chs';$('#sheet').appendChild(gw);
  ev.ch.forEach((c,ci)=>{const b=document.createElement('button');b.className='choice';b.style.animationDelay=(ci*45)+'ms';b.innerHTML=c.t+(c.s?`<small>${c.s}</small>`:'');
    b.onclick=()=>{buzz(20);Snd.sfx('tap');modalQ.shift();const fxk=EV_FX[ev.id];if(fxk)playAnim(Array.isArray(fxk)?(fxk[ci]||fxk[0]):fxk);lastLog='';c.f();
      if(ev.id&&KEY_EV.has(ev.id))P.moments.push({a:P.age,e:ev.e,t:ev.t,c:c.t.replace(/<[^>]+>/g,''),r:lastLog});
      renderActions();checkBucket();if(checkDeath())return;openNext()};
    gw.appendChild(b)});
  if(window.Grow)Grow.decorateModal(ev,gw);
  $('#modal').classList.add('on');
}

/* ================= 직업 ================= */
function jobHunt(){
  const pool=JOBS.filter(j=>j.req(P)).sort(()=>Math.random()-.5).slice(0,3);
  showModal({e:'🔍',t:'일자리 찾기',d:'지원 가능한 일자리',ch:[
    ...pool.map(j=>({t:`${j.e} ${j.n}`,s:j.pay>0?`연 수입 약 ${usd(M(j.pay))}`:'수입 불안정 (대박 or 쪽박)',f:()=>{
      if(Math.random()>(j.pay>80000?.55:.85)){log(j.n+' 불합격…','bad');fx({hap:-4});playAnim('sad');return}
      P.job=j;P.jobYears=0;P.rank=0;P.rankYears=0;P.perf=Math.max(35,P.perf-10);P.jobPay=j.pay>0?M(j.pay):M(15000);log(`${j.e} ${j.n}(으)로 일을 시작했다!`,'good');fx({hap:8});playAnim('newjob');
      if(!P.firstJob)P.firstJob={a:P.age,n:j.n};P.moments.push({a:P.age,e:j.e,t:'새 직업',c:j.n,r:'일을 시작했다'});
      if(j.id==='doctor')badge('의사 선생님');}})),
    {t:'다음에 하자',f:()=>log('조금 더 쉬기로 했다')}]});
}
function openQuit(){
  showModal({e:'🚪',t:'이직·퇴사',d:`${P.job.e} ${P.job.n} · ${rankName()} · 성과 ${P.perf}`,ch:[
    {t:'🔍 다른 회사로 이직',s:'직급은 처음부터, 대신 새 출발',f:()=>{const old=P.job;P.job=null;log(`${old.n} 퇴사 → 이직 준비`);setTimeout(jobHunt,60)}},
    {t:'🏖️ 퇴사하고 쉰다',f:()=>{log(`${P.job.n} 퇴사!`);P.job=null;fx({hap:6});say('자유다!')}},
    {t:'계속 다닌다',f:()=>{}}]});
}

/* ================= 한 해 진행 ================= */
function ageUp(){
  if(!P.alive||modalQ.length||P.pendingAd)return;
  buzz(25);
  P.age++;P.energy=P.age<4||P.age>=60?2:3;
  const kidEv=yearlyKids();
  yearHeader();Snd.sfx('age');
  const stageChanged=stageOf(P.age).k!==stageOf(P.age-1).k;
  if(stageChanged){snapAlbum();log(`📸 ${stageOf(P.age).n} 시기가 시작됐다`);Snd.mood(stageOf(P.age).k);if(window.Grow)Grow.stageReport()}
  if(window.Grow)Grow.agePop(stageChanged)
  const L0=Saju.luckAt(P.saju,P.age-1),L1=Saju.luckAt(P.saju,P.age);
  if(L1&&L0&&L1.start!==L0.start){log(`🔮 새 대운 시작 (${L1.txt}): ${L1.e} ${L1.name} — ${L1.desc}`,'good');cutin('🔮',`${L1.name}의 10년`,L1.desc);P.moments.push({a:P.age,e:'🔮',t:'대운 전환',c:L1.name,r:L1.txt})}
  const T=TIER[P.tier];
  if(P.age<=18)fx({hp:R(0,2)},1);
  P.hap=clamp(Math.round(P.hap+(55-P.hap)*0.08));P.bond=clamp(Math.round(P.bond+(50-P.bond)*0.04));
  if(P.age>=40)fx({hp:-R(1,2)},1);
  if(P.age>=65)fx({hp:-R(1,3),look:-1},1);
  if(P.inSchool&&P.age>=7&&P.age<=17){fx({smart:1},1);if(P.edu<1&&P.age>=7)P.edu=1;if(P.age>=15&&P.edu<2)P.edu=2}
  if(P.age===18){if(P.famWealth>0){const g=Math.round(P.famWealth*.05);fx({money:g},1);log('부모님이 독립 자금 '+usd(g)+'을 주셨다','good')}}
  if(P.age===35&&P.cls>=3){const g=Math.round(P.famWealth*.2);fx({money:g},1);log('🎁 집안 재산을 물려받았다: '+usd(g),'good')}
  // 수입·지출
  if(P.job){
    let pay;
    if(P.job.pay<0){const base=P.job.id==='artist'?40:P.job.id==='athlete'?(P.hp+P.sub.pe)/2:(P.look+P.hap)/2;pay=Math.max(0,M((R(-10,30)+base/2+P.fame*8+P.rank*10)*R(300,1500)*(L1&&L1.g===1?1.3:1)));
      if(Math.random()<.06){pay+=M(80000);log('🌟 작품이 대박났다!','good');P.fame+=3}}
    else pay=Math.round(M(P.job.pay)*(1+P.jobYears*.02)*(.9+P.smart/500)*payMult()*(L1&&L1.g===2?1.05:1));
    P.jobPay=pay;P.jobYears++;
    const spend=Math.round(pay*spendRate())+P.kids*M(2000);
    fx({money:pay-spend},1);log(`${P.job.e} ${P.job.n} ${rankName()} · 수입 ${usd(pay)} / 생활비 ${usd(spend)}`);
    if(P.abroad){fx({bond:-2},1)}
  }else if(P.age>=18&&P.age<=22&&P.cls>=2){log('부모님 집에서 지내며 진로를 고민한다')}
  else if(P.age>=18&&!P.retired){const c=M(6000)+P.kids*M(1500);fx({money:-c,hap:-2},1);log('수입 없이 생활비만 나간다 (-'+usd(c)+')','bad')}
  yearlyHome();
  if(P.age===65&&P.job){P.retired=true;P.job=null;log('🎉 은퇴!','good');fx({hap:6});badge('은퇴')}
  if(P.age>=65){const pen=P.tier===1?M(15000):P.tier===2?M(5000):0;if(pen)fx({money:pen},1);if(P.kids&&P.tier===3)fx({money:M(1500)},1)}
  if(P.money<-M(8000)){fx({hap:-6},1);log('빚 독촉에 시달린다','bad');P.marks.add('debt')}
  if(P.money>M(1e6))badge('백만장자');
  if(P.cls<=1&&P.money>M(200000))P.marks.add('selfmade');
  if(P.age===100)badge('100세 인생');
  P.lifeHap+=P.hap;P.trace.push({a:P.age,h:P.hap,m:P.money});
  renderStats();
  if(checkDeath())return;
  if((P.age===12||P.age===18)&&P.inSchool){const t=topSubjects();log(`📋 성적표: ${t.map(x=>`${x.e}${x.n} ${P.sub[x.k]}`).join(' · ')}`,'good');say(`${t[0].n}가 제일 자신 있어!`)}
  const pool=EVENTS.filter(e=>e.c(P)&&!(e.once&&P.seen.has(e.id)));
  const must=pool.filter(e=>e.once&&['firstword','doljabi','school7','school14','college','army','letter','grand'].includes(e.id));
  const sys=(P.age===16&&!P.ideal)?idealEvent():(mateEvent()||yearlyCareer()||yearlyRomance()||kidEv);
  const ev=must[0]||sys||(Math.random()<.55&&pool.length?pick(pool.filter(e=>!(e.id==='malaria'&&Math.random()<.6))):null);
  if(ev){if(ev.id)P.seen.add(ev.id);showModal(ev)}
  else log(pick(['평범한 한 해가 지나갔다','별일 없이 지나갔다','시간이 쏜살같다','조용하지만 소중한 한 해']));
  checkBucket();
  if(P.age===18&&!P.job)log('💡 이제 [구직]·[만남]·[집] 버튼이 열렸어요');
  renderActions();
}

function checkDeath(){
  if(!P.alive||P.pendingAd)return true;
  if(P.skipDeath){P.skipDeath=false;return false}
  let reason=null;const L=TIER[P.tier].life;
  if(P.hp<=0)reason='건강 악화';
  else if(P.age>=62+L*1.2){const ch=(P.age-(62+L*1.2))*.006+(P.hp<30?.06:0)+(P.age>90?.1:0);if(Math.random()<ch)reason=pick(['노환','자연사','잠결에 평안히'])}
  else if(P.age>=5&&Math.random()<(P.tier===3?.003:.0012))reason=pick(['교통사고','불의의 사고']);
  if(!reason)return false;
  if(!P.revived&&(karma>=40||Ads.canReward())&&P.age<80){
    modalQ=[{e:'✨',t:'운명의 갈림길',d:`${P.age}세, ${reason}(으)로 생명이 위태롭다…`,ch:[
      ...(Ads.canReward()?[{t:'📺 광고 보고 기적 (무료)',s:'광고를 끝까지 보면 회복',f:()=>{P.pendingAd=reason;$('#modal').classList.remove('on');Ads.showReward(ok=>{const r=P.pendingAd;P.pendingAd=null;if(ok){P.revived=true;P.skipDeath=true;P.hp=Math.max(P.hp,35);log('✨ 기적처럼 회복했다!','good');playAnim('jump');renderStats();renderActions()}else die(r)})}}]:[]),
      ...(karma>=40?[{t:'🌟 기적을 빈다 (카르마 40)',s:'1생에 1회',f:()=>{karma-=40;saveMeta();P.revived=true;P.skipDeath=true;P.hp=Math.max(P.hp,35);log('✨ 기적처럼 회복했다!','good');renderStats()}}]:[]),
      {t:'운명을 받아들인다',f:()=>die(reason)}]}];
    openNext();return true;
  }
  die(reason);return true;
}

/* ================= 엔딩 ================= */
function lifeTitle(avg){
  const m=P.marks,cn=P.country.n;
  const role=P.kids?(P.male?'아버지':'어머니'):(P.job?P.job.n:(P.male?'남자':'여자'));
  const lead=
    m.has('lotto')?'복권 한 장으로 인생이 뒤집힌':
    m.has('debt')&&m.has('kidschool')?'빚더미 속에서도 아이를 끝까지 지켜낸':
    m.has('selfmade')?'맨손으로 부를 일군':
    m.has('kidschool')?'아이를 끝까지 학교에 보낸':
    m.has('migrant')&&P.kids?'고향을 떠나 가족을 먹여 살린':
    m.has('dropout')?'일찍 철이 들어 학교 대신 일터로 간':
    m.has('divorce')?'이혼의 아픔을 딛고 일어선':
    m.has('loss')?'사랑하는 이를 먼저 보내고도 버텨낸':
    m.has('debt')?'빚과 끝까지 싸운':
    m.has('sick')?'병마와 싸우며 하루하루를 버틴':
    P.age<30?'너무 일찍 저문 별 같은':
    avg>=72?'매일을 웃으며 살았던':
    P.age>=95?'한 세기를 살아낸':'평범하지만 따뜻했던';
  return `${lead} ${cn}의 ${role}`;
}
function die(reason){
  P.alive=false;P.deathReason=reason;modalQ=[];$('#modal').classList.remove('on');
  P.moments.push({a:P.age,e:'🕊️',t:'마지막 순간',c:reason,r:''});
  log(`🕊️ ${P.age}세, ${reason}(으)로 세상을 떠났다`,'bad');buzz([80,60,200]);Snd.sfx('death');renderActions();
  const avg=Math.round(P.lifeHap/Math.max(1,P.age));
  const wealthPts=Math.min(30,Math.log10(Math.max(1,P.peak/P.mult))*5);
  const bk=P.bucket.filter(x=>x.done).length,fr=fateReport();
  let score=Math.round(clamp(avg*.8+Math.min(P.age,100)*.45+wealthPts+P.badges.size*2+P.bond*.15+(P.marks.has('letter')?5:0)+bk*8,0,150));
  const grade=score>=115?'S':score>=95?'A':score>=78?'B':score>=60?'C':'D';
  const title=lifeTitle(avg);
  const epi=pick(['"그래도 꽤 괜찮은 인생이었다."','"한 번 더 산다면, 덜 걱정하고 더 사랑할 거야."','"다음 생엔 어디서 태어날까."','"후회는 없다. 아니, 조금 있다."','"인생, 생각보다 짧더라."']);
  const gain=Math.max(5,Math.round(score/8));karma+=gain;
  hist.unshift({f:P.country.f,name:P.name,age:P.age,grade,title});saveMeta();
  hist[0].years=P.age;hist[0].c=P.country.n;hist[0].bk=bk;saveMeta();
  snapAlbum(true);
  const st=lifeStory(avg);
  const moments=pickMoments();
  const summary=[`🌏 프로젝트 80억 — 인생 경험 요약`,``,`${P.country.f} ${P.country.n} · ${P.rural?'농촌':'도시'} · ${P.clsInfo.n}의 ${P.male?'아들':'딸'} ${P.name} (향년 ${P.age}세)`,`「${title}」  등급 ${grade} · ${score}점`,P.saju?`🔮 사주 ${P.saju.pillarTxt.join(' ')} · ${P.saju.dm.nm} 일간`:'',``,`🎯 버킷리스트 ${bk}/3`,...P.bucket.map(x=>`${x.done?'✅':'⬜'} ${x.e} ${x.t}`),``,...(fr?[`📜 사주 vs 실제: ${fr.pred} → ${fr.real} (${fr.verdict})`,``]:[]),...(P.mate?[mateLine(),``]:[]),
    ...st.paras,``,`⭐ 결정적 순간`,...moments.map(m=>`· ${m.a}살 ${m.e} ${m.t} → ${m.c}${m.r?' ('+m.r+')':''}`),``,`💡 이 인생이 남긴 것`,...st.lessons.map(l=>'· '+l),``,`💌 ${st.closing}`,``,[...P.badges].map(b=>'#'+b.replace(/\s/g,'')).join(' ')].join('\n');
  setTimeout(()=>Ads.maybeInterstitial(()=>{
    $('#end').innerHTML=`
      <canvas id="portrait"></canvas>
      <h2>${P.name}</h2>
      <div style="color:var(--dim);font-size:14px">${P.country.f} ${P.country.n} · ${P.rural?'농촌':'도시'} · ${P.clsInfo.e} ${P.clsInfo.n} · 향년 ${P.age}세</div>
      <div id="grade" style="color:${{S:'#ffcc4d',A:'#5be08f',B:'#5ec8ff',C:'#c58bff',D:'#ff6b81'}[grade]}">${grade}</div>
      <div id="lifeTitle">「${title}」</div>
      <div id="epitaph">${epi}</div>
      ${P.mate?`<div class="box" style="text-align:center;font-size:15px">${mateLine()}</div>`:''}
      <div class="box"><div class="jua sec">📸 쇼츠용 인생 카드</div><img id="cardImg" alt="인생 카드">
        <div class="row2"><button class="ghost" id="cardSave" style="flex:1;margin:0">💾 저장</button><button class="ghost" id="cardShare" style="flex:1;margin:0">📤 공유</button></div></div>

      <div class="box"><div class="jua sec">📸 인생 앨범</div>
        <div id="album">${P.album.map((s,i)=>`<div class="ph"><canvas data-i="${i}"></canvas><span>${s.a}살 · ${s.label}</span><small>${s.cap}</small></div>`).join('')}</div></div>

      <div class="box"><div class="jua sec">📈 인생 그래프</div><canvas id="graph"></canvas>
        <div class="legend"><span><i style="background:var(--hap)"></i>행복</span><span><i style="background:var(--money)"></i>자산</span><span>이모지 = 결정적 순간</span></div></div>

      <div class="box bucket"><b>🎯 버킷리스트 ${bk}/3</b>${P.bucket.map(x=>`<div class="${x.done?'done':''}">${x.done?'✅':'⬜'} ${x.e} ${x.t}${x.done?` <em>${x.age}살 달성</em>`:''}</div>`).join('')}</div>
      ${fr?`<div class="box"><div class="jua sec">📜 사주 vs 실제 인생</div>${Saju.summaryHTML(P.saju)}
        <div class="fate"><div><span>사주가 말한 운명</span><b>${Saju.GRPE[P.saju.dom]} ${fr.pred}</b><small>${P.saju.dm.key}</small></div>
        <div><span>실제로 산 인생</span><b>${fr.real}</b></div><div class="verdict ${fr.ok?'ok':''}">${fr.verdict}</div>
        <p class="sjnote">부족한 기운 ${SAJU.EK[P.saju.weak]}을 채우는 개운법: ${P.saju.dm.개운}</p></div></div>`:''}
      <div class="box story"><div class="jua sec">📝 인생 경험 요약</div>${st.paras.map(p=>`<p>${p}</p>`).join('')}</div>

      <div class="box"><div class="jua sec">⭐ 결정적 순간</div>
        <div class="tl">${moments.map(m=>`<div class="tli"><div class="tla">${m.a}살</div><div class="tle">${m.e}</div><div><b>${m.t}</b><br><span>→ ${m.c}</span>${m.r?`<br><em>${m.r}</em>`:''}</div></div>`).join('')||'<div style="color:var(--dim)">조용히 흘러간 인생이었다</div>'}</div></div>

      <div class="box"><div class="jua sec">💡 이 인생이 남긴 것</div>${st.lessons.map(l=>`<div class="lesson">“${l}”</div>`).join('')}</div>

      <div class="box closing">💌 ${st.closing}</div>

      <div class="box">
        <div class="row"><span>인생 점수</span><b>${score}점</b></div>
        <div class="row"><span>평균 행복도</span><b>${avg}</b></div>
        <div class="row"><span>가장 행복했던 때</span><b>${st.best.a}살 (${st.best.h})</b></div>
        <div class="row"><span>가장 힘들었던 때</span><b>${st.worst.a}살 (${st.worst.h})</b></div>
        <div class="row"><span>최고 자산</span><b>${usd(P.peak)} (${P.peakAge}살)</b></div>
        <div class="row"><span>학력</span><b>${['학교 못 다님','초등','중등','대학'][P.edu]}</b></div>
        <div class="row"><span>가족</span><b>${P.married?'배우자 '+P.partner:P.divorced?'이혼':P.widowed?'사별':'미혼'}${P.kids?' · 자녀 '+P.kids+'명':''}</b></div>
        <div class="row" style="border:0"><span>사인</span><b>${reason}</b></div>
      </div>
      <div class="badges">${[...P.badges].map(b=>`<span class="badge">🏅 ${b}</span>`).join('')||'<span class="badge">업적 없음</span>'}</div>
      <div id="karmaGain">✨ 카르마 +${gain} (보유 ${karma})</div>
      <button class="adbtn" id="adKarmaBtn2" style="display:none"></button>
      <button class="bigbtn" id="againBtn" style="margin:8px 0">🎲 다른 인생 체험하기</button>
      <div style="display:flex;gap:8px"><button class="ghost" id="copyBtn">📤 인생 요약 공유하기</button><button class="ghost" id="homeBtn">처음으로</button></div>
      <div id="webAdEnd" class="webad"></div>
      <div style="height:24px"></div>`;
    $('#againBtn').onclick=startRoll;
    $('#homeBtn').onclick=()=>{renderTitle();show('title')};
    $('#copyBtn').onclick=async()=>{try{const r=await Native.share(summary);if(r==='copied')$('#copyBtn').textContent='✅ 복사됨'}catch(e){}};
    show('end');$('#end').scrollTop=0;drawGraph();
    $('#cardSave').onclick=()=>shareCard('save');$('#cardShare').onclick=()=>shareCard('share');
    const last=P.album[P.album.length-1];
    drawSnapTo($('#portrait'),last,true);
    document.querySelectorAll('#album canvas').forEach(c=>drawSnapTo(c,P.album[+c.dataset.i]));
    renderLifeCard({grade,title,score,fr});
  }),1400);
}

/* ================= 앨범 · 결정적 순간 · 인생 경험 요약 ================= */
const ACT_POSE={'옹알이':'jump','알바':'work','울기':'cry','놀기':'jump','잠자기':'sleep','그림책':'read','뛰어놀기':'jump','집안일':'sweep','노래':'sing','공부':'read',
  '운동':'exercise','꾸미기':'mirror','일하기':'work','가족시간':'hug','자기계발':'read','여행':'travel','친구들':'cheer','추가근무':'work',
  '검진':'hospital','투자':'phone','산책':'walk','병원':'hospital','자식 연락':'phone','나눔':'give','회고록':'read','구직':'look'};
const EV_FX={firstword:'cheer',doljabi:'cheer',water:['carry','carry','sad'],school7:['school','sweep'],school14:['work',null,'phone'],kinder:['hug','jump'],
  test:['read','jump'],crush:[null,'sad'],college:[null,'work'],army:'walk',malaria:['travel','sick'],drought:['sad','travel'],migrate:['travel','hug'],
  love:[null,'work'],marry:['wedding','look'],baby:['babyborn','idle'],letter:'letter',kidfee:['read','sad'],biz:[null,'idle'],quarrel:['hug','sad'],
  loss:'cry',lotto:[null,'walk'],job_loss:['cry','walk'],sick:['hospital','sick'],pet:['hug','give'],viral:'selfie',scam:['sad','phone'],grand:'babyborn',epidemic:['hospital','sick']};
const KEY_EV=new Set(['water','school7','school14','college','army','malaria','drought','migrate','marry','baby','letter','kidfee','biz','quarrel','loss','lotto','job_loss','sick','grand','crush','pet']);
const CAPS={baby:'세상에 나온 날',kid:'세상이 놀이터',elem:'배우고 자라던 시절',teen:'흔들리며 크던 때',young:'꿈과 현실 사이',adult:'책임의 무게',old:'노을 진 시간'};
function snapAlbum(final){
  const st=stageOf(P.age);
  P.album.push({a:P.age,label:final?'마지막 모습':st.n,cap:final?(P.deathReason||''):CAPS[st.k],hap:P.hap,hp:P.hp,outfit:outfitOf(P),
    glasses:P.smart>65&&P.age>=35,dead:!!final,scene:sceneKey(),pose:final?'idle':(P.hap>70?'cheer':P.hap<30?'cry':'idle')});
}
function pickMoments(){
  const arr=P.moments.slice();const seen={};
  return arr.filter(m=>{const k=m.t;seen[k]=(seen[k]||0)+1;return seen[k]<=(k==='새 생명'?3:1)}).slice(0,9);
}
function lifeStory(avg){
  const c=P.country,m=P.marks,tr=P.trace.length?P.trace:[{a:0,h:P.hap,m:0}];
  const best=tr.reduce((a,b)=>b.h>a.h?b:a,tr[0]),worst=tr.reduce((a,b)=>b.h<a.h?b:a,tr[0]);
  const paras=[];
  paras.push(`🌱 ${c.f} ${c.n}${P.rural?'의 작은 농촌 마을':'의 도시'}, ${P.clsInfo.n} 가정에서 ${P.male?'아들':'딸'} ${P.name}이(가) 태어났다. 80억 명 중 이곳에 태어날 확률은 ${c.w}%. `+
    (P.cls===0?'먹고사는 것부터가 숙제인 출발이었다.':P.cls>=3?'남들보다 한참 앞선 출발선이었다.':'특별할 것 없는, 그래서 가장 흔한 출발이었다.'));
  let g=m.has('noschool')?'학교 대신 밭과 부엌이 배움터였다. 글자보다 일을 먼저 배웠다.':
    m.has('dropout')?'14살, 학비 앞에서 책가방을 내려놓고 일찍 어른이 되었다.':
    P.badges.has('장학생')?'가난 속에서도 장학금 시험을 붙잡아 배움의 끈을 놓지 않았다.':
    P.edu>=3?'대학까지 마치며 더 넓은 세상의 문을 열었다.':'학교를 다니며 평범한 사춘기를 지나 어른이 되었다.';
  if(m.has('grit'))g+=' 새벽 4시의 물동이가 몸과 마음을 단단하게 만들었다.';
  if(P.age<14)g='배움과 꿈을 펼치기도 전에, 너무 이른 작별이 찾아왔다.';
  if(P.age>=6){const fav=P.playCount?Object.entries(P.playCount).sort((a,b)=>b[1]-a[1])[0]:null;const pl=fav?PLAYS.find(x=>x.id===fav[0]):null;
    const ts=topSubjects(2),hb=Object.entries(P.hlv).sort((a,b)=>b[1]-a[1])[0];
    g+=(pl?` 어린 시절엔 ${pl.e}${pl.n}을(를) 제일 좋아했고,`:'')+` 가장 자신 있던 과목은 ${ts.map(x=>x.e+x.n).join('·')}였다.`+(P.majorName?` 대학에서는 ${P.majorName}을(를) 전공했다.`:'')+(hb&&hb[1]>=2?` 취미 ${hb[0]}은(는) Lv${hb[1]}까지 올렸다.`:'');}
  paras.push('🎒 '+g);
  if(P.age>=18){
    let w=P.firstJob?`${P.firstJob.a}살에 ${P.firstJob.n}(으)로 첫 일을 시작했다. `:'안정된 일자리를 끝내 잡지 못했다. ';
    if(m.has('migrant'))w+='가족을 위해 고향을 떠나 낯선 곳에서 땀을 흘렸다. ';
    if(P.badges.has('사업 성공'))w+='작은 가게로 시작한 사업이 크게 일어섰다. ';
    if(m.has('debt'))w+='한때 빚에 짓눌려 잠 못 드는 밤이 이어졌다. ';
    if(m.has('lotto'))w+='복권 한 장이 모든 것을 뒤집어 놓기도 했다. ';
    w+=P.peak>0?`가장 넉넉했던 때는 ${P.peakAge}살, 자산은 ${usd(P.peak)}였다.`:'평생 넉넉했던 적은 없었다.';
    if(P.bestRank)w+=` 가장 높이 오른 자리는 ${P.bestRank}.`;
    if(P.home&&P.home.type!=='parents')w+=` 마지막 보금자리는 ${HOMES[P.home.type].e}${HOMES[P.home.type].n}이었다.`;
    paras.push('💼 '+w);
    let f=P.spouseName?`${P.spouseName}을(를) 만나 가정을 꾸렸다. `:'평생 혼자만의 길을 걸었다. ';
    if(P.kids)f+=`${P.kids}명의 아이를 키웠다. `;
    if(m.has('letter'))f+='아이가 건넨 삐뚤빼뚤한 손편지는 평생 지갑 속 보물이었다. ';
    if(m.has('kidschool'))f+='빚을 내서라도 아이만큼은 끝까지 학교에 보냈다. ';
    if(m.has('divorce'))f+='사랑이 끝나는 아픔도 겪었다. ';
    if(m.has('loss'))f+='사랑하는 사람을 먼저 떠나보내야 했다. ';
    if(P.badges.has('조부모'))f+='손주의 작은 손을 잡아보는 기쁨까지 누렸다.';
    if(P.exes.length)f+=` 그 전에 ${P.exes.length}번의 이별도 있었다.`;
    if(P.kidsList.length)f+=` 아이들의 이름은 ${P.kidsList.map(k=>k.name).join(', ')}.`;
    paras.push('👪 '+f.trim());
  }
  paras.push(`🕊️ 그리고 ${P.age}살, ${P.deathReason}(으)로 눈을 감았다. 가장 행복했던 때는 ${best.a}살 무렵, 가장 힘들었던 때는 ${worst.a}살 무렵이었다.`);
  const L=[];
  if(P.cls<=1&&P.tier===3)L.push('태어난 곳은 고를 수 없었지만, 그 안에서의 선택은 온전히 내 몫이었다.');
  if(P.cls>=3)L.push('앞선 출발선은 행운이었다. 그 행운을 무엇에 썼는지가 인생을 말해준다.');
  if(m.has('dropout')||m.has('noschool'))L.push('배울 기회는 누구에게나 당연한 것이 아니었다.');
  if(m.has('kidschool'))L.push('내가 누리지 못한 것을 다음 세대에 건네는 것, 그것이 가장 큰 유산이었다.');
  if(m.has('migrant'))L.push('멀리 있어도 가족을 향한 마음은 매달 보내는 송금에 담겨 있었다.');
  if(m.has('debt'))L.push('실패는 끝이 아니라, 다음 선택의 무게를 알려주는 수업이었다.');
  if(m.has('sick'))L.push('건강은 잃고 나서야 그 값을 알게 된다.');
  if(m.has('selfmade'))L.push('출발선이 결승선을 정하지는 않는다.');
  if(m.has('loss')||m.has('divorce'))L.push('함께한 시간은 끝나도, 그 시간이 만든 나는 남는다.');
  if(m.has('letter'))L.push('가장 값진 선물은 종이 한 장에 꾹꾹 눌러 쓴 마음이었다.');
  if(P.bond>=70)L.push('돈보다 오래 남는 것은 함께 웃은 시간이었다.');
  if(P.peak/P.mult>300000&&P.bond<40)L.push('많이 가졌지만, 곁에 남은 사람은 많지 않았다.');
  if(avg>=70)L.push('행복은 큰 사건보다 매일의 작은 순간에 있었다.');
  if(P.age<30)L.push('내일이 당연히 온다고 믿었던 날들이 가장 소중했다.');
  if(L.length<3)L.push('평범한 하루하루가 모여 하나뿐인 인생이 되었다.');
  const closing=`당신은 방금 80억 명 중 한 사람, ${c.n}의 ${P.name}(으)로 ${P.age}년을 살았습니다. 지금 이 순간에도 ${c.n}에서는 약 ${Math.round(c.w/100*8e9/1e4).toLocaleString()}만 명이 저마다의 인생을 살고 있습니다. 오늘 스쳐 지나가는 누군가의 삶도, 이만큼 무겁고 소중할지 모릅니다.`;
  return {paras,lessons:L.slice(0,4),closing,best,worst};
}
function drawGraph(){
  const c=$('#graph'),r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);c.width=r.width*d;c.height=r.height*d;
  const g=c.getContext('2d');g.scale(d,d);const w=r.width,h=r.height,pl=26,pb=18,pt=8;
  const tr=P.trace.length?P.trace:[{a:0,h:P.hap,m:0}];const maxA=Math.max(10,tr[tr.length-1].a);
  const ms=tr.map(x=>x.m),mmax=Math.max(1,...ms),mmin=Math.min(0,...ms);
  const X=a=>pl+(w-pl-6)*a/maxA,YH=v=>pt+(h-pt-pb)*(1-v/100),YM=v=>pt+(h-pt-pb)*(1-(v-mmin)/(mmax-mmin||1));
  g.strokeStyle='#ffffff18';g.fillStyle='#b9addb';g.font='10px sans-serif';
  for(let v=0;v<=100;v+=50){g.beginPath();g.moveTo(pl,YH(v));g.lineTo(w,YH(v));g.stroke();g.fillText(v,2,YH(v)+3)}
  for(let a=0;a<=maxA;a+=Math.ceil(maxA/50)*10){g.fillText(a+'세',X(a)-8,h-4)}
  if(mmin<0){g.strokeStyle='#5be08f44';g.setLineDash([3,3]);g.beginPath();g.moveTo(pl,YM(0));g.lineTo(w,YM(0));g.stroke();g.setLineDash([])}
  const line=(f,col)=>{g.strokeStyle=col;g.lineWidth=2.2;g.beginPath();tr.forEach((p,i)=>i?g.lineTo(X(p.a),f(p)):g.moveTo(X(p.a),f(p)));g.stroke()};
  // 행복 영역
  g.fillStyle='#ffcc4d22';g.beginPath();g.moveTo(X(tr[0].a),YH(0));tr.forEach(p=>g.lineTo(X(p.a),YH(p.h)));g.lineTo(X(tr[tr.length-1].a),YH(0));g.fill();
  line(p=>YM(p.m),'#5be08f');line(p=>YH(p.h),'#ffcc4d');
  g.textAlign='center';g.font='13px serif';
  pickMoments().forEach((mo,i)=>{const p=tr.find(x=>x.a===mo.a)||tr[tr.length-1];const y=YH(p.h)-8-(i%2)*12;g.fillText(mo.e,X(mo.a),Math.max(12,y))});
}

/* ================= 화면 ================= */
const MOOD_OF={title:'title',setup:'title',roll:'roll',end:'ending'};
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
  Ads.banner(id!=='game');refreshAdUI();
  if(window.WebAds&&!Store.has('noads')){if(id==='title')WebAds.banner('webAdTitle');if(id==='end')setTimeout(()=>WebAds.banner('webAdEnd'),1600)}
  Snd.mood(id==='game'&&P?stageOf(P.age).k:(MOOD_OF[id]||'title'));
  const sb=$('#sndbar');if(id==='game'){$('#stageWrap').appendChild(sb);sb.classList.add('ingame')}else{$('#app').appendChild(sb);sb.classList.remove('ingame')}
}
function renderTitle(){
  const yrs=hist.reduce((t,x)=>t+(x.years||x.age||0),0),cs=new Set(hist.map(x=>x.c||x.f)).size;
  $('#karmaTag').innerHTML=(hist.length?`🧬 지금까지 <b>${hist.length}</b>개의 인생 · 총 <b>${yrs}</b>년 · <b>${cs}</b>개국을 살아봤어요<br>`:'')+`✨ 카르마 ${karma}  ·  다시 태어나기 15 / 기적 40`;
  $('#history').innerHTML=hist.length?'<div class="jua" style="color:var(--ink)">📜 지난 생애들</div>'+hist.map(x=>`<div>${x.grade} · ${x.f} ${x.name} (${x.age}세) — ${x.title}${x.bk!=null?` · 🎯${x.bk}/3`:''}</div>`).join(''):'';
}

/* ---------- 시작 설정 화면 ---------- */
const SIJIN=[['23:30','자시 (23:30~01:29)'],['01:30','축시 (01:30~03:29)'],['03:30','인시 (03:30~05:29)'],['05:30','묘시 (05:30~07:29)'],['07:30','진시 (07:30~09:29)'],['09:30','사시 (09:30~11:29)'],['11:30','오시 (11:30~13:29)'],['13:30','미시 (13:30~15:29)'],['15:30','신시 (15:30~17:29)'],['17:30','유시 (17:30~19:29)'],['19:30','술시 (19:30~21:29)'],['21:30','해시 (21:30~23:29)']];
let setupOpt=null,lastOpt={};
function initSetup(){
  $('#fTime').innerHTML='<option value="">모름</option>'+SIJIN.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');
  $('#fCountry').innerHTML='<option value="">🎲 랜덤 (세계 인구 비율)</option>'+COUNTRIES.map(c=>`<option value="${c.n}">${c.f} ${c.n} (${c.w}%)</option>`).join('');
  document.querySelectorAll('#fSex button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#fSex button').forEach(x=>x.classList.toggle('on',x===b));Snd.sfx('tap')});
  const me=store.get('p8b_me',null);
  if(me){$('#fDate').value=me.date||'';$('#fCal').value=me.cal||'s';$('#fTime').value=me.time||'';$('#fCountry').value=me.country||'';$('#fName').value=me.name||'';
    document.querySelectorAll('#fSex button').forEach(x=>x.classList.toggle('on',x.dataset.v===(me.sex||'r')))}
  $('#autoBtn').onclick=()=>{Snd.sfx('tap');setupOpt={};startRoll()};
  $('#fillRandom').onclick=()=>{Snd.sfx('pop');const b=Saju.randomBirth();
    $('#fDate').value=`${b.y}-${String(b.m).padStart(2,'0')}-${String(b.d).padStart(2,'0')}`;$('#fCal').value='s';
    $('#fTime').value=Math.random()<.25?'':pick(SIJIN)[0];$('#fCountry').value=Math.random()<.4?'':pick(COUNTRIES).n;
    const sx=pick(['r','m','f']);document.querySelectorAll('#fSex button').forEach(x=>x.classList.toggle('on',x.dataset.v===sx));$('#fName').value=''};
  $('#customBtn').onclick=()=>{
    const v=$('#fDate').value;$('#fErr').textContent='';
    if(!v){$('#fErr').textContent='생년월일을 입력해 주세요 (또는 🎲 자동 채우기)';Snd.sfx('bad');return}
    const [y,m,d]=v.split('-').map(Number),t=$('#fTime').value,sx=document.querySelector('#fSex .on').dataset.v;
    const birth={cal:$('#fCal').value,y,m,d,hh:t?+t.split(':')[0]:12,mm:t?+t.split(':')[1]:0,unk:!t};
    if(Saju.ok()&&!Saju.analyze(birth,true)){$('#fErr').textContent='존재하지 않는 날짜예요 (음력이면 날짜를 확인해 주세요)';Snd.sfx('bad');return}
    let mate=null;const mv=$('#mDate').value,mn=$('#mName').value.trim();
    if(mv||mn){if(!mv){$('#fErr').textContent='궁합 모드: 상대 생년월일을 입력해 주세요';Snd.sfx('bad');return}
      const [my,mm2,md]=mv.split('-').map(Number),msx=document.querySelector('#mSex .on').dataset.v;
      mate={name:mn||'운명의 상대',male:msx==='m',birth:{cal:$('#mCal').value,y:my,m:mm2,d:md,hh:12,mm:0,unk:true},date:mv,cal:$('#mCal').value,sex:msx}}
    if($('#fRemember').checked)store.set('p8b_me',{date:v,cal:birth.cal,time:t,country:$('#fCountry').value,sex:sx,name:$('#fName').value.trim(),mate:mate?{name:mate.name,date:mate.date,cal:mate.cal,sex:mate.sex}:null});
    const fate=Store.has('fate');
    setupOpt={birth,male:sx==='r'?null:sx==='m',country:$('#fCountry').value||null,name:$('#fName').value.trim()||null,mate,
      cls:fate&&$('#fCls').value!==''?+$('#fCls').value:null,talent:fate&&$('#fTal').value!==''?+$('#fTal').value:null};
    Snd.sfx('reveal');startRoll();
  };
  $('#setupBack').onclick=()=>{renderTitle();show('title')};
}
function startRoll(){
  newLife(setupOpt||{});show('roll');buzz(30);
  const c=P.country,b=P.birth;
  const items=[
    ['국가',`${c.f} ${c.n}`,`세계 인구의 ${c.w}% · ${TIER[c.t].n}`],
    ['지역',P.rural?'🌾 농촌':'🏙️ 도시',''],
    ['가정형편',`${P.clsInfo.e} ${P.clsInfo.n}`,P.famWealth?`가계 자산 약 ${usd(P.famWealth)}`:'가계 자산 거의 없음'],
    ['성별·이름',`${P.male?'👦':'👧'} ${P.name}`,''],
    ['생년월일',`${b.y}.${b.m}.${b.d}${b.cal!=='s'?' (음)':''}`,`${b.unk?'시간 모름':String(b.hh).padStart(2,'0')+':'+String(b.mm).padStart(2,'0')}${P.saju?' · '+P.saju.ddi+'띠':''}${P.custom?' · 직접 입력':''}`],
    ['타고난 재능',`${P.tal.e} ${P.tal.n}`,''],
  ];
  const pools=[COUNTRIES.map(x=>x.f+' '+x.n),['🌾 농촌','🏙️ 도시'],CLASSES.map(x=>x.e+' '+x.n),['👦 ???','👧 ???'],['19??.?.?'],TALENTS.map(t=>t.e+' '+t.n)];
  $('#slots').innerHTML=items.map(([a])=>`<div class="slot"><span>${a}</span><b>?</b></div>`).join('');
  $('#sajuBox').className='';$('#bucketBox').className='';$('#compatBox').className='';
  $('#compatBox').innerHTML=P.mate&&P.mate.saju?`<div class="jua" style="margin-top:12px">💞 ${P.mate.name}와(과)의 사주 궁합</div>${Saju.compatHTML(P.name,P.saju,P.mate.name,P.mate.saju)}<p class="sjnote">게임 속 어딘가에서 ${P.mate.name}을(를) 만나게 돼요.</p>`:'';
  $('#sajuBox').innerHTML=P.saju?`<div class="jua" style="margin-top:12px">🔮 ${P.name}의 사주</div>${Saju.summaryHTML(P.saju)}`:'';
  $('#bucketBox').innerHTML=`<div class="bucket"><b>🎯 이번 생의 버킷리스트</b>${P.bucket.map(x=>`<div>${x.e} ${x.t}${x.saju?' <em>🔮 사주 추천</em>':''}</div>`).join('')}</div>`;
  const rb=$('#rollBtns');rb.style.opacity=0;rb.style.pointerEvents='none';
  $('#rerollBtn').disabled=karma<15;$('#rerollBtn').textContent=`🔄 다시 태어나기 (카르마 15 / 보유 ${karma})`;
  const lock=setupOpt&&setupOpt.birth;
  [...document.querySelectorAll('.slot')].forEach((s,i)=>setTimeout(()=>{
    s.classList.add('show');let n=0;const el=s.querySelector('b');
    const iv=setInterval(()=>{el.textContent=pick(pools[i]);Snd.sfx('tick');if(++n>(i===0?14:8)){clearInterval(iv);el.innerHTML=items[i][1]+(items[i][2]?`<em>${items[i][2]}</em>`:'');buzz(12);Snd.sfx('reveal')}},60);
  },i*560));
  const tEnd=items.length*560+500;
  setTimeout(()=>{$('#sajuBox').className='show';$('#compatBox').className='show'},tEnd);
  setTimeout(()=>{$('#bucketBox').className='show';rb.style.opacity=1;rb.style.pointerEvents='auto'},tEnd+500);
}
function beginLife(){
  show('game');$('#log').innerHTML='';modalQ=[];$('#modal').classList.remove('on');
  $('#nameTag').textContent=`${P.country.f} ${P.name}`;
  const c=P.country;
  const h=document.createElement('div');h.className='yr';h.textContent=`${P.birth.y}년 · 0살 · 탄생 ${seasonOf(0).e}`;$('#log').appendChild(h);
  log(`${c.f} ${c.n} ${P.rural?'농촌':'도시'}의 ${P.clsInfo.n} 가정에서 ${P.male?'아들':'딸'}로 태어났다.`,'good');
  log(`세계 80억 명 중 ${c.n}에서 태어날 확률은 ${c.w}%였다.`);
  if(P.saju){const a=P.saju;log(`🔮 사주 ${a.pillarTxt.join(' ')} · ${a.dm.nm} 일간 · ${a.ddi}띠`);log(`🔮 강한 운: ${Saju.GRPE[a.dom]} ${Saju.GRPN[a.dom]} — ${a.dm.key}`)}
  log(`타고난 재능: ${P.tal.e} ${P.tal.n}`);
  log(`🎯 버킷리스트: ${P.bucket.map(x=>x.e+' '+x.t).join(' / ')}`,'good');
  if(P.cls>=3)log('출발선이 남다르다','good');
  if(P.cls===0)log('먹고사는 것부터가 숙제인 출발…','bad');
  P.trace.push({a:0,h:P.hap,m:0});
  renderStats();renderActions();resize();snapAlbum();Snd.sfx('baby');
}
function showSaju(){
  if(!P||!P.saju){log('사주 정보가 없어요');return}
  showReport(P.name,P.saju,P.age,true);
}
function showBucket(){
  showModal({e:'🎯',t:'버킷리스트',html:()=>`<div class="bucket">${P.bucket.map(x=>`<div class="${x.done?'done':''}">${x.done?'✅':'⬜'} ${x.e} ${x.t}${x.done?` <em>${x.age}살 달성</em>`:''}${x.saju?' <em>🔮</em>':''}</div>`).join('')}</div><p style="margin-top:10px">하나 이룰 때마다 카르마 +10 ✨</p>`,ch:[{t:'닫기',f:()=>{}}]});
}
$('#startBtn').onclick=()=>{Snd.sfx('tap');show('setup')};
$('#liveBtn').onclick=()=>{Snd.sfx('tap');beginLife()};
$('#rerollBtn').onclick=()=>{if(karma<15)return;karma-=15;saveMeta();startRoll()};
$('#ageBtn').onclick=ageUp;
$('#sajuBtn').onclick=()=>{if(!modalQ.length){Snd.sfx('page');showSaju()}};
$('#bucketBtn').onclick=()=>{if(!modalQ.length){Snd.sfx('tap');showBucket()}};
const sndUI=()=>{$('#bgmBtn').classList.toggle('off',!Snd.on.bgm);$('#sfxBtn').classList.toggle('off',!Snd.on.sfx);$('#sfxBtn').textContent=Snd.on.sfx?'🔊':'🔇'};
$('#bgmBtn').onclick=()=>{Snd.toggle('bgm');sndUI()};$('#sfxBtn').onclick=()=>{Snd.toggle('sfx');sndUI();Snd.sfx('tap')};
sndUI();initSetup();Snd.mood('title');
renderTitle();
/* ===== 광고 UI ===== */
function refreshAdUI(){
  const ok=Ads.canReward(),txt=`📺 광고 보고 카르마 +${AD_CONFIG.rewardKarma}<small>오늘 ${Ads.rewardsLeft()}회 남음</small>`;
  ['#adKarmaBtn','#adKarmaBtn2'].forEach(id=>{const b=$(id);if(!b)return;b.style.display=ok?'inline-block':'none';b.innerHTML=txt;
    b.onclick=()=>Ads.showReward(g=>{if(!g)return;karma+=AD_CONFIG.rewardKarma;saveMeta();renderTitle();
      const kg=$('#karmaGain');if(kg)kg.textContent=`✨ 광고 보상 +${AD_CONFIG.rewardKarma} (보유 ${karma})`;buzz(30)})});
  const pb=$('#privBtn');if(pb){pb.style.display=Ads.privacyRequired?'inline':'none';pb.onclick=()=>Ads.privacyOptions()}
}
Ads.onChange(refreshAdUI);
window.addEventListener('load',()=>{Native.statusBar();Native.hideSplash();setTimeout(()=>Ads.init(),600);Ads.banner(true)});
// 인구 카운터 연출
(()=>{let n=8.0e9;setInterval(()=>{n+=R(2,6);$('#counter').textContent='세계 인구 '+Math.floor(n).toLocaleString()+'명'},400)})();

/* ================= 캔버스 ================= */
const cv=$('#scene');let cx=cv.getContext('2d');let W=0,H=0;
function resize(){const d=Math.min(2,devicePixelRatio||1);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)}
window.addEventListener('resize',resize);
/* ================= 애니메이션 & 파티클 ================= */
let ANIM={type:null,t0:0,dur:0};
const PARTS=[];
const nowS=()=>performance.now()/1000;
const POSEOF={blocks:'read',doll:'hug',jumprope:'jump',hide:'look',draw:'read',sand:'give',bike:'walk',ball:'exercise',cook:'work',origami:'read',read:'read',letter:'read',exercise:'exercise',jump:'jump',jackpot:'jump',sleep:'sleep',cry:'cry',sad:'cry',
  sweep:'sweep',work:'work',travel:'travel',cheer:'cheer',grad:'cheer',wedding:'cheer',newjob:'cheer',hug:'hug',love:'hug',
  babyborn:'hug',hospital:'bandage',phone:'phone',give:'give',walk:'walk',school:'walk',sing:'sing',mirror:'mirror',
  look:'look',carry:'carry',sick:'sick',heat:'wipe',selfie:'selfie'};
const SPAWN={blocks:['✨',4],doll:['💗',5],jumprope:['⭐',4],hide:['❓',3],draw:['🌈',3],sand:['🏰',2],bike:['💨',4],ball:['⭐',3],cook:['🍚',3],origami:['🦢',2],read:['💡',3],exercise:['💦',5],jump:['⭐',6],sleep:['💤',3,{up:25,g:-10,spread:25,life:2.2}],cry:['💧',6,{up:10,g:140}],
  sweep:['✨',6],work:['💰',4],travel:['✈️',1,{x:20,y:30,spread:400,up:0,g:0,life:2.5,size:26}],cheer:['🎉',5],hug:['💗',8],love:['💕',9],
  hospital:['➕',4],phone:['📊',3],give:['🪙',7],walk:['🍃',3],sing:['🎵',7],mirror:['✨',7],look:['❓',3],carry:['💧',3],
  sick:['🤒',2],heat:['☀️',3],selfie:['❤️',9],letter:['💌',5],babyborn:['🍼',5],grad:['🎓',4],wedding:['💐',6],
  jackpot:['💵',16],newjob:['💼',3],school:['✏️',3],sad:['💔',3]};
const CONFETTI=new Set(['grad','wedding','jackpot','newjob','babyborn']);
const SFX_OF={read:'page',letter:'love',exercise:'boing',jump:'good',jackpot:'coin',sleep:'snore',cry:'bad',sad:'bad',sweep:'pop',work:'coin',travel:'whoosh',cheer:'good',grad:'fanfare',wedding:'wedding',newjob:'fanfare',hug:'love',love:'love',babyborn:'baby',hospital:'pop',phone:'tap',give:'coin',walk:'pop',school:'pop',sing:'good',mirror:'pop',look:'tap',carry:'pop',sick:'bad',heat:'bad',selfie:'pop',blocks:'pop',doll:'love',jumprope:'boing',hide:'pop',draw:'page',sand:'pop',bike:'whoosh',ball:'boing',cook:'pop',origami:'page'};
function playAnim(type,dur){
  if(type&&SFX_OF[type])Snd.sfx(SFX_OF[type]);
  if(!type||!W)return;ANIM={type,t0:nowS(),dur:dur||2};
  const sp=SPAWN[type];if(sp)burst(sp[0],sp[1],sp[2]||{});
  if(CONFETTI.has(type))burst('confetti',40,{up:150,spread:260,life:2.6,g:120});
}
function curPose(){return ANIM.type&&nowS()-ANIM.t0<ANIM.dur?(POSEOF[ANIM.type]||'idle'):null}
function burst(ch,n,o={}){
  for(let i=0;i<n;i++)PARTS.push({x:(o.x??W*0.5)+(Math.random()-.5)*50,y:(o.y??H*0.42)+(Math.random()-.5)*20,
    vx:o.spread===400?160:(Math.random()-.5)*(o.spread??90),vy:-(o.up??70)-(o.up===0?0:Math.random()*50),g:o.g??90,
    life:o.life??1.7,age:-i*0.045,ch,sz:o.size??(14+Math.random()*8),
    c:pick(['#ff6b81','#ffcc4d','#5ec8ff','#5be08f','#c58bff','#ff8a3d']),r:Math.random()*6});
}
function stepParticles(dt){
  for(let i=PARTS.length-1;i>=0;i--){const p=PARTS[i];p.age+=dt;if(p.age<0)continue;
    if(p.age>p.life){PARTS.splice(i,1);continue}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*6;
    cx.save();cx.globalAlpha=Math.min(1,(p.life-p.age)*1.5);cx.translate(p.x,p.y);
    if(p.ch==='confetti'){cx.rotate(p.r);cx.fillStyle=p.c;cx.fillRect(-4,-2,8,4)}
    else{cx.font=p.sz+'px serif';cx.textAlign='center';cx.fillText(p.ch,0,0)}
    cx.restore()}
}

/* ================= 복장(직업·연령·계층) ================= */
function outfitOf(p){
  const o={top:p.shirt,pants:'#2f3552',hat:null,extra:[],tool:null,skirt:false,skirtC:null};
  const a=p.age,j=p.job&&p.job.id;
  if(a<=3){o.top=pick2(p,['#fff1a8','#bfe9ff','#ffd1e8']);return o}
  if(a<18){
    if(p.inSchool&&a>=7){o.top='#24346b';o.pants='#1c254d';o.extra.push('uniform','backpack');o.skirt=!p.male;o.skirtC='#3b4a7a'}
    else if(a>=7&&p.cls<=1){o.top='#a08a6a';o.pants='#5a4a3a';o.extra.push('patch');o.skirt=!p.male&&a>=8}
    else o.skirt=!p.male&&a>=8;
    return addClass(o,p);
  }
  if(p.retired||a>=65){o.top=p.male?'#b9a27a':'#c98aa8';o.extra.push('cardigan');o.pants='#5a5a6a';o.skirt=!p.male;o.skirtC='#6a5a7a';return addClass(o,p)}
  switch(j){
    case 'doctor':o.top='#7fb3e6';o.extra.push('coat','stetho','tie');o.tool='📋';break;
    case 'nurse':o.top='#4fc1b8';o.pants='#4fc1b8';o.tool='📋';o.hat='nurse';break;
    case 'farm':o.top='#d9534f';o.pants='#3d6eb4';o.extra.push('overalls');o.hat='straw';o.tool='⛏️';break;
    case 'day':o.top='#6b7a8f';o.pants='#4a4a4a';o.extra.push('vest');o.hat='hardhat';o.tool='🔨';break;
    case 'factory':o.top='#5d6d7e';o.pants='#5d6d7e';o.hat='cap';o.tool='🔧';break;
    case 'driver':o.top='#2e86de';o.pants='#333';o.hat='helmet';o.tool='📱';break;
    case 'market':o.extra.push('apron');o.tool='🧺';o.skirt=!p.male;break;
    case 'office':o.top='#f2f2f2';o.extra.push('tie');o.pants='#2c3e50';o.tool='💻';o.skirt=!p.male;o.skirtC='#2c3e50';break;
    case 'teacher':o.top='#e8d9b5';o.extra.push('cardigan');o.tool='📖';o.skirt=!p.male;o.skirtC='#7a5a3a';break;
    case 'eng':o.top='#3b6fb6';o.hat='hardhat_w';o.tool='💻';break;
    case 'dev':o.top='#33334d';o.extra.push('hoodie','headset');o.tool='💻';break;
    case 'creator':o.hat='cap_back';o.tool='📱';break;
    case 'artist':o.top='#f0e6d2';o.extra.push('smock');o.hat='beret';o.tool='🖌️';break;
    case 'elec':o.top='#2c5f9e';o.pants='#2c3e50';o.extra.push('vest');o.hat='hardhat';o.tool='🔌';break;
    case 'lawyer':o.top='#2c2f4a';o.pants='#2c2f4a';o.extra.push('tie');o.tool='⚖️';o.skirt=!p.male;o.skirtC='#2c2f4a';break;
    case 'chef':o.top='#fafafa';o.pants='#333';o.extra.push('apron');o.hat='chef';o.tool='🍳';break;
    case 'athlete':o.top='#e74c3c';o.pants='#1c3d7a';o.extra.push('jersey');o.tool='⚽';break;
    default:if(p.cls<=1)o.extra.push('patch');o.skirt=!p.male;
  }
  return addClass(o,p);
}
function pick2(p,a){return a[(p.name.length+p.age)%a.length]}
function addClass(o,p){if(p.cls>=3&&p.age>=14)o.extra.push('gold');return o}

/* ================= 그리기 헬퍼 ================= */
function sun(x,y,r,c){cx.fillStyle=c;cx.beginPath();cx.arc(x,y,r,0,7);cx.fill()}
function cloud(x,y,c){cx.fillStyle=c||'#ffffffcc';[[0,0,14],[14,-6,16],[30,0,13]].forEach(([a,b,r])=>{cx.beginPath();cx.arc(x+a,y+b,r,0,7);cx.fill()})}
function circ(x,y,r,c){cx.fillStyle=c;cx.beginPath();cx.arc(x,y,r,0,7);cx.fill()}
function ell(x,y,rx,ry,c,rot=0){cx.fillStyle=c;cx.beginPath();cx.ellipse(x,y,rx,ry,rot,0,7);cx.fill()}
function seg(x1,y1,x2,y2,w,c){cx.strokeStyle=c;cx.lineWidth=w;cx.lineCap='round';cx.beginPath();cx.moveTo(x1,y1);cx.lineTo(x2,y2);cx.stroke()}
function prop(ch,x,y,sz=16,rot=0){cx.save();cx.translate(x,y);cx.rotate(rot);cx.font=sz+'px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(ch,0,0);cx.restore()}
function roundRect(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath()}

function drawDog(x,y,t){
  cx.save();cx.translate(x,y);const b=Math.abs(Math.sin(t*6))*3;
  ell(0,-12-b,14,9,'#c98b4a');circ(12,-20-b,8,'#c98b4a');
  ell(15,-26-b,3,6,'#8a5a2a',.4);circ(15,-21-b,1.5,'#000');circ(19,-18-b,1.6,'#3a2010');
  seg(-13,-14-b,-20,-22-b+Math.sin(t*12)*4,3,'#c98b4a');
  cx.fillStyle='#c98b4a';[-8,6].forEach(lx=>cx.fillRect(lx,-6-b,4,6+b));
  cx.restore();
}

/* ================= 캐릭터 ================= */
function drawBaby(t,o,hair,pose){
  const top=(o.outfit&&o.outfit.top)||'#fff1a8';
  if(pose==='sleep'||pose==='cry'&&false){
    cx.fillStyle='#bcd3f5';roundRect(-36,-12,72,12,5);cx.fill();
    ell(4,-18,24,10,top);circ(-22,-22,14,o.skin);circ(-22,-34,4,hair);
    seg(-28,-22,-24,-22,1.6,'#2a1a12');seg(-20,-22,-16,-22,1.6,'#2a1a12');circ(-22,-15,3,'#ff9fb5');return;
  }
  const b=Math.sin(t*4)*1.5;cx.translate(0,-6+b);
  ell(0,-14,22,14,top);
  circ(-14,-2,5,o.skin);circ(14,-2,5,o.skin); // 손발
  circ(18,-30,17,o.skin);circ(18,-46,4,hair);seg(18,-50,22,-54,2,hair);
  const pse={hap:o.hap,dead:o.dead};
  face(18,-30,pse,pose,1);
  if(pose==='cry')prop('🍼',-20,-30,14,-0.5);
}
function drawPerson(x,gy,age,male,t,o,scale){
  const k=age<=1?0.45:age<=3?0.55:age<=7?0.68:age<=13?0.82:age<=19?0.95:1;
  const s=k*scale*Math.min(1.25,H/220);
  const pose=o.pose||'idle',ot=o.outfit||{extra:[]},ex=n=>ot.extra&&ot.extra.includes(n);
  const old=age>=60,hair=age>=75?'#e6e6e6':age>=60?'#a0a0a0':o.hair;
  cx.save();cx.translate(x,gy);
  ell(0,0,26*s,5*s,'#0003');
  cx.scale(s,s);
  if(o.dead)cx.globalAlpha=.65;
  if(age<=2){drawBaby(t,o,hair,pose);cx.restore();return}

  if(pose==='sleep'){ // 이불 덮고 자기
    cx.fillStyle='#8fa3c9';roundRect(-52,-14,104,14,5);cx.fill();
    cx.fillStyle='#fff';roundRect(-52,-26,26,14,6);cx.fill();
    circ(-38,-30,18,o.skin);
    if(male)ell(-38,-44,17,7,hair);else{ell(-40,-42,19,10,hair);}
    seg(-46,-28,-40,-28,2,'#2a1a12');seg(-35,-28,-29,-28,2,'#2a1a12');
    cx.fillStyle=ot.top||o.shirt;roundRect(-24,-34,72,22,10);cx.fill();
    cx.strokeStyle='#ffffff55';cx.lineWidth=2;cx.beginPath();cx.moveTo(-18,-26);cx.lineTo(42,-26);cx.stroke();
    cx.restore();return;
  }

  const leg=age<14?22:30,hipY=-leg;
  let by=0,la=0,lb=0;
  if(pose==='jump'||pose==='exercise')by=-Math.abs(Math.sin(t*8))*12;
  else if(pose==='walk'||pose==='travel'){const w=Math.sin(t*7);la=w*.45;lb=-w*.45;by=-Math.abs(w)*2}
  else by=Math.sin(t*3)*1.2;
  if(old&&age>=72)cx.rotate(0.04);
  cx.translate(0,by);

  // 다리
  const pants=ot.pants||'#2f3552';
  const legDraw=(hx,ang)=>{const fx=hx+Math.sin(ang)*leg,fy=hipY+Math.cos(ang)*leg;seg(hx,hipY,fx,fy-3,9,pants);ell(fx+2,fy-2,7,3.5,'#222')};
  if(ot.skirt){legDraw(-6,la);legDraw(6,lb);[[-6,la],[6,lb]].forEach(([hx,a])=>seg(hx,hipY+6,hx+Math.sin(a)*leg*.6,hipY+Math.cos(a)*leg-4,7,o.skin))}
  else{legDraw(-6,la);legDraw(6,lb)}

  // 몸통
  const ty=-leg-38,top=ot.top||o.shirt;
  if(ex('backpack')){cx.fillStyle='#d9534f';roundRect(-21,ty+4,42,30,8);cx.fill()}
  if(ex('hoodie'))circ(0,ty-2,15,top);
  cx.fillStyle=top;roundRect(-16,ty,32,40,10);cx.fill();
  if(ot.skirt){cx.fillStyle=ot.skirtC||top;cx.beginPath();cx.moveTo(-15,hipY-6);cx.lineTo(15,hipY-6);cx.lineTo(21,hipY+12);cx.lineTo(-21,hipY+12);cx.closePath();cx.fill()}
  if(ex('uniform')){cx.fillStyle='#fff';cx.beginPath();cx.moveTo(-9,ty);cx.lineTo(0,ty+11);cx.lineTo(9,ty);cx.fill();cx.fillStyle='#d9534f';cx.fillRect(-2,ty+9,4,10);circ(-9,ty+16,2,'#ffd84d')}
  if(ex('coat')){cx.fillStyle='#fdfdfd';roundRect(-18,ty-1,13,54,6);cx.fill();roundRect(5,ty-1,13,54,6);cx.fill();circ(-11,ty+28,1.5,'#bbb');prop('🖊️',-11,ty+12,8)}
  if(ex('tie')){cx.fillStyle='#c0392b';cx.beginPath();cx.moveTo(-3,ty+2);cx.lineTo(3,ty+2);cx.lineTo(4,ty+22);cx.lineTo(0,ty+27);cx.lineTo(-4,ty+22);cx.fill()}
  if(ex('stetho')){cx.strokeStyle='#333';cx.lineWidth=2;cx.beginPath();cx.arc(0,ty+4,10,0.1*Math.PI,0.9*Math.PI);cx.stroke();circ(7,ty+18,3,'#999')}
  if(ex('vest')){cx.fillStyle='#ff8c1a';roundRect(-16,ty+2,32,34,8);cx.fill();cx.fillStyle='#fff36b';cx.fillRect(-16,ty+16,32,4);cx.fillRect(-16,ty+26,32,4);cx.fillStyle=top;cx.fillRect(-3,ty,6,36)}
  if(ex('overalls')){cx.fillStyle='#3d6eb4';cx.fillRect(-12,ty+16,24,24);seg(-10,ty,-10,ty+18,4,'#3d6eb4');seg(10,ty,10,ty+18,4,'#3d6eb4');circ(-10,ty+17,2,'#ffd84d');circ(10,ty+17,2,'#ffd84d');cx.fillStyle='#2f5a9a';cx.fillRect(-5,ty+22,10,8)}
  if(ex('apron')){cx.fillStyle='#f5efe0';roundRect(-12,ty+12,24,36,4);cx.fill();seg(-12,ty+14,12,ty+14,2,'#c9b98f');cx.fillStyle='#e8dcc0';cx.fillRect(-6,ty+30,12,8)}
  if(ex('cardigan')){seg(0,ty+2,0,ty+38,2,'#0003');[12,22,32].forEach(yy=>circ(-3,ty+yy,1.6,'#0006'))}
  if(ex('smock'))[[-8,10,'#ff6b81'],[6,22,'#5ec8ff'],[-4,30,'#ffcc4d'],[8,8,'#5be08f']].forEach(([a,b,c])=>circ(a,ty+b,3,c));
  if(ex('patch')){cx.fillStyle='#c9a46a';cx.fillRect(4,ty+18,9,8);cx.strokeStyle='#5a3a1e';cx.lineWidth=1;cx.setLineDash([2,2]);cx.strokeRect(4,ty+18,9,8);cx.setLineDash([]);seg(-12,ty+36,-6,ty+33,1,'#0005')}
  if(ex('jersey')){cx.fillStyle='#fff';cx.font='bold 14px sans-serif';cx.textAlign='center';cx.fillText('10',0,ty+26)}
  if(ex('gold')){cx.strokeStyle='#ffd700';cx.lineWidth=2;cx.beginPath();cx.arc(0,ty+2,8,0.15*Math.PI,0.85*Math.PI);cx.stroke();circ(0,ty+10,2.5,'#ffd700')}
  if(ex('backpack')){seg(-11,ty+2,-11,ty+30,3,'#a33');seg(11,ty+2,11,ty+30,3,'#a33')}

  // 팔 (손 위치 = 포즈)
  const hy=-leg-56,sw=Math.sin(t*7)*8;
  let L=[-22,hipY+2],Rr=[22,hipY+2];
  const tool=ot.tool;
  switch(pose){
    case 'idle':if(o.hap>72&&o.main&&!o.dead)Rr=[26+Math.sin(t*6)*4,ty-20];if(o.partnerHand)L=[-26,hipY-4];break;
    case 'walk':case 'travel':L=[-20+sw*.6,hipY];Rr=[20-sw*.6,hipY];break;
    case 'jump':L=[-28,ty-26+Math.sin(t*8)*4];Rr=[28,ty-26-Math.sin(t*8)*4];break;
    case 'exercise':{const u=Math.sin(t*8)>0;L=u?[-30,ty-24]:[-28,hipY];Rr=u?[30,ty-24]:[28,hipY];break}
    case 'read':case 'phone':L=[-9,ty+16];Rr=[9,ty+16];break;
    case 'cry':L=[-8,hy+8];Rr=[8,hy+8];break;
    case 'wipe':Rr=[10,hy-10];break;
    case 'sweep':L=[4,ty+12];Rr=[12,ty+26];break;
    case 'work':
      if(tool==='💻'||tool==='📋'||tool==='📖'||tool==='📱'){L=[-9,ty+16];Rr=[9,ty+16]}
      else if(tool==='🧺'){L=[-24,hipY-4];Rr=[22,ty+6]}
      else{const sv=Math.sin(t*9);Rr=[20+sv*6,ty-14+sv*14];L=[-20,hipY]}
      break;
    case 'cheer':Rr=[22,ty-30];break;
    case 'hug':L=[-34,ty+4+Math.sin(t*4)*3];Rr=[34,ty+4-Math.sin(t*4)*3];break;
    case 'give':Rr=[32,ty+12];break;
    case 'sing':Rr=[7,hy+16];L=[-28,ty-12];break;
    case 'mirror':Rr=[16,hy+4];break;
    case 'look':Rr=[12,hy-6];L=[-24,ty+18];break;
    case 'carry':L=[-14,hy-24];Rr=[14,hy-24];break;
    case 'sick':L=[-6,ty+24];Rr=[6,ty+24];break;
    case 'selfie':Rr=[30,ty-24];break;
  }
  const sx=[-15,15],shy=ty+7;
  [[sx[0],L],[sx[1],Rr]].forEach(([sx0,h])=>{const mx=(sx0+h[0])/2,my=(shy+h[1])/2;seg(sx0,shy,mx,my,9,top);seg(mx,my,h[0],h[1],7,o.skin);circ(h[0],h[1],4,o.skin)});

  // 소품
  if(age>=72&&(pose==='idle'||pose==='walk')){seg(L[0],L[1],L[0]-4,0,4,'#6b4a2b');seg(L[0],L[1],L[0]+5,L[1]-3,4,'#6b4a2b')}
  const P2=(ch,h,sz,rot)=>prop(ch,h[0],h[1],sz,rot);
  switch(pose){
    case 'read':prop(o.propChar||'📖',0,ty+14,22);break;
    case 'phone':prop('📱',0,ty+12,18);break;
    case 'sweep':{const b=Math.sin(t*8)*6;seg(10,ty+6,-12+b,-4,3,'#8a5a2a');cx.fillStyle='#d9b45a';cx.beginPath();cx.moveTo(-18+b,0);cx.lineTo(-6+b,0);cx.lineTo(-10+b,-8);cx.lineTo(-14+b,-8);cx.fill();break}
    case 'work':if(tool==='💻')prop('💻',0,ty+16,24);else if(tool==='📋'||tool==='📖'||tool==='📱')prop(tool,0,ty+14,20);else if(tool==='🧺')P2('🧺',Rr,20);else if(tool)P2(tool,Rr,20,Math.sin(t*9)*.8-.4);break;
    case 'cheer':P2(ANIM.type==='grad'?'📜':ANIM.type==='newjob'?'💼':ANIM.type==='wedding'?'💐':'🥤',[Rr[0],Rr[1]-8],18);break;
    case 'give':P2('🪙',[Rr[0]+4,Rr[1]],14);break;
    case 'sing':P2('🎤',[Rr[0]-2,Rr[1]-4],14,-.6);break;
    case 'mirror':P2('🪞',[Rr[0]+6,Rr[1]-10],16);break;
    case 'look':P2('🔍',[L[0]-4,L[1]],16);break;
    case 'travel':P2('🧳',[Rr[0]+6,Rr[1]+8],20);break;
    case 'carry':prop('🪣',0,hy-30,24);break;
    case 'selfie':P2('📱',[Rr[0]+2,Rr[1]-8],16,.3);break;
    case 'idle':if(o.main&&o.tool&&age>=18&&age<65&&Math.sin(t*.5)>.6)P2(o.tool,[Rr[0]+4,Rr[1]],14);break;
  }

  // 목 & 머리
  cx.fillStyle=o.skin;cx.fillRect(-4,ty-6,8,8);
  if(!male){cx.fillStyle=hair;
    if(old)circ(0,hy-21,8,hair);
    else if(age<14){circ(-21,hy-2,7,hair);circ(21,hy-2,7,hair)}
    else{roundRect(-22,hy-12,44,o.hairLong?44:36,12);cx.fill()}}
  circ(-19,hy+2,4,o.skin);circ(19,hy+2,4,o.skin);
  circ(0,hy,20,o.skin);
  // 앞머리
  cx.fillStyle=hair;
  if(male){
    if(age>=75){ell(-15,hy-6,6,9,hair);ell(15,hy-6,6,9,hair)}
    else if(age>=55){cx.beginPath();cx.arc(0,hy-4,20,Math.PI,0);cx.fill();ell(0,hy-15,9,5,o.skin)}
    else{cx.beginPath();cx.arc(0,hy-4,20.5,Math.PI,0);cx.fill();ell(-7,hy-14,12,6,hair,-.35);cx.fillRect(-20,hy-6,5,9);cx.fillRect(15,hy-6,5,9)}
  }else{
    cx.beginPath();cx.arc(0,hy-4,21,Math.PI,0);cx.fill();
    if(!old){ell(-6,hy-13,13,7,hair,-.25);ell(9,hy-14,9,6,hair,.35)}
    if(age>=14&&age<60&&!ot.hat)circ(14,hy-16,3,'#ff6b81');
  }
  face(0,hy,o,pose,age);
  if(male&&age>=28&&o.beard){cx.strokeStyle=hair+'99';cx.lineWidth=5;cx.beginPath();cx.arc(0,hy+5,15,.15*Math.PI,.85*Math.PI);cx.stroke()}
  if(o.glasses){cx.strokeStyle='#333';cx.lineWidth=1.6;cx.beginPath();cx.arc(-7,hy+2,5,0,7);cx.moveTo(12,hy+2);cx.arc(7,hy+2,5,0,7);cx.moveTo(-2,hy+2);cx.lineTo(2,hy+2);cx.stroke()}
  if(ex('headset')){cx.strokeStyle='#222';cx.lineWidth=3;cx.beginPath();cx.arc(0,hy-2,22,Math.PI*1.05,Math.PI*1.95);cx.stroke();ell(-21,hy+2,4,7,'#222');ell(21,hy+2,4,7,'#222')}
  // 모자
  const hat=pose==='cheer'&&ANIM.type==='grad'?'grad':ot.hat;
  if(hat==='hardhat'||hat==='hardhat_w'){const c=hat==='hardhat'?'#ffc531':'#f4f4f4';cx.fillStyle=c;cx.beginPath();cx.arc(0,hy-8,21,Math.PI,0);cx.fill();cx.fillRect(-25,hy-10,50,4);seg(0,hy-28,0,hy-12,3,'#0002')}
  else if(hat==='straw'){ell(0,hy-12,34,6,'#e8c76a');cx.fillStyle='#e8c76a';roundRect(-15,hy-30,30,19,7);cx.fill();cx.fillStyle='#c0392b';cx.fillRect(-15,hy-16,30,4)}
  else if(hat==='cap'){cx.fillStyle='#34495e';cx.beginPath();cx.arc(0,hy-8,20,Math.PI,0);cx.fill();ell(14,hy-9,13,4,'#2c3e50')}
  else if(hat==='cap_back'){cx.fillStyle='#e74c3c';cx.beginPath();cx.arc(0,hy-8,20,Math.PI,0);cx.fill();ell(-16,hy-12,10,3,'#c0392b',-.3)}
  else if(hat==='helmet'){cx.fillStyle='#e74c3c';cx.beginPath();cx.arc(0,hy-3,24,Math.PI*.92,Math.PI*2.08);cx.fill();cx.fillStyle='#2c3e50aa';cx.fillRect(-17,hy-6,34,7)}
  else if(hat==='chef'){cx.fillStyle='#fff';roundRect(-15,hy-40,30,22,10);cx.fill();circ(-10,hy-40,9,'#fff');circ(10,hy-40,9,'#fff');circ(0,hy-44,10,'#fff');cx.fillRect(-17,hy-22,34,7)}
  else if(hat==='beret'){ell(4,hy-18,20,8,'#2c2c54',.2);circ(8,hy-26,2,'#2c2c54')}
  else if(hat==='nurse'){cx.fillStyle='#fff';roundRect(-10,hy-30,20,10,3);cx.fill();cx.fillStyle='#e74c3c';cx.fillRect(-1.5,hy-28.5,3,7);cx.fillRect(-3.5,hy-26.5,7,3)}
  else if(hat==='grad'){cx.fillStyle='#222';cx.beginPath();cx.moveTo(-24,hy-20);cx.lineTo(0,hy-30);cx.lineTo(24,hy-20);cx.lineTo(0,hy-12);cx.fill();cx.fillRect(-12,hy-18,24,8);seg(20,hy-20,22,hy-6,1.5,'#ffd84d')}
  if(pose==='bandage')prop('🩹',11,hy+7,11,.4);
  if(pose==='sick')prop('🌡️',8,hy+13,12,-1);
  if(o.dead){cx.strokeStyle='#ffe066';cx.lineWidth=3;cx.beginPath();cx.ellipse(0,hy-30,14,4,0,0,7);cx.stroke()}
  cx.restore();
}
function face(x,y,o,pose,age){
  const hap=o.hap,dead=o.dead,blink=Math.sin(performance.now()/260+x)>0.985;
  const happy=['jump','cheer','hug','sing','selfie','give'].includes(pose);
  const sad=pose==='cry'||pose==='sick'||(hap<30&&!happy);
  const ink='#2a1a12';
  // 눈썹
  if(sad){seg(x-11,y-7,x-4,y-10,1.8,ink);seg(x+11,y-7,x+4,y-10,1.8,ink)}
  else if(pose==='exercise'||pose==='work'){seg(x-11,y-10,x-4,y-8,1.8,ink);seg(x+11,y-10,x+4,y-8,1.8,ink)}
  else{seg(x-11,y-8,x-4,y-9,1.6,ink);seg(x+11,y-8,x+4,y-9,1.6,ink)}
  // 눈
  if(dead||blink){seg(x-9,y+1,x-3,y+1,2,ink);seg(x+3,y+1,x+9,y+1,2,ink)}
  else if(happy){cx.strokeStyle=ink;cx.lineWidth=2;cx.beginPath();cx.arc(x-6,y+3,3.5,Math.PI*1.1,Math.PI*1.9);cx.moveTo(x+9.5,y+3);cx.arc(x+6,y+3,3.5,Math.PI*1.1,Math.PI*1.9);cx.stroke()}
  else{circ(x-6,y+1,2.8,ink);circ(x+6,y+1,2.8,ink);circ(x-5,y,1,'#fff');circ(x+7,y,1,'#fff')}
  // 입
  cx.strokeStyle=ink;cx.lineWidth=2;cx.beginPath();
  if(dead){cx.arc(x,y+9,4,.2*Math.PI,.8*Math.PI);cx.stroke()}
  else if(pose==='sing'){ell(x,y+11,3,4,'#7a2a2a')}
  else if(happy||(hap>=78)){cx.fillStyle='#7a2a2a';cx.beginPath();cx.arc(x,y+8,6,0,Math.PI);cx.fill();ell(x,y+12,3,1.6,'#ff8fa3')}
  else if(sad){cx.arc(x,y+15,6,1.15*Math.PI,1.85*Math.PI);cx.stroke()}
  else if(hap>=55){cx.arc(x,y+7,6,.15*Math.PI,.85*Math.PI);cx.stroke()}
  else{cx.moveTo(x-5,y+11);cx.lineTo(x+5,y+11);cx.stroke()}
  // 볼터치 / 눈물 / 땀 / 주름
  if((hap>=60||pose==='hug')&&!dead){cx.fillStyle='#ff8fa355';cx.beginPath();cx.arc(x-12,y+8,4,0,7);cx.arc(x+12,y+8,4,0,7);cx.fill()}
  if((pose==='cry'||hap<22)&&!dead){const d=(performance.now()/25)%14;ell(x-8,y+6+d,1.8,2.6,'#5ec8ffdd');ell(x+8,y+6+(d+7)%14,1.8,2.6,'#5ec8ffdd')}
  if(pose==='exercise'||pose==='work'||pose==='wipe'||pose==='carry')ell(x+16,y-8+(performance.now()/60)%6,2,3,'#9fdcffdd');
  if(pose==='sick'||(o.main&&o.hp<25&&!dead)){cx.fillStyle='#7ccf6a33';cx.beginPath();cx.arc(x,y,20,0,7);cx.fill()}
  if(age>=60){seg(x-15,y-1,x-12,y,1,'#0003');seg(x+15,y-1,x+12,y,1,'#0003');seg(x-6,y-14,x+6,y-14,1,'#0002');if(age>=75)seg(x-8,y-17,x+8,y-17,1,'#0002')}
}
const SCENES={
  crib:{sky:['#ffe3f1','#ffd1e8'],ground:'#f7c6dd'},
  play:{sky:['#bfe9ff','#e6f7ff'],ground:'#9be38a'},
  school:{sky:['#9fd8ff','#dff3ff'],ground:'#c8a77a'},
  city:{sky:['#26305c','#5a4a8a'],ground:'#3a3550'},
  office:{sky:['#7fc3ff','#cfe9ff'],ground:'#7a7f95'},
  park:{sky:['#ffb88a','#ffe0b8'],ground:'#8ccf7e'},
  village:{sky:['#ffcf7a','#fff0c8'],ground:'#c9874a'},
  farm:{sky:['#9fd8ff','#e9f7ff'],ground:'#7cbf5a'},
};
function sceneKey(){
  const st=stageOf(P.age).k;
  if(P.rural){if(st==='baby')return P.tier===3?'village':'crib';return P.tier===3?'village':'farm'}
  return {baby:'crib',kid:'play',elem:'school',teen:'school',young:'city',adult:'office',old:'park'}[st];
}
let lastT=performance.now();
function charOpts(snap,pose,main){
  return {hair:P.hair,skin:P.skin,shirt:P.shirt,hap:snap.hap,hp:snap.hp,outfit:snap.outfit,pose,main,beard:P.beard,glasses:snap.glasses,dead:snap.dead,hairLong:P.hairLong};
}
function liveSnap(){return {hap:P.hap,hp:P.hp,outfit:outfitOf(P),glasses:P.smart>65&&P.age>=35,dead:!P.alive}}
function drawHouse(x,gy){
  const t=P.home.type;if(t==='parents')return;
  const win=(x0,y0,w,h,n,m,c='#9fd8ff')=>{cx.fillStyle=c;for(let i=0;i<n;i++)for(let j=0;j<m;j++)cx.fillRect(x0+j*(w/m)+3,y0+i*(h/n)+3,w/m-6,h/n-6)};
  if(t==='hut'){hut(x,gy,1.05);return}
  if(t==='brick'){cx.fillStyle='#b5523b';cx.fillRect(x-32,gy-46,64,46);cx.strokeStyle='#8a3a2a';cx.lineWidth=1;for(let r=0;r<6;r++){cx.beginPath();cx.moveTo(x-32,gy-46+r*8);cx.lineTo(x+32,gy-46+r*8);cx.stroke()}
    cx.fillStyle='#7a6a5a';cx.fillRect(x-36,gy-50,72,6);cx.fillStyle='#4a2c17';cx.fillRect(x-7,gy-24,14,24);return}
  if(t==='monthly'){cx.fillStyle='#c9c3b8';cx.fillRect(x-26,gy-78,52,78);win(x-26,gy-74,52,60,3,3,'#ffe9a8');cx.fillStyle='#e74c3c';cx.fillRect(x-20,gy-90,40,12);cx.fillStyle='#fff';cx.font='bold 9px sans-serif';cx.textAlign='center';cx.fillText('원룸',x,gy-81);return}
  if(t==='jeonse'){cx.fillStyle='#e8d6b5';cx.fillRect(x-34,gy-70,68,70);win(x-34,gy-66,68,48,3,4);cx.fillStyle='#8a6a4a';cx.fillRect(x-38,gy-74,76,6);cx.fillStyle='#5a4a3a';cx.fillRect(x-8,gy-18,16,18);return}
  if(t==='apt_s'||t==='apt_l'){
    const tw=(x0,h,c)=>{cx.fillStyle=c;cx.fillRect(x0-20,gy-h,40,h);win(x0-20,gy-h+4,40,h-12,Math.floor(h/14),3,'#bfe1ff');cx.fillStyle='#0002';cx.fillRect(x0-20,gy-h,40,5)};
    if(t==='apt_l'){tw(x-26,120,'#d7dde8');tw(x+20,135,'#c8d0de');circ(x-3,gy-8,10,'#5fb25f')}else tw(x,110,'#d7dde8');return}
  if(t==='country'){
    cx.fillStyle='#fdfaf2';cx.fillRect(x-34,gy-46,68,46);
    cx.fillStyle='#4a6a8a';cx.beginPath();cx.moveTo(x-42,gy-44);cx.lineTo(x-6,gy-78);cx.lineTo(x+42,gy-44);cx.fill();
    cx.fillStyle='#8a5a2a';cx.fillRect(x+16,gy-74,8,16);
    cx.fillStyle='#9fd8ff';cx.fillRect(x-26,gy-36,16,14);cx.fillRect(x+10,gy-36,16,14);cx.fillStyle='#7a4a2a';cx.fillRect(x-6,gy-26,12,26);
    cx.strokeStyle='#c9a46a';cx.lineWidth=2;for(let k=-56;k<=56;k+=8){cx.beginPath();cx.moveTo(x+k,gy);cx.lineTo(x+k,gy-12);cx.stroke()}cx.beginPath();cx.moveTo(x-56,gy-8);cx.lineTo(x+56,gy-8);cx.stroke();
    ['🌷','🌼','🌷'].forEach((f,i)=>prop(f,x-46+i*10,gy-4,10));circ(x-60,gy-40,16,'#4f9a4f');cx.fillStyle='#6b4a2b';cx.fillRect(x-62,gy-26,5,26);return}
  if(t==='house'){cx.fillStyle='#f3e3c3';cx.fillRect(x-34,gy-64,68,64);cx.fillStyle='#c0392b';cx.beginPath();cx.moveTo(x-42,gy-62);cx.lineTo(x,gy-92);cx.lineTo(x+42,gy-62);cx.fill();
    win(x-34,gy-60,68,30,1,3);cx.fillStyle='#7a4a2a';cx.fillRect(x-8,gy-26,16,26);return}
}

function draw(now){
  requestAnimationFrame(draw);
  const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  if(!P||!$('#game').classList.contains('on')||!W)return;
  const t=now/1000;const key=sceneKey();const S=SCENES[key];
  const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,S.sky[0]);g.addColorStop(1,S.sky[1]);
  cx.fillStyle=g;cx.fillRect(0,0,W,H);
  const gy=H*0.8;
  drawDeco(key,t,gy);
  if(key!=='crib')drawHouse(W*0.86,gy);
  cx.fillStyle=S.ground;cx.fillRect(0,gy,W,H-gy);
  cx.fillStyle='#0000000d';for(let i=0;i<W;i+=18)cx.fillRect(i+(i%36?0:9),gy+8+(i%3)*6,8,2);
  const pose=curPose()||'idle';
  if(P.pet)drawDog(W*0.22+Math.sin(t*1.5)*20,gy,t);
  // 배우자·연인
  if(P.partner&&P.alive){
    const pp=['hug','cheer'].includes(pose)?pose:'idle';
    drawPerson(W*0.69,gy,Math.max(P.age,19),!P.male,t+1,{hair:'#2b1b12',skin:P.skin,shirt:P.married?'#ffffff':'#ff9ecf',hap:P.married?70:80,outfit:{top:P.married?'#f5f5f5':'#ff9ecf',pants:'#2f3552',extra:[],skirt:P.male},pose:pp,hairLong:1},0.92);
    if(!P.married)prop('💕',W*0.6,gy-H*0.48+Math.sin(t*3)*4,16);
  }
  P.kidAges.slice(0,3).forEach((ka,i)=>{const kp=(pose==='hug'||pose==='cheer')?'jump':'idle';
    drawPerson(W*0.8+i*24,gy,Math.max(1,ka),i%2===0,t+i,{hair:P.hair,skin:P.skin,shirt:['#ffcc4d','#5ec8ff','#5be08f'][i],hap:80,outfit:{top:['#ffcc4d','#5ec8ff','#5be08f'][i],extra:ka>=7&&ka<18?['backpack']:[],pants:'#2f3552'},pose:kp},0.85)});
  drawPerson(W*0.48,gy,P.age,P.male,t,charOpts(liveSnap(),pose,1),1);
  if(ANIM.type&&PLAYFX[ANIM.type]&&nowS()-ANIM.t0<ANIM.dur)PLAYFX[ANIM.type](W*0.48,gy,t,(nowS()-ANIM.t0)/ANIM.dur);
  drawSeason(t,gy,dt);
  if(P.bubble&&nowS()<P.bubble.until&&P.alive)drawBubble(P.bubble.t,W*0.48,gy-H*0.6-(P.age<8?-H*0.12:0));
  // 상태 연출
  if(P.alive&&P.hap<25&&pose==='idle'){const hx=W*0.48-15,hy=gy-H*0.62;cloud(hx,hy,'#7d7f99dd');cx.strokeStyle='#9fd8ffaa';cx.lineWidth=1.5;for(let i=0;i<5;i++){const yy=(t*90+i*13)%40;cx.beginPath();cx.moveTo(hx+i*8,hy+10+yy);cx.lineTo(hx+i*8-2,hy+16+yy);cx.stroke()}}
  if(P.money>M(1e6)){for(let i=0;i<6;i++){const x=(i*W/6+t*30)%W,y=((t*60+i*47)%gy);prop('💵',x,y,15)}}
  if(P.abroad)prop('✈️',(t*40)%(W+60)-30,H*0.12,16);
  stepParticles(dt);
  if(!P.alive){cx.fillStyle='rgba(20,15,38,.5)';cx.fillRect(0,0,W,H)}
}
/* 놀이 오버레이 */
const PLAYFX={
  jumprope:(x,gy,t,p)=>{const a=(t*8)%(Math.PI*2),sc=Math.min(1.25,H/220)*.8;cx.strokeStyle='#ff6b81';cx.lineWidth=2.5;cx.beginPath();
    cx.ellipse(x,gy-46*sc,28*sc,46*sc*Math.abs(Math.cos(a))+4,0,Math.sin(a)>0?0:Math.PI,Math.sin(a)>0?Math.PI:Math.PI*2);cx.stroke()},
  blocks:(x,gy,t,p)=>{const n=Math.min(6,Math.floor(p*9));for(let i=0;i<n;i++){cx.fillStyle=['#ff6b81','#ffcc4d','#5ec8ff','#5be08f','#c58bff','#ff8a3d'][i];cx.fillRect(x+30+(i%2)*3,gy-12-i*11,16,11);cx.strokeStyle='#0003';cx.strokeRect(x+30+(i%2)*3,gy-12-i*11,16,11)}},
  bike:(x,gy,t,p)=>{prop('🚲',x+Math.sin(t*3)*4,gy-10,34)},
  ball:(x,gy,t,p)=>{prop('⚽',x+34,gy-8-Math.abs(Math.sin(t*7))*40,18)},
  hide:(x,gy,t,p)=>{circ(x-34,gy-18,22,'#4f9a4f');circ(x-20,gy-26,18,'#5fb25f');prop('👀',x-30,gy-26,12)},
  draw:(x,gy,t,p)=>{cx.fillStyle='#fff';cx.fillRect(x+26,gy-46,30,24);prop('🌈',x+41,gy-34,16);prop('🖍️',x+20,gy-30,12)},
  sand:(x,gy,t,p)=>{prop('🏰',x+34,gy-12,26);prop('🪣',x-30,gy-8,14)},
  doll:(x,gy,t,p)=>{prop('🧸',x,gy-46,22)},
  cook:(x,gy,t,p)=>{prop('🍳',x+28,gy-30,18);prop('🥄',x-26,gy-30,12)},
  origami:(x,gy,t,p)=>{prop('🦢',x,gy-56-p*20,18)},
};
function drawBubble(text,x,y){
  cx.save();cx.font='600 12px "Gowun Dodum",sans-serif';const w=Math.min(W*.6,cx.measureText(text).width+18),h=24;
  const bx=Math.max(6,Math.min(W-w-6,x-w/2+20)),by=Math.max(30,y-h);
  cx.fillStyle='#fff';roundRect(bx,by,w,h,12);cx.fill();cx.beginPath();cx.moveTo(x+6,by+h);cx.lineTo(x+14,by+h);cx.lineTo(x+4,by+h+8);cx.fill();
  cx.fillStyle='#3a2a4a';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,bx+w/2,by+h/2+1);cx.restore();
}
let SEAS=[],seasNow=null;
function drawSeason(t,gy,dt){
  const se=seasonOf(P.age).n;
  if(se!==seasNow){seasNow=se;SEAS=Array.from({length:se==='여름'?10:26},()=>({x:Math.random()*W,y:Math.random()*gy,v:10+Math.random()*25,ph:Math.random()*6}))}
  if(se==='겨울'){cx.fillStyle='#ffffff55';cx.fillRect(0,gy,W,6)}
  SEAS.forEach(p=>{p.y+=p.v*dt*(se==='여름'?-.3:1);p.x+=Math.sin(t+p.ph)*.4;if(p.y>gy){p.y=-5;p.x=Math.random()*W}if(p.y<0&&se==='여름'){p.y=gy;p.x=Math.random()*W}
    if(se==='봄'){cx.fillStyle='#ffb7d5cc';cx.beginPath();cx.ellipse(p.x,p.y,3,1.8,t+p.ph,0,7);cx.fill()}
    else if(se==='가을'){cx.fillStyle=p.ph>3?'#e8875acc':'#d9a441cc';cx.beginPath();cx.ellipse(p.x,p.y,3.5,2,t*2+p.ph,0,7);cx.fill()}
    else if(se==='겨울'){cx.fillStyle='#ffffffdd';cx.beginPath();cx.arc(p.x,p.y,1.8,0,7);cx.fill()}
    else{cx.fillStyle=`rgba(255,240,150,${.3+.3*Math.sin(t*3+p.ph)})`;cx.beginPath();cx.arc(p.x,p.y,1.6,0,7);cx.fill()}});
}
/* 스냅샷(앨범/초상) 그리기 */
function drawSnapTo(canvas,snap,big,size){
  const d=size?1:Math.min(2,devicePixelRatio||1),r=size?{width:size.w,height:size.h}:canvas.getBoundingClientRect();
  canvas.width=r.width*d;canvas.height=r.height*d;
  const sv=[cx,W,H];cx=canvas.getContext('2d');cx.setTransform(d,0,0,d,0,0);W=r.width;H=r.height*1.15;
  const S=SCENES[snap.scene]||SCENES.play;const ch=r.height;
  const g=cx.createLinearGradient(0,0,0,ch);g.addColorStop(0,S.sky[0]);g.addColorStop(1,S.sky[1]);cx.fillStyle=g;cx.fillRect(0,0,W,ch);
  const gy=ch*0.86;cx.fillStyle=S.ground;cx.fillRect(0,gy,W,ch-gy);
  drawPerson(W/2,gy,snap.a,P.male,snap.a*.37,charOpts(snap,snap.pose||'idle',0),(big?1:0.95)*(size&&size.k||1));
  [cx,W,H]=sv;
}
function hut(x,gy,s){
  cx.fillStyle='#a8683a';cx.fillRect(x-28*s,gy-36*s,56*s,36*s);
  cx.fillStyle='#d9b45a';cx.beginPath();cx.moveTo(x-38*s,gy-34*s);cx.lineTo(x,gy-66*s);cx.lineTo(x+38*s,gy-34*s);cx.fill();
  cx.fillStyle='#4a2c17';cx.fillRect(x-7*s,gy-22*s,14*s,22*s);
}
function drawDeco(d,t,gy){
  cx.save();
  if(d==='crib'){
    cx.strokeStyle='#d9a0bd';cx.lineWidth=2;cx.beginPath();cx.moveTo(W*0.5,0);cx.lineTo(W*0.5,30);cx.stroke();
    for(let i=0;i<4;i++){const a=t*0.8+i*Math.PI/2;cx.font='18px serif';cx.fillText(['⭐','🌙','☁️','🐣'][i],W*0.5+Math.cos(a)*40-9,40+Math.sin(a)*8+10)}
    cx.fillStyle='#fff8';cx.fillRect(W*0.08,H*0.15,60,50);
  }else if(d==='village'){
    sun(W*0.82,H*0.2,26,'#ff9f43');
    cx.fillStyle='#ffffff55';cx.beginPath();cx.arc(W*0.82,H*0.2,36+Math.sin(t*2)*3,0,7);cx.fill();
    // 아카시아 나무
    cx.fillStyle='#5a3a1e';cx.fillRect(W*0.12,gy-70,7,70);
    cx.fillStyle='#4f7a2a';cx.beginPath();cx.ellipse(W*0.135,gy-74,44,12,0,0,7);cx.fill();
    hut(W*0.88,gy,0.9);hut(W*0.3,gy,0.6);
    // 물동이 & 아지랑이
    cx.font='16px serif';cx.fillText('🪣',W*0.38,gy-2);
    cx.strokeStyle='#ffffff40';for(let i=0;i<3;i++){cx.beginPath();for(let x=0;x<W;x+=8)cx.lineTo(x,gy-6-i*10+Math.sin(x/20+t*3+i)*2);cx.stroke()}
  }else if(d==='farm'){
    sun(W*0.85,H*0.16,20,'#ffe066');cloud(W*0.3+Math.sin(t*0.2)*30,H*0.15);
    cx.fillStyle='#b5523b';cx.fillRect(W*0.04,gy-60,70,60);cx.fillStyle='#8a3a2a';
    cx.beginPath();cx.moveTo(W*0.04-6,gy-58);cx.lineTo(W*0.04+35,gy-86);cx.lineTo(W*0.04+76,gy-58);cx.fill();
    cx.fillStyle='#e8c95a';for(let i=0;i<7;i++){const x=W*0.62+i*14;cx.fillRect(x,gy-18-Math.sin(t*2+i)*2,3,18)}
  }else if(d==='play'){
    sun(W*0.85,H*0.18,22,'#ffd84d');cloud(W*0.2+Math.sin(t*0.2)*20,H*0.2);
    cx.fillStyle='#ff6b81';cx.fillRect(W*0.12,gy-60,8,60);cx.fillRect(W*0.22,gy-60,8,60);cx.fillRect(W*0.1,gy-64,40,6);
    cx.strokeStyle='#555';cx.beginPath();cx.moveTo(W*0.16,gy-58);cx.lineTo(W*0.16+Math.sin(t*2)*10,gy-20);cx.stroke();
  }else if(d==='school'){
    sun(W*0.88,H*0.16,20,'#ffe066');cloud(W*0.3+Math.sin(t*0.2)*30,H*0.15);
    cx.fillStyle='#d9644a';cx.fillRect(W*0.04,gy-90,W*0.28,90);
    cx.fillStyle='#fff3';for(let r=0;r<3;r++)for(let c=0;c<3;c++)cx.fillRect(W*0.06+c*W*0.085,gy-80+r*25,W*0.06,16);
  }else if(d==='city'){
    for(let i=0;i<30;i++){cx.fillStyle=`rgba(255,255,255,${0.3+0.3*Math.sin(t*2+i)})`;cx.fillRect((i*73)%W,(i*37)%(H*0.4),2,2)}
    cx.fillStyle='#fff6c8';cx.beginPath();cx.arc(W*0.85,H*0.15,16,0,7);cx.fill();
    for(let i=0;i<8;i++){const bw=W/8,bh=40+((i*53)%70);cx.fillStyle=i%2?'#1c1838':'#28224a';cx.fillRect(i*bw,gy-bh,bw-2,bh);
      cx.fillStyle='#ffd86b';for(let k=0;k<4;k++)if((i+k)%3)cx.fillRect(i*bw+6+(k%2)*12,gy-bh+8+Math.floor(k/2)*14,6,6)}
  }else if(d==='office'){
    sun(W*0.12,H*0.15,18,'#fff2a8');cloud(W*0.6+Math.sin(t*0.2)*30,H*0.12);
    cx.fillStyle='#4f6a8f';cx.fillRect(W*0.02,gy-120,W*0.2,120);cx.fillStyle='#6684ad';cx.fillRect(W*0.8,gy-100,W*0.18,100);
    cx.fillStyle='#bfe1ff88';for(let r=0;r<6;r++){cx.fillRect(W*0.04,gy-112+r*18,W*0.16,10);if(r<5)cx.fillRect(W*0.82,gy-92+r*18,W*0.14,10)}
  }else if(d==='park'){
    sun(W*0.8,H*0.3,28,'#ff9a5a');
    cx.fillStyle='#6b4a2b';cx.fillRect(W*0.12,gy-60,10,60);
    cx.fillStyle='#e8875a';cx.beginPath();cx.arc(W*0.125,gy-70,30,0,7);cx.fill();
    for(let i=0;i<5;i++){const x=(W*0.1+i*40+t*15)%W,y=(H*0.2+((t*25+i*50)%(gy-H*0.2)));cx.font='12px serif';cx.fillText('🍂',x,y)}
  }
  cx.restore();
}
requestAnimationFrame(draw);
