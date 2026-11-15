import asyncio, json, re
from common import *
from repro2b import chat, pick
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:240])
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
ME2={'name':'두번째','date':'1985-02-03','cal':'s','time':'10:00','sex':'f'}
BAD=re.compile(r'(AI 답변|AI 상담사|서버 연결)')   # 로그인은 선택 기능으로 다시 생김 → AI 약속 문구만 금지
SAJU_SRV=re.compile(r'(생년월일|사주 정보)[^.。]{0,30}(서버로 보내요|계정에 저장)')
async def main():
  async with async_playwright() as pw:
    old_mt={'type':'ESTX','ax':[{'k':'EI','pick':'E'},{'k':'SN','pick':'S'},{'k':'TF','pick':'T'},{'k':'JP','pick':'X'}],'bal':1,'at':1700000000000}
    b,pg,logs = await newpage(pw, me=ME3, karma=100, extra={'p8bT_profiles':[ME3,ME2],'p8bT_mbti_test':old_mt,'p8bT_owned':{'pdf#1991-06-15|s||m|2027':{'t':1,'y':2027}},'p8bT_saves':{}})
    reqs=[]; pg.on('request', lambda r: reqs.append(r.url))
    # 1. 로그인 요소 없음
    ok('상단 로그인 버튼 = 선택 (로그인 안 해도 이용)', await pg.evaluate("()=>{const b=document.querySelector('#loginBtn');return !!b && b.className.includes('out')}"))
    await pg.click('#setBtn'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    ok('설정: 계정 항목은 로그인하지 않음 (선택)', '로그인하지 않음' in st and not BAD.search(st), st[:120])
    await pg.click("#sPriv"); await pg.wait_for_timeout(800)
    await pg.wait_for_function("()=>document.querySelector('#osheet').innerText.includes('개인정보 관리')", timeout=5000)
    pv = await pg.evaluate("()=>document.querySelector('#osheet').innerText")
    ok('개인정보 안내 = 기기 저장 + 로그인해도 사주 정보 안 보냄', '현재 기기·브라우저에 저장됩니다' in pv and '로그인해도 보내지 않아요' in pv and not BAD.search(pv), pv[:120])
    await pg.evaluate("()=>closeOverlay()")
    texts=[]
    for k in ['home','saju','newyear','tojeong','counsel','compat','mbti','tarot','today','more','shop','mbtitest']:
        try: await pg.evaluate(f"()=>Hub.go('{k}')"); await pg.wait_for_timeout(250); texts.append((k, await pg.evaluate("()=>document.body.innerText")))
        except Exception as e: texts.append((k,'ERR '+str(e)))
    bad=[(k,BAD.search(t).group(0)) for k,t in texts if BAD.search(t)]
    ok('주요 화면에 AI 약속 문구 없음 · 사주 정보 서버 저장 약속 없음', not bad and not [k for k,t in texts if SAJU_SRV.search(t)], bad)
    # 상담: AI 안내 없음, 기기 안 참고 상담 명시
    tc = await chat(pg, "A는 현재 회사 유지, B는 창업입니다. 자금은 부족하고 안정적인 수입이 중요합니다. 비교해 주세요.")
    body = await pg.evaluate("()=>document.querySelector('#hubBody').innerText")
    ok('대화 상담: 기기 안 참고용 상담 안내', '기기 안에서 정해진 규칙으로 계산하는 참고용 상담' in body and not BAD.search(body))
    tp = await pick(pg, "A는 현재 회사 유지, B는 창업입니다. 자금은 부족하고 안정적인 수입이 중요합니다.", '현재 회사 유지', '창업')
    ok('선택 상담: AI 준비 중 카드 없음', not BAD.search(tp) and not await pg.query_selector('#csAI'))
    m1 = dict(re.findall(r'🔍 [ABC] · (.+?) (\d+)점', tp))
    ok('1991 프로필 A 44 / B 70 유지', m1=={'현재 회사 유지':'44','창업':'70'}, m1)
    plan = re.search(r'4주차\n(.+?)\n', tp).group(1)
    ok('4주 계획: 대상 선택지 명시·창업 실행 달=창업 달', '선택 후 실행' in plan and 'B(창업)' in plan and '9월·12월에 작은 규모로 시작' in plan and '새로 시작하는 일이 아니에요' in plan, plan)
    ok('4주 계획에 회사 유지 달(2월·3월)을 창업 실행에 쓰지 않음', '2월·3월·12월' not in plan, plan)
    mline = re.findall(r'이 선택의 기운이 들어오는 달 — (.+?)\n', tp)
    ok('관련 달 있음/권장 실행 달 구분 문장', any('관련 기운은 6월·7월에 나타나지만' in x and '9월·12월을 참고' in x for x in mline) and not any('따로 드러나는 달은 없어요' in x and '관련 기운' in x for x in mline), mline)
    sc_chat = re.search(r'기본 점수\(사주 흐름과 겹치는 정도\): (.*?) —', tc).group(1)
    ok('대화·선택 상담 점수 일치', sc_chat=='A 44 · B 70', sc_chat)
    # 2. 성향 검사 프로필 연결
    mig = await pg.evaluate("()=>JSON.parse(localStorage.getItem('p8b_mbti_test'))")
    ok('예전 중립 검사 결과는 보존(legacy) · 현재 프로필에 연결 안 함', mig.get('__v')==2 and mig.get('legacy',{}).get('type')=='ESTX' and not mig.get('by'), mig)
    src = await pg.evaluate("()=>Counsel.ctxOf(Hub.me()).mbti.src")
    ok('검사 기록 없음으로 안내(중립 결과와 구분)', '실제 MBTI 기록이 없어요' in src, src)
    await pg.evaluate("""()=>MbtiTest.put(Hub.me(), {type:'ENTX', ax:[{pick:'E'},{pick:'N'},{pick:'T'},{pick:'X'}], bal:1, at:Date.now()})""")
    src = await pg.evaluate("()=>Counsel.ctxOf(Hub.me()).mbti.src")
    ok('이 프로필의 중립 결과는 중립으로 안내', '반반인 축이 1개' in src, src)
    src2 = await pg.evaluate("(p)=>Counsel.ctxOf(p).mbti.src", ME2)
    ok('다른 프로필은 이 검사 결과를 쓰지 않음', '실제 MBTI 기록이 없어요' in src2, src2)
    # 3. 홈 중첩 버튼 · 독립 클릭
    await pg.evaluate("()=>Hub.go('home')"); await pg.wait_for_timeout(300)
    ok('버튼 중첩 없음', await pg.evaluate("()=>document.querySelectorAll('button button').length===0"))
    await pg.click('#hhTarot'); await pg.wait_for_timeout(400)
    st = await pg.evaluate("()=>({ov:document.querySelector('#overlay').classList.contains('on'), box:!!document.querySelector('#osheet #hDTbox'), tab:Hub.cur()})")
    ok('무료 타로 클릭 → 타로만 열림(오늘의 운세 안 열림)', st['ov'] and st['box'] and st['tab']=='home', st)
    await pg.evaluate("()=>closeOverlay()"); await pg.wait_for_timeout(200)
    await pg.focus('#hhTarot'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
    k1 = await pg.evaluate("()=>({ov:document.querySelector('#overlay').classList.contains('on'), tab:Hub.cur()})")
    await pg.evaluate("()=>closeOverlay()"); await pg.wait_for_timeout(200)
    await pg.focus('.hh-main'); await pg.keyboard.press('Space'); await pg.wait_for_timeout(400)
    k2 = await pg.evaluate("()=>({ov:document.querySelector('#overlay').classList.contains('on'), tab:Hub.cur()})")
    ok('키보드: 타로 Enter / 오늘의 운세 Space 각각 동작', k1['ov'] and k1['tab']=='home' and (not k2['ov']) and k2['tab']=='today', f'{k1} {k2}')
    # 4. 카르마: 여러 탭 · 저장 실패 · 새로고침
    pg2 = await pg.context.new_page(); await pg2.goto(BASE); await pg2.wait_for_timeout(1200)
    kA = await pg.evaluate("()=>karma")
    await pg2.evaluate("()=>Karma.add(7,'다른 탭 테스트')"); await pg.wait_for_timeout(500)
    kB = await pg.evaluate("()=>karma")
    ok('다른 탭에서 바뀐 잔액을 따라감', kB==kA+7, f'{kA}->{kB}')
    await pg2.close()
    await pg.evaluate("""()=>{const o=Storage.prototype.setItem; window.__o=o; Storage.prototype.setItem=function(k,v){ if(/karma$/.test(k)) throw new Error('quota'); return o.call(this,k,v)}}""")
    kb = await pg.evaluate("()=>karma")
    await pg.evaluate("()=>Karma.spend(5,'🧪 저장 실패 테스트',()=>{window.__opened=1},()=>{})"); await pg.wait_for_timeout(300)
    await pg.click('#osheet .obtn.pri'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("()=>({k:karma, opened:!!window.__opened})")
    await pg.evaluate("()=>{Storage.prototype.setItem=window.__o}")
    ok('저장 실패 시 차감·열람 안 함', r['k']==kb and not r['opened'], r)
    # 중복 클릭
    kb = await pg.evaluate("()=>karma")
    await pg.evaluate("()=>Karma.spend(5,'🧪 중복 클릭',()=>{window.__n=(window.__n||0)+1},()=>{})"); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{const b=document.querySelector('#osheet .obtn.pri'); b.click(); b.click(); b.click();}"); await pg.wait_for_timeout(300)
    r = await pg.evaluate("()=>({k:karma, n:window.__n})")
    ok('확인 버튼 중복 클릭 → 한 번만 차감', r['k']==kb-5 and r['n']==1, r)
    # 게임 저장·이어하기
    await pg.evaluate("""()=>{newLife({birth:{cal:'s',y:1991,m:6,d:15,hh:12,mm:0,unk:true},male:true,country:'한국',cls:2,name:'저장테스트'}); beginLife(); window.__sv=Save.save('s1', true);}""")
    sv = await pg.evaluate("()=>({ok:window.__sv, keys:Object.keys(JSON.parse(localStorage.getItem('p8b_saves')||'{}'))})")
    kr = await pg.evaluate("()=>karma")
    await pg.reload(); await pg.wait_for_timeout(1500)
    after = await pg.evaluate("()=>({k:karma, own:Object.keys(JSON.parse(localStorage.getItem('p8b_owned')||'{}')), saves:Object.keys(JSON.parse(localStorage.getItem('p8b_saves')||'{}')), me:JSON.parse(localStorage.getItem('p8b_me')).name})")
    ok('새로고침 후 잔액·구매 권한·저장 슬롯·프로필 유지', after['k']==kr and 'pdf#1991-06-15|s||m|2027' in after['own'] and 's1' in after['saves'] and after['me']=='테스트', f'{sv} {after}')
    await pg.evaluate("()=>{Save.load('s1')}"); await pg.wait_for_timeout(500)
    g = await pg.evaluate("()=>({name:P&&P.name, alive:P&&P.alive})")
    ok('게임 이어하기(저장 슬롯 불러오기)', g['name']=='저장테스트' and g['alive'], g)
    # 5. 외부 인증 요청 없음
    ext=[u for u in reqs if not u.startswith('http://localhost') and not u.startswith('data:') and not u.startswith('blob:')]
    ok('로그인·동기화 네트워크 요청 없음', not any(re.search(r'supabase|kakao|accounts\.google|/auth/',u) for u in ext), ext[:5])
    print([l for l in logs if 'PAGEERR' in l])
    await b.close()
  print('RESULT', sum(R), '/', len(R))
asyncio.run(main())
