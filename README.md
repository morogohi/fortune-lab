# 운명 연구소 (Fortune Lab)

사주팔자·대운·세운·월운·토정비결·타로(78장)·별자리·MBTI를 한 화면에서 보고,
궁합과 적성·미래 직업, 생활 조건 맞춤 해설, **PDF 종합 보고서**까지 만드는 정적 웹앱입니다.

> 재미와 자기성찰을 위한 콘텐츠입니다. 중요한 결정의 근거로 쓰지 마세요.

## 개인정보 원칙
- 서버가 없는 정적 페이지입니다. 입력값은 브라우저 메모리에서만 계산됩니다.
- `localStorage`·쿠키·분석 도구를 쓰지 않으며, 입력값을 URL에 넣지 않습니다.
- 창을 닫거나 ‘입력 지우기’를 누르면 모두 사라집니다. PDF는 사용자가 직접 내려받을 때만 만들어집니다.

## 기능
| 탭 | 요약 | 상세 해설 |
|---|---|---|
| 사주풀이 | 일간 성격·연애·재물·건강, 신강/신약, 행운 오행, 십신 분포 | 기둥별(년·월·일·시) 십신 해설, 배우자궁, 오행별 해석, 신살 |
| 맞춤 해설 | 연령대·직업·거주 권역·가구·주거·관심사 맞춤 조언 | 생애 단계별 조언, 사주×생활 조건, 페르소나 비교 |
| 대운·세운 | 10년 대운, 올해 세운 분야별, 월운 12개월 | 대운별 해설, 상·하반기, 일지 합충, 월운 상세 |
| 토정비결 | 작괘, 총평, 월별 신수 | 괘 상세, 좋은 달·조심할 달, 월별 실천 팁 |
| 타로 | 1장 / 3장 / 5장 스프레드, 종합 리딩 | 그림 읽기, 정·역방향, 연애·일·재물, 예/아니오, 조언 |
| 별자리·MBTI | 성격·연애·일·행운, 4차원 해석 | 강점·약점·궁합 별자리, 인지기능 |
| 궁합 | 연인·직장·취미 점수 | 오행 보완표, 상호 십신, MBTI 차원 비교, 갈등 해법 |
| 적성·직업 | 일하는 방식, 추천 직업 | 오행별 업종, 커리어 상승기, 준비 로드맵 |

## 대한민국 페르소나 통계 연결 (선택)
[Persona-Survey-System](https://github.com/morogohi/Persona-Survey-System)이 참조하는
NVIDIA **Nemotron-Personas-Korea** 합성 페르소나 DB(`personas_db.db`)가 있는 PC에서 아래를 실행하면,
‘맞춤 해설’ 탭에 같은 **연령대 × 성별 × 권역** 페르소나의 직업·가구·학력·취미 분포가 표시됩니다.

```bash
python tools/build_persona_stats.py "C:/Project/Nemotro-Persons-Korea/database/personas_db.db"
git add js/persona-stats.js && git commit -m "페르소나 통계 갱신" && git push
```

- 개별 페르소나(이름·서사·ID)는 내보내지 않고 **비율만** 기록합니다.
- 200명 미만 세그먼트는 생략하고, 20명 미만 항목은 ‘기타’로 합칩니다.
- 합성 데이터이므로 실제 인구 통계가 아닙니다.

## 구조
```
index.html            깃허브 페이지용 문서 (build.py가 page.html로 생성)
page.html             본문 (Claude 아티팩트와 공유)
js/core.js            만세력 래퍼, 일간 그림, 기본 풀이 데이터
js/extra.js           상세 해설 데이터, 타로 78장
js/persona.js         생활 조건 맞춤 해설
js/persona-stats.js   페르소나 집계 통계 (선택)
js/app.js             화면, 타로, 공유 카드, PDF 보고서
cards/                타로 카드 이미지 78장
tools/                페르소나 통계 생성기
```
수정 후에는 `python build.py`로 `index.html`을 다시 만드세요.

## 사용한 자료와 라이선스
- 만세력: [lunar-javascript](https://github.com/6tail/lunar-javascript) (MIT)
- PDF: [html2canvas](https://html2canvas.hertzen.com/) (MIT), [jsPDF](https://github.com/parallax/jsPDF) (MIT)
- 타로 그림: 라이더-웨이트-스미스 타로(1909), 그림 파멜라 콜먼 스미스(1878–1951) · 퍼블릭 도메인.
  1909년 Pam-A 원판 스캔(Steve P. 복원, [steve-p.org](https://steve-p.org/cards/RWSa.html))을 웹용으로 축소했습니다.
- 페르소나: NVIDIA Nemotron-Personas-Korea (CC BY 4.0), 집계 통계만 사용
