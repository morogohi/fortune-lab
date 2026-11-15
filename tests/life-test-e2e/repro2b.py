import asyncio, sys, json, re
from common import *
Q="테스트 상황입니다. A는 현재 회사 유지, B는 창업입니다. 자금은 부족하고 안정적인 수입이 중요합니다. 두 선택의 현실적인 장단점과 확인할 질문을 알려주세요."
async def chat(pg, q):
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('chat')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    await pg.fill('#csIn', q); await pg.click('#csSend'); await pg.wait_for_timeout(1500)
    return await pg.evaluate("()=>[...document.querySelectorAll('.cs-msg.a')].map(x=>x.innerText).slice(-1)[0]")
async def pick(pg, q, a, b, cond=''):
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('pick')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    if await pg.query_selector('#csNew2'): await pg.click('#csNew2'); await pg.wait_for_timeout(300)
    await pg.fill('#csQ', q); await pg.fill('#csA',a); await pg.fill('#csB',b); await pg.fill('#csCond',cond)
    await pg.click('#csGo'); 
    for i in range(40):
        await pg.wait_for_timeout(500)
        if await pg.query_selector('.cs-res'): break
    return await pg.evaluate("()=>document.querySelector('#hubBody') ? document.querySelector('#hubBody').innerText : document.body.innerText")
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw)
    t = await chat(pg, Q); print('=== CHAT ===\n', t)
    t2 = await pick(pg, Q, '현재 회사 유지', '창업'); 
    i=t2.find('“'); print('=== PICK ===\n', t2[i:i+5200])
    print('\n'.join(l for l in logs if 'PAGEERR' in l or ('error' in l.lower() and '404' not in l))[:2000])
    await b.close()
if __name__=='__main__': asyncio.run(main())
