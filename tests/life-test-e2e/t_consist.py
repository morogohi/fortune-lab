import asyncio
from common import *
PROFS=[{'name':'가','date':'1991-06-15','cal':'s','time':'','sex':'m'},{'name':'나','date':'1985-02-03','cal':'s','time':'10:00','sex':'f'},{'name':'다','date':'1972-11-20','cal':'l','time':'','sex':'m'},{'name':'라','date':'2001-08-08','cal':'s','time':'23:10','sex':'f'}]
async def main():
  async with async_playwright() as pw:
    b,pg,logs = await newpage(pw)
    r = await pg.evaluate("""(P)=>{const out=[]; const syn=[['창업','창업한다','사업을 시작한다','개업한다'],['현재 회사 유지','지금 회사에 남는다','회사를 계속 다닌다']];
      for(const p of P){ const c=Counsel.ctxOf(p); 
        const base=Counsel.analyzeOpts(c,['현재 회사 유지','창업'],['자금은 부족하다']);
        const sw=Counsel.analyzeOpts(c,['창업','현재 회사 유지'],['자금은 부족하다']);
        const okSwap = base.L[0].base===sw.L[1].base && base.L[1].base===sw.L[0].base && base.pick===0 && sw.pick===1;
        const sb=syn[0].map(o=>Counsel.analyzeOpts(c,['현재 회사 유지',o],[]).L[1].base), ss=syn[1].map(o=>Counsel.analyzeOpts(c,[o,'창업'],[]).L[0].base);
        out.push({p:p.name, A:base.L[0].base, B:base.L[1].base, okSwap, synB:sb, synA:ss, okSyn:new Set(sb).size===1&&new Set(ss).size===1}); }
      return out}""", PROFS)
    for x in r: print(x)
    print('ALL OK' if all(x['okSwap'] and x['okSyn'] for x in r) else 'MISMATCH')
    await b.close()
asyncio.run(main())
