"""life/index.html → life-test/index.html (상업용 테스트 페이지).

자산(js·폰트·리포트)은 <base href="../life/">로 시범판과 같은 파일을 쓰고,
window.P8B_MODE='commercial' 한 줄로 상품 구성만 바꾼다 (행운패스 제외 · 웹 무료 개방 없음 · 구매 의향 조사).
life/index.html을 고친 뒤에는 이 스크립트를 다시 실행하세요:  python3 tools/make_life_test.py

  --snapshot : 테스트 페이지만 먼저 게시할 때. life/js 와 privacy.html 을 life-test/ 에 복사하고
               스크립트 경로를 그 사본으로 바꿔, 운영 웹(life/)을 바꾸지 않고 새 코드를 시험한다.
               (폰트·이미지·lib 은 계속 life/ 공용) — 운영에 합친 뒤에는 옵션 없이 다시 실행해 사본을 지운다.
"""
import shutil, sys, re
from pathlib import Path
# 테스트 페이지 전용 저장 공간: 같은 사이트의 일반 페이지(life)와 카르마·해제 권한·프로필이 섞이지 않게
# 앱 저장 키 'p8b_…'를 이 페이지에서만 'p8bT_…'로 바꿔 저장한다 (일반 페이지 데이터는 건드리지 않음)
NS_SHIM = (
    "<script>(function(){var NS='p8bT_',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem,k=S.key;"
    "function m(st,key){return st===window.localStorage&&typeof key==='string'&&key.indexOf('p8b_')===0?NS+key.slice(4):key}"
    "S.getItem=function(key){return g.call(this,m(this,key))};S.setItem=function(key,v){return s.call(this,m(this,key),v)};"
    "S.removeItem=function(key){return r.call(this,m(this,key))};"
    "S.key=function(i){var x=k.call(this,i);return this===window.localStorage&&x&&x.indexOf(NS)===0?'p8b_'+x.slice(NS.length):(this===window.localStorage&&x&&x.indexOf('p8b_')===0?'__life__'+x:x)};"
    "window.P8B_NS=NS;})();</script>")
root = Path(__file__).resolve().parent.parent
src = (root / "life/index.html").read_text(encoding="utf-8")
CS = '<meta charset="UTF-8">'
inject = (CS + '\n<!-- 자동 생성 파일: tools/make_life_test.py 로 만듦. 직접 고치지 마세요. -->\n<base href="../life/">\n'
          '<meta name="robots" content="noindex,nofollow">\n' "<script>window.P8B_MODE='commercial';</script>\n" + NS_SHIM)
assert src.count(CS) == 1 and "<title>" in src
out = src.replace(CS, inject, 1)
out = out.replace("<title>운명 연구소 · 프로젝트 80억</title>", "<title>[상업용 테스트] 운명 연구소 · 프로젝트 80억</title>", 1)
(root / "life-test").mkdir(exist_ok=True)
snap = "--snapshot" in sys.argv
for d in ("js", "lib"):
    t = root / "life-test" / d
    if t.exists(): shutil.rmtree(t)
if (root / "life-test/privacy.html").exists() and not snap: (root / "life-test/privacy.html").unlink()
if snap:
    shutil.copytree(root / "life/js", root / "life-test/js")
    # PDF 도구처럼 스크립트가 필요할 때 불러오는 lib 은 life-test/lib 사본에서 (pdfreport.js 는 자기 위치 기준 ../lib/)
    shutil.copytree(root / "life/lib", root / "life-test/lib", ignore=shutil.ignore_patterns("lunar.js", "supabase.js", "LICENSE-lunar.txt"))
    shutil.copy2(root / "life/privacy.html", root / "life-test/privacy.html")
    n = len(re.findall(r'<script src="js/', out))
    out = out.replace('<script src="js/', '<script src="../life-test/js/').replace('<a href="privacy.html">', '<a href="../life-test/privacy.html">')
    out = out.replace("<!-- 자동 생성 파일:", "<!-- 스냅숏: 새 코드는 life-test/js 사본 사용 (운영 life/ 와 다를 수 있음) · 자동 생성 파일:", 1)
    print(f"스냅숏: life/js → life-test/js ({n}개 스크립트 경로 변경), privacy.html 복사")
(root / "life-test/index.html").write_text(out, encoding="utf-8")
print("life-test/index.html 생성")
