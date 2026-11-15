import asyncio, re
from common import *
from repro2b import pick
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:220])
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
ME2={'name':'두번째','date':'1985-02-03','cal':'s','time':'10:00','sex':'f'}
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, me=ME3, karma=200, extra={'p8bT_profiles':[ME3,ME2],'p8bT_events':{}})
    # 1. 무상 이벤트 100 · 미션 3 · 공유 4
    ev = await pg.evaluate("()=>Karma.events().map(g=>g.karma)")
    ok('신년 이벤트 무상 카르마 100', ev==[100], ev)
    st = await pg.evaluate("()=>Hub.dailyState()")
    ok('데일리 미션 3개', len(st['ms'])==3, st['ms'])
    await pg.evaluate("()=>Hub.go('daily')"); await pg.wait_for_timeout(300)
    body = await pg.evaluate("()=>document.querySelector('#hubBody').innerText")
    ok('운세 공유 보상 +4 표시', '하러 가기 · +4' in body, re.findall(r'.{0,20}\+4.{0,5}', body)[:2])
    p0 = await pg.evaluate("()=>JSON.parse(localStorage.getItem('p8b_pouch')||'0')")
    await pg.evaluate("()=>{const d=JSON.parse(localStorage.getItem('p8b_daily')||'null');}")
    await pg.evaluate("()=>TodayShare.open && 0")
    # 2. 선택 상담 기록 지우기
    for q in ['첫 고민','둘째 고민','셋째 고민']:
        await pick(pg, q, '현재 회사 유지', '창업')
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('pick')); Hub.go('counsel')}"); await pg.wait_for_timeout(300)
    if await pg.query_selector('#csNew2'): await pg.click('#csNew2'); await pg.wait_for_timeout(300)
    n0 = await pg.evaluate("()=>Counsel.hist(Hub.me()).length")
    ok('버튼 중첩 없음', await pg.evaluate("()=>document.querySelectorAll('button button').length===0"))
    await pg.click('.cs-pdel[data-del="0"]'); await pg.wait_for_timeout(300)
    h = await pg.evaluate("()=>Counsel.hist(Hub.me()).map(x=>x.q)")
    ok('한 건 지우기', len(h)==n0-1 and '셋째 고민' not in h, h)
    # 다른 프로필 기록 생성 후 전체 지우기 → 다른 프로필은 유지
    await pg.evaluate("(p)=>{localStorage.setItem('p8b_me', JSON.stringify(p)); Hub.render()}", ME2)
    await pick(pg, '다른 사람 고민', '이직', '현재 회사 유지')
    await pg.evaluate("(p)=>{localStorage.setItem('p8b_me', JSON.stringify(p)); Hub.render()}", ME3)
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('pick')); Hub.go('counsel')}"); await pg.wait_for_timeout(300)
    if await pg.query_selector('#csNew2'): await pg.click('#csNew2'); await pg.wait_for_timeout(300)
    k0 = await pg.evaluate("()=>karma")
    await pg.click('#csHistClr'); await pg.wait_for_timeout(300)
    await pg.click('#osheet .obtn.pri'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("(p2)=>({me:Counsel.hist(Hub.me()).length, other:Counsel.hist(p2).length, k:karma, list:!!document.querySelector('.cs-past')})", ME2)
    ok('모두 지우기: 이 프로필만, 다른 프로필·카르마 그대로', r['me']==0 and r['other']==1 and r['k']==k0 and not r['list'], r)
    # 3. 기록 보관함 지우기
    await pg.evaluate("()=>{localStorage.setItem('p8b_records', JSON.stringify([{k:'today',title:'오늘 운세',t:Date.now()},{k:'tarot',title:'타로',t:Date.now()}])); MbtiTest.put(Hub.me(),{type:'ENTJ',ax:[{pick:'E'},{pick:'N'},{pick:'T'},{pick:'J'}],at:Date.now()})}")
    await pg.evaluate("()=>Hub.openRecords ? Hub.openRecords() : null"); await pg.wait_for_timeout(300)
    has = await pg.query_selector('#osheet [data-rdel="today"]')
    if has:
        await pg.click('#osheet [data-rdel="today"]'); await pg.wait_for_timeout(300); await pg.click('#osheet .obtn.pri'); await pg.wait_for_timeout(300)
        await pg.click('#osheet [data-rdel="mbtitest"]'); await pg.wait_for_timeout(300); await pg.click('#osheet .obtn.pri'); await pg.wait_for_timeout(300)
    rr = await pg.evaluate("()=>({rec:JSON.parse(localStorage.getItem('p8b_records')).map(r=>r.k), mt:MbtiTest.get(Hub.me())})")
    ok('기록 보관함에서 운세·검사 기록 지우기 (타로는 유지)', has and rr['rec']==['tarot'] and rr['mt'] is None, rr)
    print([l for l in logs if 'PAGEERR' in l]); await b.close()
  print('RESULT', sum(R),'/',len(R))
asyncio.run(main())
