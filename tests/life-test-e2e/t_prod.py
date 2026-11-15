import asyncio, os
from common import *
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:200])
async def check(pw, base, live):
    os.environ['P8B_BASE']=base
    import common; common.BASE=base
    b,pg,logs = await common.newpage(pw)
    await pg.goto(base+'?qa=1'); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("""()=>{Hub.go('shop'); const t=document.body.innerText;
      return {test:Karma.testMode(), qa:localStorage.getItem('p8b_qa'), tools:!!document.querySelector('.ktools'), badge:/🧪 테스트/.test(t), live:/실제 서비스/.test(t)}}""")
    await pg.click('#loginBtn'); await pg.wait_for_timeout(300)
    lg = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    tag = '운영' if live else '테스트'
    if live:
        ok(f'{tag}: 테스트 모드·도구·QA 없음', not r['test'] and not r['tools'] and not r['badge'] and r['qa'] in (None,'false'), r)
    else:
        ok(f'{tag}: 테스트 모드·도구 있음', r['test'] and r['tools'], r)
    ok(f'{tag}: 로그인 창에 테스트 계정 없음 · 카카오·구글 활성', '테스트 계정' not in lg and await pg.evaluate("()=>!document.querySelector('#lgKakao').disabled"), lg[:80])
    ok(f'{tag}: 웹 광고 설정 (운영=실제, 테스트=테스트 광고)', await pg.evaluate("()=>WebAds.on && WEB_AD_CONFIG.test")== (not live), await pg.evaluate("()=>WEB_AD_CONFIG.test"))
    ok(f'{tag}: 오류 없음', not [l for l in logs if 'PAGEERR' in l], [l for l in logs if 'PAGEERR' in l][:2])
    await b.close()
async def main():
  async with async_playwright() as pw:
    await check(pw, 'http://localhost:8765/life/', True)
    await check(pw, 'http://localhost:8765/life-test/', False)
  print('RESULT', sum(R),'/',len(R))
asyncio.run(main())
