import asyncio, json
from common import *
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL', n, str(i)[:200])
ME3={'name':'테스트','date':'1991-06-15','cal':'s','time':'','sex':'m'}
SRV={'gs':{}, 'claims':set(), 'calls':[], 'uid':'u1'}
def rpc(name, a):
    SRV['calls'].append((name, a)); uid=SRV['uid']; g=SRV['gs']
    if name=='link_device':
        r=g.get(uid); k=max(0,min(100000,a['p_karma']))
        if r: r['karma']=max(r['karma'],k); r['lives']=max(r['lives'],a['p_lives']); r['unlocks'].update(a['p_unlocks'] or {})
        else: g[uid]=r={'user_id':uid,'karma':k,'lives':a['p_lives'],'unlocks':dict(a['p_unlocks'] or {})}
        return {'data':r,'error':None}
    if name=='sync_state':
        r=g.get(uid)
        if not r: return {'data':None,'error':{'message':'not linked'}}
        r['karma']=max(0,min(100000,r['karma']+a['p_delta'])); r['lives']=max(r['lives'],a['p_lives']); r['unlocks'].update(a['p_unlocks'] or {})
        return {'data':r,'error':None}
    if name=='claim_signup_bonus':
        if ('sub:'+uid) in SRV['claims'] or not (0<a['p_amount']<=100): return {'data':False,'error':None}
        SRV['claims'].add('sub:'+uid); g[uid]['karma']+=a['p_amount']; return {'data':True,'error':None}
    if name=='delete_my_account':
        g.pop(uid,None); return {'data':None,'error':None}
MOCK="""window.supabase={createClient:function(){let session=JSON.parse(localStorage.getItem('__ms')||'null');const cbs=[];return{auth:{onAuthStateChange(f){cbs.push(f)},async getSession(){return{data:{session}}},async signInWithOAuth({provider}){session={user:{id:(await window.__uid()),app_metadata:{provider},user_metadata:{name:'홍길동',avatar_url:'https://x/a.png'}}};localStorage.setItem('__ms',JSON.stringify(session));setTimeout(()=>cbs.forEach(f=>f('SIGNED_IN',session)),50);return{error:null}},async signOut(){session=null;localStorage.removeItem('__ms');cbs.forEach(f=>f('SIGNED_OUT',null))}},async rpc(n,a){return await window.__rpc(n,a||{})}}}};"""
CFG="window.AUTH_CONFIG={supabaseUrl:'https://mock.supabase.co',supabaseAnonKey:'anon',providers:['kakao','google']};"
async def dev(pw, karma, cfg=True):
    b,pg,logs = await newpage(pw, me=ME3, karma=karma, extra={'p8bT_events':{'newyear2027':1}}) if False else (None,None,None)
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':412,'height':900}, locale='ko-KR', timezone_id='Asia/Seoul')
    await ctx.expose_function('__rpc', rpc); await ctx.expose_function('__uid', lambda: SRV['uid'])
    pg = await ctx.new_page(); logs=[]; pg.on('pageerror', lambda e: logs.append('PAGEERR: '+str(e)))
    net=[]; pg.on('request', lambda r: net.append(r.url) if 'supabase' in r.url else None)
    init={'p8bT_me':ME3,'p8bT_karma':karma,'p8bT_profiles':[ME3],'p8bT_events':{'newyear2027':1}}
    await pg.add_init_script("(function(){if(sessionStorage.getItem('__init'))return;sessionStorage.setItem('__init','1');var d=%s;for(var k in d)localStorage.setItem(k,JSON.stringify(d[k]));})()" % json.dumps(init, ensure_ascii=False))
    if not cfg:
        await pg.route('**/auth-config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body="window.AUTH_CONFIG={supabaseUrl:'',supabaseAnonKey:''};"))
    if cfg:
        await pg.add_init_script(MOCK)
        await pg.route('**/auth-config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=CFG))
    await pg.goto(BASE); await pg.wait_for_timeout(1500)
    return b,pg,logs,net
async def main():
  async with async_playwright() as pw:
    # 0. 설정 비어 있음: 버튼 준비 중 · 통신 없음
    b,pg,logs,net = await dev(pw, 200, cfg=False)
    await pg.click('#loginBtn'); await pg.wait_for_timeout(300)
    t = await pg.evaluate("()=>({dis:document.querySelector('#lgKakao').disabled && document.querySelector('#lgGoogle').disabled, txt:document.querySelector('#osheet').innerText})")
    ok('설정 전: 로그인 버튼 준비 중·서버 통신 없음', t['dis'] and '준비' in t['txt'] and not net and not await pg.evaluate("()=>!!window.supabase"), net)
    ok('버튼 중첩 없음', await pg.evaluate("()=>document.querySelectorAll('button button').length===0"))
    await b.close()
    # 1. 기기 A 로그인: 연결 + 가입 보너스
    bA,A,logsA,_ = await dev(pw, 200)
    k0 = await A.evaluate("()=>karma")
    await A.click('#loginBtn'); await A.wait_for_timeout(200); await A.click('#lgKakao'); await A.wait_for_timeout(1500)
    r = await A.evaluate("()=>({u:Auth.name(), k:karma, top:document.querySelector('#loginBtn').className})")
    ok('카카오 로그인 → 상단 표시', r['u']=='홍길동' and 'in' in r['top'] and 'kakao' in r['top'], r)
    ok('첫 연결 + 가입 보너스 100 (서버 계산)', SRV['gs']['u1']['karma']==k0+100 and r['k']==k0+100, (k0, SRV['gs']['u1'], r))
    sent = json.dumps(SRV['calls'], ensure_ascii=False)
    ok('서버로 사주 정보 안 보냄', '1991' not in sent and '테스트' not in sent, sent[:150])
    # 2. 카르마 변화 자동 반영
    await A.evaluate("()=>Karma.add(20,'테스트 지급')"); await A.wait_for_timeout(2300)
    ok('카르마 받기 → 1.5초 뒤 계정 반영', SRV['gs']['u1']['karma']==k0+120, SRV['gs']['u1']['karma'])
    # 3. 기기 B: 로컬 150 → 큰 값, 보너스 중복 없음
    bB,B,logsB,_ = await dev(pw, 150)
    await B.click('#loginBtn'); await B.wait_for_timeout(200); await B.click('#lgKakao'); await B.wait_for_timeout(1500)
    kb = await B.evaluate("()=>karma")
    ok('두 번째 기기: 계정 잔액으로 이어짐 · 보너스 중복 없음', kb==k0+120 and SRV['gs']['u1']['karma']==k0+120, (kb, SRV['gs']['u1']['karma']))
    # 4. B에서 30 쓰고, A가 맞추면 같아짐 (중복 지급 없음)
    await B.evaluate("()=>{karma-=30; saveMeta();}"); await B.wait_for_timeout(2300)
    await A.evaluate("()=>Auth.sync()"); await A.wait_for_timeout(300)
    ka = await A.evaluate("()=>karma")
    ok('B에서 쓴 만큼 A에도 반영 (잔액 일치)', ka==k0+90 and SRV['gs']['u1']['karma']==k0+90, (ka, SRV['gs']['u1']['karma']))
    # 동시 변화: A +10, B +5 → 서버 = 합산
    await A.evaluate("()=>Karma.add(10,'a')"); await B.evaluate("()=>Karma.add(5,'b')"); await A.wait_for_timeout(2300)
    await A.evaluate("()=>Auth.sync()"); await B.evaluate("()=>Auth.sync()")
    r2 = await asyncio.gather(A.evaluate("()=>karma"), B.evaluate("()=>karma"))
    ok('두 기기에서 동시에 받아도 합산', SRV['gs']['u1']['karma']==k0+105 and r2==[k0+105,k0+105], (SRV['gs']['u1']['karma'], r2))
    # 5. 연 콘텐츠 합집합
    await A.evaluate("()=>{localStorage.setItem('p8b_unlocks', JSON.stringify({report:1})); Store.notify();}"); await A.wait_for_timeout(2300)
    await B.evaluate("()=>Auth.sync()")
    ub = await B.evaluate("()=>JSON.parse(localStorage.getItem('p8b_unlocks')||'{}')")
    ok('연 콘텐츠가 다른 기기로 복원', 'report' in ub, ub)
    # 6. 계정 화면 · 로그아웃 · 탈퇴
    await A.click('#loginBtn'); await A.wait_for_timeout(300)
    acc = await A.evaluate("()=>document.querySelector('#osheet').innerText")
    ok('내 계정 화면', '홍길동' in acc and '회원 탈퇴' in acc and '로그아웃' in acc, acc[:80])
    await A.evaluate("()=>closeOverlay(true)"); await A.wait_for_timeout(300)
    kl = await B.evaluate("()=>karma")
    await B.evaluate("()=>Auth.logout()"); await B.wait_for_timeout(300)
    r3 = await B.evaluate("()=>({u:Auth.user(), k:karma, top:document.querySelector('#loginBtn').className})")
    ok('로그아웃해도 기기 카르마 유지', r3['u'] is None and r3['k']==kl and 'out' in r3['top'], r3)
    okd = await A.evaluate("()=>Auth.deleteAccount()")
    ka2 = await A.evaluate("()=>({u:Auth.user(),k:karma,link:localStorage.getItem('p8b_klink')})")
    ok('탈퇴: 서버 기록 삭제 · 기기 카르마 유지', okd and 'u1' not in SRV['gs'] and ka2['u'] is None and ka2['k']==k0+105 and ka2['link'] is None, ka2)
    # 재가입: 보너스 없음
    await A.click('#loginBtn'); await A.wait_for_timeout(200); await A.click('#lgKakao'); await A.wait_for_timeout(1500)
    ok('재가입해도 보너스 다시 안 줌', SRV['gs']['u1']['karma']==k0+105, SRV['gs']['u1'])
    # 7. 같은 기기에서 다른 계정으로 바꿔 로그인: 기기 잔액을 새 계정에 복사하지 않음
    await A.evaluate("()=>Auth.logout()"); await A.wait_for_timeout(300)
    SRV['uid']='u2'
    await A.click('#loginBtn'); await A.wait_for_timeout(200); await A.click('#lgGoogle'); await A.wait_for_timeout(1500)
    r7 = await A.evaluate("()=>karma")
    ok('계정 바꿔 로그인: 새 계정은 보너스만 (이전 계정 잔액 복사 없음)', SRV['gs']['u2']['karma']==100 and r7==100 and SRV['gs']['u1']['karma']==k0+105, (SRV['gs']['u2'], r7, SRV['gs']['u1']['karma']))
    print([l for l in logsA+logsB if 'PAGEERR' in l][:5]); await bA.close(); await bB.close()
  print('RESULT', sum(R),'/',len(R))
asyncio.run(main())
