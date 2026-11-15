import json, time, asyncio
from playwright.async_api import async_playwright
import os
BASE=os.environ.get('P8B_BASE','http://localhost:8765/life-test/')
ME={'name':'테스트','date':'1990-05-15','cal':'s','time':'','sex':'m'}
async def newpage(pw, me=ME, extra=None, karma=200):
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':412,'height':900}, locale='ko-KR', timezone_id='Asia/Seoul')
    pg = await ctx.new_page()
    logs=[]; pg.on('console', lambda m: logs.append(m.type+': '+m.text)); pg.on('pageerror', lambda e: logs.append('PAGEERR: '+str(e)))
    init = {'p8bT_me': me, 'p8bT_karma': karma, 'p8bT_profiles':[me]}
    if extra: init.update(extra)
    if '/life/' in BASE: init = {('p8b_'+k[5:] if k.startswith('p8bT_') else k): v for k, v in init.items()}   # 운영 페이지는 p8b_ 키
    await pg.add_init_script("(function(){if(sessionStorage.getItem('__init'))return;sessionStorage.setItem('__init','1');var d=%s;for(var k in d)localStorage.setItem(k,JSON.stringify(d[k]));})()" % json.dumps(init, ensure_ascii=False))
    await pg.goto(BASE); await pg.wait_for_timeout(1500)
    return b, pg, logs
