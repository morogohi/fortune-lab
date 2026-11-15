import asyncio, re, subprocess
from common import *
from t_pdf import ME3, PART, gen
R=[]
def ok(n,c,i=''): R.append(c); print('PASS' if c else 'FAIL', n, i)
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, me=ME3, karma=500, extra={'p8bT_people':PART})
    k0 = await pg.evaluate("()=>karma")
    # 실패 → 다시 시도
    await pg.evaluate("()=>{window.__pdfFail=1}")
    await gen(pg, False, '/tmp/x.pdf')
    m = await pg.evaluate("()=>document.querySelector('#pdfMsg').textContent")
    k1 = await pg.evaluate("()=>karma")
    own = await pg.evaluate("()=>!!Views.ownOf('pdf', Views.subj(Hub.me()))")
    ok('생성 실패 시 안내 + 구매 권한 유지', '다시 시도' in m and own, m)
    refund = await pg.query_selector('#pdfRefund')
    ok('한 번도 못 만들면 환불 버튼 제공', refund is not None)
    await pg.evaluate("()=>{window.__pdfFail=0}")
    await pg.click('#pdfMake')
    for i in range(60):
        await pg.wait_for_timeout(300)
        if await pg.evaluate("()=>!!window.__pdfData"): break
    k2 = await pg.evaluate("()=>karma")
    ok('재시도 성공 · 추가 차감 없음', k2==k1 and k0-k1==40, f'{k0}->{k1}->{k2}')
    # 같은 프로필·연도 다시 열기 무료
    await pg.evaluate("()=>{window.__pdfData=null; Views.leave(); Hub.go('saju')}")
    await gen(pg, False, '/tmp/y.pdf'); k3 = await pg.evaluate("()=>karma")
    ok('구매 보고서 무료 재열람', k3==k2, f'{k2}->{k3}')
    # 다른 연도 키 분리 확인
    ids = await pg.evaluate("()=>Object.keys(JSON.parse(localStorage.getItem('p8b_owned')||'{}'))")
    ok('구매 권한 = 상품·프로필·대상 연도', any(re.search(r'^pdf#1991-06-15\|s\|\|m\|2027$',x) for x in ids), str(ids))
    # 미리보기 간격
    gap = await pg.evaluate("""()=>{const b=document.querySelector('.pdf-info b'); if(!b) return null; const r=b.getBoundingClientRect(); const t=b.nextSibling; const rg=document.createRange(); rg.setStart(t,0); rg.setEnd(t,1); return rg.getBoundingClientRect().left - r.right}""")
    ok('미리보기 항목·값 간격', gap is not None and gap >= 4, str(gap))
    await b.close()
  # 표 머리글 반복
  txt = subprocess.run(['pdftotext','-layout','report_noapp.pdf','-'],capture_output=True,text=True).stdout.split('\f')
  heads = [i+1 for i,p in enumerate(txt) if re.search(r'^\s*시기\s+대운\s+기운', p, re.M)]
  ok('대운 표가 다음 쪽으로 이어질 때 머리글 반복', len(heads)>=2, str(heads))
  print('RESULT', sum(R), '/', len(R))
asyncio.run(main())
