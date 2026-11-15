import asyncio
from common import *
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:200])
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, me=ME3)
    await pg.evaluate("()=>Hub.go('today')"); await pg.wait_for_timeout(500)
    await pg.evaluate("()=>document.querySelector('#hDTbox').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(300)
    await pg.click('#hDTshuf'); await pg.wait_for_timeout(2000)
    y0 = await pg.evaluate("()=>document.querySelector('#hubBody').scrollTop")
    await pg.screenshot(path='tt0.png')
    await pg.click('#hDTrow .hdt-pc:nth-child(4)')
    shots=[]
    for i,t in enumerate([250, 450, 400, 600, 1200]):
        await pg.wait_for_timeout(t); await pg.screenshot(path=f'tt{i+1}.png')
    st = await pg.evaluate("()=>({y:document.querySelector('#hubBody').scrollTop, top:document.querySelector('.hdt-open').getBoundingClientRect().top, vh:innerHeight, done:!!JSON.parse(localStorage.getItem('p8b_daily')||'{}').ms})")
    ok('카드를 골라도 화면이 맨 위로 가지 않음', st['y']>200, st)
    ok('결과 카드가 화면 안에 보임', 0 < st['top'] < st['vh'], st)
    ok('미션 보상 처리됨', st['done'], st)
    print([l for l in logs if 'PAGEERR' in l]); await b.close()
  print('RESULT', sum(R),'/',len(R))
asyncio.run(main())
