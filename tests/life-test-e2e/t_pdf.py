import asyncio, json, re, base64, sys, time
from common import *
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
PART=[{'name':'김하나','date':'1993-03-02','cal':'s','time':'','sex':'f','rel':'love'}]
PART3=PART+[{'name':'박둘','date':'1965-11-20','cal':'s','time':'','sex':'f','rel':'family'},{'name':'이셋','date':'1995-01-09','cal':'s','time':'08:30','sex':'m','rel':'friend'}]
async def gen(pg, appendix, out):
    await pg.evaluate("()=>{window.__pdfNoDownload=1; window.__pdfKeep=1}")
    await pg.evaluate("()=>PdfReport.open(Hub.me())"); await pg.wait_for_timeout(600)
    # 결제 안내 → 카르마로 열기 → 확인
    for _ in range(3):
        btn = await pg.query_selector('#overlay.on .obtn.pri')
        if not btn: break
        await btn.click(); await pg.wait_for_timeout(600)
    await pg.wait_for_selector('#pdfMake', timeout=10000)
    if appendix:
        await pg.check('#pdfApp'); await pg.wait_for_timeout(500)
    t0=time.time()
    await pg.click('#pdfMake')
    for i in range(240):
        await pg.wait_for_timeout(500)
        d = await pg.evaluate("()=>window.__pdfData || /못했어요/.test((document.querySelector('#pdfMsg')||{}).textContent||'') ? 1 : 0")
        if d: break
    info = await pg.evaluate("()=>({lp: window.__lastPdf, msg: (document.querySelector('#pdfMsg')||{}).textContent})")
    data = await pg.evaluate("()=>{const d=window.__pdfData; window.__pdfData=null; return d}")
    if data:
        open(out,'wb').write(base64.b64decode(data.split(',')[1]))
    print(out, info, round(time.time()-t0,1),'s')
    return info
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, me=ME3, karma=500, extra={'p8bT_people':PART3,'p8bT_profiles':[ME3]})
    k0 = await pg.evaluate("()=>karma")
    i1 = await gen(pg, False, './report_noapp.pdf')
    k1 = await pg.evaluate("()=>karma")
    i2 = await gen(pg, True, './report_app.pdf')
    k2 = await pg.evaluate("()=>karma")
    print('karma', k0, k1, k2)
    print('\n'.join(l for l in logs if 'PAGEERR' in l or 'pdf' in l.lower())[:3000])
    await b.close()
asyncio.run(main())
