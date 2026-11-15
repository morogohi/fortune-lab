import asyncio, json, re
from common import *
from repro2b import chat, pick, Q
R=[]
def ok(name, cond, info=''):
    R.append((name, bool(cond))); print(('PASS' if cond else 'FAIL'), name, info)
def scores(t, mode):
    if mode=='chat':
        m=re.search(r'기본 점수\(사주 흐름과 겹치는 정도\): (.*?) —', t); return m.group(1) if m else None
    m=re.findall(r'🔍 ([ABC]) · (.+?) (\d+)점', t); return ' · '.join(f'{a} {c}' for a,b,c in m)
def fields(t, mode):
    if mode=='chat':
        m=re.search(r'분야: (.*)', t); return m.group(1).strip() if m else None
    return ' · '.join(f'{a} {b.strip()}' for a,b in re.findall(r'\n([ABC])\n.+?\n\d+\n.*?\n?(.+?) 분야 ·', t))
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw, karma=100)
    # 1. 같은 입력 → 같은 기본 점수·분류
    tc = await chat(pg, Q); tp = await pick(pg, Q, '현재 회사 유지', '창업')
    sc_c, sc_p = scores(tc,'chat'), scores(tp,'pick')
    ok('대화·선택 상담 기본 점수 같음', sc_c and sc_c==sc_p, f'{sc_c} | {sc_p}')
    ok('분야 분류 같음(창업=독립·경쟁+보조 재물)', '독립·경쟁 (보조: 재물)' in tc and '독립·경쟁 (보조: 재물) 분야' in tp)
    # 2. 순서 바꾸기
    tp2 = await pick(pg, Q.replace('A는 현재 회사 유지, B는 창업','A는 창업, B는 현재 회사 유지'), '창업', '현재 회사 유지')
    s2 = dict((b_,a_) for a_,b_ in [x.split(' ') for x in scores(tp2,'pick').split(' · ')])
    s1 = dict((b_,a_) for a_,b_ in [x.split(' ') for x in sc_p.split(' · ')])
    m1 = dict(re.findall(r'🔍 [ABC] · (.+?) (\d+)점', tp)); m2 = dict(re.findall(r'🔍 [ABC] · (.+?) (\d+)점', tp2))
    ok('A·B 순서를 바꿔도 선택지별 점수 유지', m1==m2, f'{m1} | {m2}')
    # 3. 다시 실행해도 같은 결과(게임 포함)
    tp3 = await pick(pg, Q, '현재 회사 유지', '창업')
    g1 = re.findall(r'→ ([SABCD])등급 「(.+?)」', tp); g3 = re.findall(r'→ ([SABCD])등급 「(.+?)」', tp3)
    ok('다시 실행해도 같은 점수', scores(tp3,'pick')==sc_p)
    ok('다시 실행해도 같은 가상 인생 결과', g1==g3, f'{g1} | {g3}')
    # 4. 같은 뜻의 표현
    res = await pg.evaluate("""()=>{const c=Counsel.ctxOf(Hub.me());return ['창업','창업한다','사업을 시작한다','창업하기','개업한다'].map(o=>{const r=Counsel.analyzeOpts(c,[o,'현재 회사 유지'],[]);return [o,r.L[0].key,r.L[0].base,r.L[0].main,r.L[0].sub]})}""")
    ok('같은 뜻의 표현은 같은 개념·점수', len({(k,b_,m,s_) for _,k,b_,m,s_ in res})==1, str(res))
    # 5. 월별 모순 없음: 주의 달에 '움직이는 일은 이 달에' 권장 없음
    caution = re.search(r'조건을 점검할 달 (.+?)\n', tp).group(1)
    bad=[]
    for blk in re.findall(r'이 선택의 기운이 들어오는 달 — (.+?)\n', tp+tp2):
        ex = blk.split('들어와요')[0]
        for mth in caution.split('·'):
            if mth.strip() and mth.strip() in ex: bad.append((mth, blk))
    plan = re.search(r'4주차\n(.+?)\n', tp).group(1)
    ok('주의 달이 실행 권장 달에 없음', not bad, str(bad)+' caution='+caution)
    runp = re.findall(r'(\S+)에 작은 규모로 시작', plan)
    ok('4주 계획 실행 달 ≠ 주의 달', runp and all(m.strip() not in runp[0] for m in caution.split('·')), plan)
    # 6. 기준 연도 표시
    ok('2027년 기준 대운으로 표시(지금과 구분)', '2027년 기준으로는' in tc and '지금(2026년)' in tc)
    print('\n'.join(l for l in logs if 'PAGEERR' in l))
    await b.close()
  print('RESULT', sum(1 for _,x in R if x), '/', len(R))
asyncio.run(main())
