import asyncio, json, re
from common import *
from repro2b import chat, pick, Q
R=[]
def ok(name, cond, info=''):
    R.append((name, bool(cond))); print(('PASS' if cond else 'FAIL'), name, info[:300])
ME2={'name':'두번째','date':'1991-06-15','cal':'s','time':'','sex':'m'}
async def kar(pg): return await pg.evaluate("()=>karma")
async def main():
  async with async_playwright() as pw:
    # 예전 형식 기록이 있는 상태에서 시작 (업데이트 전 데이터 보존 확인)
    old_chat=[{'r':'u','t':'예전 질문','at':1,'cost':0},{'r':'a','t':'예전 답','src':'local','at':2}]
    old_hist=[{'t':1700000000000,'e':'💼','q':'예전 선택 상담','opts':['가','나'],'pick':'가','html':'<p>예전 결과</p>'}]
    b,pg,logs = await newpage(pw, karma=100, extra={'p8bT_counsel_chat':old_chat,'p8bT_counsel_hist':old_hist,'p8bT_counsel_free':1,'p8bT_profiles':[ME,ME2]})
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('chat')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    t = await pg.evaluate("()=>document.querySelector('#csLog').innerText")
    ok('예전 대화 기록 보존(업데이트 후 현재 프로필로 이전)', '예전 질문' in t)
    k0 = await kar(pg)
    # 확인 질문: 무과금
    await pg.fill('#csIn','A랑 B 중 뭐가 나을까요?'); await pg.click('#csSend'); await pg.wait_for_timeout(1200)
    ok('선택지를 모르면 확인 질문 + 차감 없음', await kar(pg)==k0, f'{k0}->{await kar(pg)}')
    # 첫 질문 (무료 이미 사용 → 3 차감)
    t1 = await chat(pg, Q); k1 = await kar(pg)
    ok('상담 1개 = 카르마 3 차감', k0-k1==3, f'{k0}->{k1}')
    # 후속 질문: 조건 하나만 바꿈
    t2 = await chat(pg, '그럼 자금은 이제 충분하다면 어떻게 달라지나요?'); 
    ok('후속 질문에서 선택지 유지', '선택 A: 현재 회사 유지' in t2 and '선택 B: 창업' in t2, t2[:200])
    cond = re.search(r'고려할 조건: (.*)', t2).group(1)
    ok('바꾼 조건만 갱신(자금 교체, 수입 유지)', '충분' in cond and '수입' in cond and '부족' not in cond and '어떻게' not in cond, cond)
    # 새 고민으로 전환: 이전 선택지 재사용 안 함
    t3 = await chat(pg, '요즘 만나는 사람과 결혼을 고민 중이에요. 어느 쪽이 나을까요?')
    ok('다른 고민으로 바뀌면 이전 선택지 재사용 안 함', '선택 A: 현재 회사 유지' not in t3 and ('선택지를 정확히 이해' in t3), t3[:200])
    # 중복 클릭: 한 번만 차감
    await pg.fill('#csIn', 'A는 이직, B는 지금 회사 유지입니다. 비교해 주세요.'); kb = await kar(pg)
    await pg.evaluate("()=>{const b=document.querySelector('#csSend'); b.click(); b.click(); b.click();}"); await pg.wait_for_timeout(1500)
    ok('보내기 연속 클릭 → 한 번만 차감', kb-await kar(pg)==3, f'{kb}->{await kar(pg)}')
    # 답변 실패 → 환불
    kb = await kar(pg); await pg.evaluate("()=>{window.__counselFail=1}")
    await chat(pg, 'A는 대학원 진학, B는 바로 취업입니다. 비교해 주세요.'); await pg.wait_for_timeout(500)
    ok('답을 못 만들면 차감 복구', await kar(pg)==kb, f'{kb}->{await kar(pg)}')
    await pg.evaluate("()=>{window.__counselFail=0}")
    # 선택 상담 실패 → 환불
    kb = await kar(pg); await pg.evaluate("()=>{window.__counselFail=1}")
    await pick(pg, '테스트', '창업', '현재 회사 유지'); await pg.wait_for_timeout(800)
    ok('선택 상담 실패 시 차감 복구', await kar(pg)==kb, f'{kb}->{await kar(pg)}')
    await pg.evaluate("()=>{window.__counselFail=0}")
    # 프로필 전환: 다른 사람의 대화·맥락이 보이지 않음
    tp1 = await pick(pg, Q, '현재 회사 유지', '창업')
    await pg.evaluate("""(p)=>{localStorage.setItem('p8b_me', JSON.stringify(p)); Hub.render()}""", ME2); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('chat')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    t = await pg.evaluate("()=>document.querySelector('#csLog').innerText")
    ok('프로필을 바꾸면 이전 사람의 대화가 안 보임', '현재 회사 유지' not in t and '예전 질문' not in t, t[:120])
    t4 = await chat(pg, '그럼 아까 그 두 가지 중 어느 쪽이 나아요?')
    ok('프로필을 바꾸면 이전 사람의 선택지를 재사용 안 함', '선택 A: 현재 회사 유지' not in t4 and '선택지를 정확히 이해' in t4, t4[:200])
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('pick')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    body = await pg.evaluate("()=>document.querySelector('#hubBody').innerText")
    ok('선택 상담 입력·결과도 프로필별', '“테스트 상황' not in body and '지난 선택 상담' not in body, body[:200])
    # 원래 프로필로 돌아오면 기록 그대로 + 지난 상담은 당시 기준으로
    await pg.evaluate("""(p)=>{localStorage.setItem('p8b_me', JSON.stringify(p)); Hub.render()}""", ME); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{localStorage.setItem('p8b_counsel_tab', JSON.stringify('pick')); Hub.go('counsel')}"); await pg.wait_for_timeout(500)
    if await pg.query_selector('#csNew2'): await pg.click('#csNew2'); await pg.wait_for_timeout(300)
    body = await pg.evaluate("()=>document.querySelector('#hubBody').innerText")
    ok('원래 프로필 지난 기록 보존(예전 기록 포함)', '예전 선택 상담' in body and '2027년 기준' in body, body[-400:])
    await pg.click('.cs-past'); await pg.wait_for_timeout(400)
    ov = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    ok('지난 상담을 열면 당시 프로필·기준 표시', '당시 프로필: 테스트' in ov and '해석 기준 2027년' in ov, ov[:200])
    print('\n'.join(l for l in logs if 'PAGEERR' in l))
    await b.close()
  print('RESULT', sum(1 for _,x in R if x), '/', len(R))
asyncio.run(main())
