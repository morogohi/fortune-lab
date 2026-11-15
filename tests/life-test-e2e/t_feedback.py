import asyncio, re
from common import *
from t_pdf import gen
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:260])
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, me=ME3, karma=500)
    # 1. 리포트 미리보기 중간까지 스크롤 → 화면 꺼짐/켜짐
    await pg.evaluate("()=>{window.__pdfNoDownload=1; PdfReport.open(Hub.me())}"); await pg.wait_for_timeout(500)
    for _ in range(3):
        btn = await pg.query_selector('#overlay.on .obtn.pri')
        if not btn: break
        await btn.click(); await pg.wait_for_timeout(500)
    await pg.wait_for_selector('#pdfMake')
    await pg.evaluate("()=>{document.querySelector('#hubBody').scrollTop=4200}"); await pg.wait_for_timeout(200)
    y0 = await pg.evaluate("()=>document.querySelector('#hubBody').scrollTop")
    for hidden in [True, False]:
        await pg.evaluate("(h)=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h}); Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>h?'hidden':'visible'}); document.dispatchEvent(new Event('visibilitychange'))}", hidden)
        await pg.wait_for_timeout(400)
    y1 = await pg.evaluate("()=>document.querySelector('#hubBody').scrollTop")
    ok('화면 껐다 켜도 리포트 보던 위치 유지', y0>3000 and abs(y1-y0)<5, f'{y0}->{y1}')
    # 다른 탭에서 카르마가 바뀐 상태로 돌아와도 위치 유지
    await pg.evaluate("()=>localStorage.setItem('p8b_karma', JSON.stringify(karma+3))")
    await pg.evaluate("()=>{document.dispatchEvent(new Event('visibilitychange'))}"); await pg.wait_for_timeout(500)
    y2 = await pg.evaluate("()=>document.querySelector('#hubBody').scrollTop")
    k = await pg.evaluate("()=>karma")
    ok('잔액이 바뀌어 다시 그려도 위치 유지', abs(y2-y0)<5, f'{y0}->{y2} karma {k}')
    # 2. 사주 MBTI 안내 · 실제 MBTI 사용
    await pg.evaluate("()=>{Views.leave(); Hub.go('home'); Fun.openMbti(0)}"); await pg.wait_for_timeout(500)
    ov = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    ok('사주 MBTI = 타고난 기질 경향 안내', '타고난 기질의 경향' in ov and '사주풀이가 틀렸다는 뜻은 아니에요' in ov, '')
    sm = await pg.evaluate("()=>Fun.mbti(Hub.analyze(Hub.me())).type")
    real = 'INFJ' if sm!='INFJ' else 'ESTP'
    await pg.select_option('#fReal', real); await pg.wait_for_timeout(400)
    c = await pg.evaluate("()=>{const c=Counsel.ctxOf(Hub.me()); return [c.mbti.type, c.mbti.src, c.mbti.sure]}")
    ok('실제 MBTI를 고르면 상담은 실제 MBTI 기준', c[0]==real and c[2] and '직접 고른 실제 MBTI' in c[1] and sm in c[1], c)
    secs = await pg.evaluate("()=>{const s=PdfReport.sections(Hub.me(),{appendix:false}); const x=s.find(v=>/성격 유형/.test(v.t)); const d=document.createElement('div'); d.innerHTML=x.html; return d.innerText}")
    ok('리포트 성격 유형 장에 실제 MBTI 비교 포함', f'실제 {real}' in secs.replace('\n',' ') and '보는 대상이 달라' in secs, secs[:200])
    yf = await pg.evaluate("()=>{const d=document.createElement('div'); d.innerHTML=YearFull.parts(Hub.me(),Hub.analyze(Hub.me())).y_guide; return d.innerText}")
    ok('신년 MBTI 전략도 실제 MBTI 기준', f'· {real}' in yf and '직접 고른 실제 MBTI' in yf, yf[:160])
    print([l for l in logs if 'PAGEERR' in l])
    await b.close()
  print('RESULT', sum(R), '/', len(R))
asyncio.run(main())
