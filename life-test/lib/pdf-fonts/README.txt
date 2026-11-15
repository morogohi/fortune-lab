PDF 보고서용 한글 글꼴 (SIL Open Font License 1.1 — LICENSE-OFL.txt)
- Noto Sans KR 400/700, Noto Serif KR 700 (Google, OFL)
- *-ks.ttf : KS X 1001 한글 2,350자 + 영문·숫자·기호·명식 한자만 남긴 부분 집합 (PDF 만들 때만 불러옴)
- NotoSansKR-400-full.ttf : 한글 11,172자 전체 — 이름 등에 부분 집합에 없는 글자가 있을 때만 불러옴
만든 방법: pyftsubset (fonttools) --no-hinting --layout-features='' (GSUB/GPOS 없음)
