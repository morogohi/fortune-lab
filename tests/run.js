/* 운명 연구소 자동 검증: node tests/run.js
   1) 만세력 경계 사례(절입 전후·자정 전후·윤달·시각 미상·없는 날짜)
   2) 목표 문장 20개 → 분류와 첫 과제가 목표에 맞는지
   lunar-javascript 는 npm install 로 받습니다 (package.json devDependencies). */
const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.join(__dirname,"..");
const ctx={console,Date,Math,JSON,RegExp,Object,Array,String,Number,Promise,setTimeout,URL:{createObjectURL(){return""},revokeObjectURL(){}},Blob:function(){},FileReader:function(){},
  location:{search:""},navigator:{},window:{},document:{addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}}};
ctx.window=ctx;vm.createContext(ctx);
const lunar=require("lunar-javascript");Object.assign(ctx,lunar);
for(const f of ["core.js","extra.js"])vm.runInContext(fs.readFileSync(path.join(root,"js",f),"utf8"),ctx,{filename:f});
const planSrc=fs.readFileSync(path.join(root,"js","plan.js"),"utf8");
const ST=vm.runInContext("ST",ctx),BR=vm.runInContext("BR",ctx),gz=p=>p?ST[p.s]+BR[p.b]:"없음";
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++}else{fail++;console.log("  ✗ "+m)}};

console.log("[1] 만세력 경계 사례");
const P=(cal,y,m,d,h,mi,unk=false,corr=false)=>vm.runInContext(`pillars(${JSON.stringify(cal)},${y},${m},${d},${h},${mi},${unk},${corr},"m")`,ctx);
let r=P("s",2000,1,1,12,0);ok(gz(r.d)==="戊午","2000-01-01 일주 戊午 (기준일)");ok(gz(r.y)==="己卯","2000-01-01 년주 己卯 (입춘 전)");ok(gz(r.m)==="丙子","2000-01-01 월주 丙子");
r=P("s",1990,2,4,10,0);ok(gz(r.y)==="己巳","1990-02-04 10:00 KST 입춘 전 → 己巳년");
r=P("s",1990,2,4,11,30);ok(gz(r.y)==="庚午","1990-02-04 11:30 KST 입춘 후 → 庚午년");
r=P("s",1990,5,15,11,30,false,true);ok(gz(r.h)==="辛巳","1990-05-15 11:30 보정 −32분 → 10:58 巳시");
r=P("s",1990,5,15,0,10,false,true);const prev=P("s",1990,5,14,12,0);ok(gz(r.d)===gz(prev.d),"1990-05-15 00:10 보정 후 전날 23:38 → 전날 일주 (규칙 기록)");
r=P("ll",2020,4,5,12,0,true);ok(r.solar.m===5&&r.solar.d===27,"음력 2020 윤4월 5일 → 양력 2020-05-27");ok(r.h===null,"시각 미상이면 시주 없음");
let threw=false;try{P("ll",2021,4,5,12,0)}catch(e){threw=true}ok(threw,"윤달이 없는 해의 윤달 날짜(2021 윤4월)는 오류로 거부");

console.log("[2] 목표 → 과제 일치 20사례");
const $stub={};ctx.document.getElementById=id=>$stub[id]||($stub[id]={value:"",checked:false,textContent:"",hidden:false});
ctx.esc=s=>String(s);ctx.S={me:6,lucky:[4,0],f:{Y:2027},gc:[3,0,0,4,1]};
vm.runInContext(planSrc,ctx,{filename:"plan.js"});
const cases=[
 ["전기기사 실기 합격","money","study","진단",true],["3개월 안에 500만 원 모으기","","money","지출 지도",false],["6개월 내 이직","","work","경력 한 장",false],
 ["올해 승진","","work","성과 기록",false],["부업으로 월 매출 100만 원","","work","고객 인터뷰",false],["체중 5kg 감량","","health","몸 움직이기",false],
 ["결혼할 사람 만나기","","love","만남의 자리",false],["부부 관계 회복","","love","표현 한 번",false],["번아웃 회복하고 쉬기","","mind","생각 적기",false],
 ["토익 800점","work","study","진단",true],["건축전기설비기술사 1차 합격","","study","진단",false],["공인중개사 시험 합격","","study","진단",false],
 ["매일 운동 습관 만들기","","health","몸 움직이기",false],["대출 1000만 원 상환","","money","지출 지도",false],["창업 준비","","work","고객 인터뷰",false],
 ["자존감 높이기","","mind","생각 적기",false],["가족과 시간 늘리기","","love","표현 한 번",false],["포트폴리오 완성해서 취업","","work","경력 한 장",false],
 ["비상금 300만 원","","money","지출 지도",false],["마라톤 완주","study","health","몸 움직이기",true]];
for(const [goal,concern,cat,first,mm] of cases){
  Object.assign(ctx.document.getElementById('goal3'),{value:goal});Object.assign(ctx.document.getElementById('concern'),{value:concern});Object.assign(ctx.document.getElementById('hours'),{value:'6'});Object.assign(ctx.document.getElementById('skills'),{value:'전기 설비 10년'});
  vm.runInContext('planBasis="goal";planState={week:1,history:[]}',ctx);
  const p=vm.runInContext("buildPlan()",ctx);
  ok(p.cat===cat,`"${goal}" 분류 ${cat} (결과 ${p.cat})`);ok(p.tasks[0].title===first,`"${goal}" 첫 과제 ${first} (결과 ${p.tasks[0].title})`);ok(p.mismatch===mm,`"${goal}" 불일치 경고 ${mm}`);
  ok(p.tasks.every(t=>t.why&&t.hours>=0),`"${goal}" 과제마다 목표 기여·시간`);
}
const ex=vm.runInContext('parseGoal("전기기사 실기 3개월 안에 합격")',ctx);ok(ex.exam==="전기기사"&&ex.stage==="실기"&&ex.weeks===12,"시험명·단계·기한 추출");
vm.runInContext('$("goal3").value="전기기사 실기 합격";planState={week:1,history:[{week:1,done:[true,true,true],diff:["easy","easy","ok"]}]};planState.week=2',ctx);
const p2=vm.runInContext("buildPlan()",ctx);ok(p2.load>1&&p2.tasks[0].title==="약점 집중","체크인 반영: 다 쉽게 끝내면 2주차 분량 증가·단계 진행");
console.log(`\n결과: 통과 ${pass} · 실패 ${fail}`);process.exit(fail?1:0);
