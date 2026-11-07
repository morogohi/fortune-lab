"""life/index.html → life-test/index.html (상업용 테스트 페이지).

자산(js·폰트·리포트)은 <base href="../life/">로 시범판과 같은 파일을 쓰고,
window.P8B_MODE='commercial' 한 줄로 상품 구성만 바꾼다 (행운패스 제외 · 웹 무료 개방 없음 · 구매 의향 조사).
life/index.html을 고친 뒤에는 이 스크립트를 다시 실행하세요:  python3 tools/make_life_test.py
"""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = (root / "life/index.html").read_text(encoding="utf-8")
CS = '<meta charset="UTF-8">'
inject = (CS + '\n<!-- 자동 생성 파일: tools/make_life_test.py 로 만듦. 직접 고치지 마세요. -->\n<base href="../life/">\n'
          '<meta name="robots" content="noindex,nofollow">\n' "<script>window.P8B_MODE='commercial';</script>")
assert src.count(CS) == 1 and "<title>" in src
out = src.replace(CS, inject, 1)
out = out.replace("<title>운명 연구소 · 프로젝트 80억</title>", "<title>[상업용 테스트] 운명 연구소 · 프로젝트 80억</title>", 1)
(root / "life-test").mkdir(exist_ok=True)
(root / "life-test/index.html").write_text(out, encoding="utf-8")
print("life-test/index.html 생성")
