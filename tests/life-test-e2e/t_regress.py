import asyncio, json
from common import *
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:200])
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, karma=100)
    # 화면 순회
    errs=[]
    for k in ['home','saju','newyear','tojeong','counsel','compat','mbti','tarot','today','more']:
        try: await pg.evaluate(f"()=>Hub.go('{k}')"); await pg.wait_for_timeout(300)
        except Exception as e: errs.append((k,str(e)[:80]))
    ok('주요 화면 열기 오류 없음', not errs and not [l for l in logs if 'PAGEERR' in l], errs+[l for l in logs if 'PAGEERR' in l])
    me0 = await pg.evaluate("()=>localStorage.getItem('p8b_me')")
    # 새 프로필 → 미래 날짜 → 저장 거부 → 취소 → 기존 프로필 유지
    await pg.evaluate("()=>Hub.go('home')"); await pg.wait_for_timeout(300)
    await pg.click('#hmMe'); await pg.wait_for_timeout(300)
    await pg.click("#osheet .obtn:has-text('새로운 사람 입력')"); await pg.wait_for_timeout(400)
    await pg.evaluate("()=>{document.querySelector('#hName').value='미래'; document.querySelector('#hDate').value='2099-01-01'}")
    await pg.click('#hSave'); await pg.wait_for_timeout(300)
    err = await pg.evaluate("()=>document.querySelector('#hErr').textContent")
    ok('미래 생년월일 차단', err and '미래' in err or '오늘' in err, err)
    await pg.evaluate("()=>{document.querySelector('#hDate').value='1991-13-45'}")
    await pg.click('#hSave'); await pg.wait_for_timeout(300)
    ok('검증 실패 시 기존 프로필 유지', await pg.evaluate("()=>localStorage.getItem('p8b_me')")==me0)
    await pg.click('#hCancel'); await pg.wait_for_timeout(300)
    ok('신규 프로필 취소 시 기존 프로필 유지', await pg.evaluate("()=>localStorage.getItem('p8b_me')")==me0)
    # 한국 기준 날짜
    ok('한국 기준 날짜(KST.ymd)', await pg.evaluate("()=>KST.ymd(Date.UTC(2026,10,14,15,30))")=='2026-11-15')
    # 생년월일이 시간대 변환으로 바뀌지 않음 (LA 시간대 브라우저)
    ctx2 = await b.new_context(timezone_id='America/Los_Angeles', locale='ko-KR')
    p2 = await ctx2.new_page()
    await p2.add_init_script("localStorage.setItem('p8bT_me', JSON.stringify(%s))" % json.dumps({'name':'시간대','date':'1990-05-15','cal':'s','time':'','sex':'m'}))
    await p2.goto(BASE); await p2.wait_for_timeout(1200)
    r2 = await p2.evaluate("()=>{const a=Hub.analyze(Hub.me()); return [a.p.solar.y,a.p.solar.m,a.p.solar.d, a.pillarTxt.join(' ')]}")
    r1 = await pg.evaluate("()=>{const a=Hub.analyze({name:'x',date:'1990-05-15',cal:'s',time:'',sex:'m'}); return [a.p.solar.y,a.p.solar.m,a.p.solar.d, a.pillarTxt.join(' ')]}")
    ok('다른 시간대에서도 생년월일·명식 동일', r1==r2, f'{r1} | {r2}')
    await ctx2.close()
    # 광고 보상 +5 · 대기시간
    k0 = await pg.evaluate("()=>karma")
    await pg.evaluate("()=>Karma.adReward()")
    for i in range(20):
        await pg.wait_for_timeout(500)
        if await pg.evaluate("()=>karma") != k0: break
    k1 = await pg.evaluate("()=>karma")
    await pg.evaluate("()=>Karma.adReward()"); await pg.wait_for_timeout(1500)
    k2 = await pg.evaluate("()=>karma")
    ok('광고 보상 +5, 연속 시청은 대기시간으로 막힘', k1-k0==5 and k2==k1, f'{k0}->{k1}->{k2}')
    # 저장 게임 복원
    r = await pg.evaluate("()=>{try{const before=Object.keys(JSON.parse(localStorage.getItem('p8b_saves')||'{}')).length; return {ok:typeof Save.loadPack==='function', before}}catch(e){return {err:String(e)}}}")
    ok('저장 게임 API 유지', r.get('ok'), r)
    # 선택 상담 이전 상담권 이전 · 무료 1회 공통 설정
    free = await pg.evaluate("()=>[CounselPrice.per(), CounselPrice.free(), Counsel.credits()]")
    ok('상담 가격·무료 수 공통 설정', free[0]==3 and free[1]==1, free)
    print('\n'.join(l for l in logs if 'PAGEERR' in l))
    await b.close()
  print('RESULT', sum(R), '/', len(R))
asyncio.run(main())
