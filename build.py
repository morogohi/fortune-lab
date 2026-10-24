"""page.html(아티팩트용 본문) → index.html(깃허브 페이지용 완전한 문서)."""
from pathlib import Path
here=Path(__file__).parent
body=(here/"page.html").read_text(encoding="utf-8")
head='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="사주·토정비결·타로·별자리·MBTI를 한 번에 보는 운명 연구소. 입력 정보는 저장되지 않습니다.">\n<meta name="robots" content="index,follow">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
(here/"index.html").write_text(head+body+"\n</body>\n</html>\n",encoding="utf-8")
print("index.html built")
