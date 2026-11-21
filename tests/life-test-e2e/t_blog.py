import asyncio, json, sys
sys.path.insert(0, __import__("os").path.dirname(__file__))
from playwright.async_api import async_playwright
import common
FEED={'feed':{'entry':[
 {'title':{'$t':'[그림 해설] 타로카드 7번 전차(The Chariot) 정방향·역방향 의미'},'link':[{'rel':'alternate','href':'https://fortune-lab.blogspot.com/2026/11/chariot.html'}],'category':[]},
 {'title':{'$t':'사주 십성(十星) 완벽 정리'},'link':[{'rel':'alternate','href':'https://fortune-lab.blogspot.com/2026/11/sipseong.html'}],'category':[{'term':'사주'}]},
 {'title':{'$t':'2027년 정미년(丁未年), 붉은 양의 해는 어떤 흐름일까?'},'link':[{'rel':'alternate','href':'https://fortune-lab.blogspot.com/2026/11/2027.html'}],'category':[]},
 {'title':{'$t':'<img src=x onerror=alert(1)>'},'link':[{'rel':'alternate','href':'https://evil.example.com/x'}],'category':[{'term':'사주'}]},
]}}
async def feed(route):
    cb=route.request.url.split('callback=')[1].split('&')[0]
    await route.fulfill(status=200, content_type='application/javascript', body=f'{cb}({json.dumps(FEED,ensure_ascii=False)});')
async def main():
    ok=True
    def chk(c,m):
        nonlocal ok; print(('PASS ' if c else 'FAIL ')+m); ok&=bool(c)
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':412,'height':900},locale='ko-KR',timezone_id='Asia/Seoul')
        await ctx.route('**/fortune-lab.blogspot.com/feeds/**', feed)
        await ctx.route('**/pagead2.googlesyndication.com/**', lambda r: r.abort())
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        me=common.ME
        await pg.add_init_script("(function(){if(sessionStorage.getItem('__i'))return;sessionStorage.setItem('__i','1');localStorage.setItem('p8bT_me',%s);})()"%json.dumps(json.dumps(me,ensure_ascii=False)))
        # 1) deep link to saju
        await pg.goto(common.BASE+'?go=saju&from=blog'); await pg.wait_for_timeout(2000)
        chk(await pg.evaluate("Hub.cur()")=='saju', 'go=saju 로 내 사주 화면 열림')
        chk('go=' not in pg.url and 'from=' not in pg.url, '주소에서 go·from 제거: '+pg.url)
        await pg.wait_for_timeout(800)
        links=await pg.eval_on_selector_all('.blogrel .bri','e=>e.map(a=>[a.textContent,a.href])')
        chk(any('십성' in t for t,_ in links), '사주 화면 관련 글 카드: '+str(links))
        chk(all('evil' not in h for _,h in links), '블로그 외 주소 차단')
        chk(await pg.eval_on_selector_all('.blogrel','e=>e.length')==1, '카드 1개만')
        # 2) newyear
        await pg.evaluate("Hub.go('newyear')"); await pg.wait_for_timeout(600)
        t=await pg.eval_on_selector_all('.blogrel .bri','e=>e.map(a=>a.textContent)')
        chk(any('정미년' in x for x in t), '신년운세 관련 글: '+str(t))
        # 3) home tile
        await pg.evaluate("Hub.go('home')"); await pg.wait_for_timeout(500)
        chk(await pg.locator('[data-item=blog]').count()==1, '홈에 블로그 항목')
        chk(await pg.locator('.blogrel').count()==0, '홈에는 관련 글 카드 없음')
        # 4) go=tarot without profile need
        await pg.goto(common.BASE+'?go=tarot'); await pg.wait_for_timeout(1800)
        chk(await pg.evaluate("Hub.cur()")=='tarot', 'go=tarot')
        t=await pg.eval_on_selector_all('.blogrel .bri','e=>e.map(a=>a.textContent)')
        chk(any('타로' in x for x in t), '타로 화면 관련 글: '+str(t))
        # 5) unknown go ignored
        await pg.goto(common.BASE+'?go=evil'); await pg.wait_for_timeout(1500)
        chk(await pg.evaluate("Hub.cur()")=='home', '모르는 go 값은 무시(홈)')
        chk(not errs, '페이지 오류 없음 '+str(errs[:3]))
        await pg.screenshot(path='/tmp/home.png')
        await pg.goto(common.BASE+'?go=saju'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelector('.blogrel').scrollIntoView()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/saju.png')
        await b.close()
    print('ALL OK' if ok else 'SOME FAILED')
asyncio.run(main())
