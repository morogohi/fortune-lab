import asyncio
from common import *
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = await (await b.new_context(viewport={'width':412,'height':900})).new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script("window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{}};")
    await pg.goto(BASE); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("()=>({btn:getComputedStyle(document.querySelector('#loginBtn')).display})")
    await pg.click('#setBtn'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    ok = r['btn']=='none' and '계정' not in st.split('\n')[0:3].__str__() and '로그인하지 않음' not in st
    print('PASS' if ok and not errs else 'FAIL', 'app: login hidden', r, errs[:2]); await b.close()
asyncio.run(main())
