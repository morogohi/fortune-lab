"""대한민국 합성 페르소나(Nemotron-Personas-Korea) DB → 운명 연구소용 집계 통계 생성기.

Persona-Survey-System 이 참조하는 personas_db.db(SQLite)를 읽기 전용으로 열어
'연령대 × 성별 × 권역' 세그먼트별 분포만 집계해 js/persona-stats.js 로 내보낸다.

개인정보 보호 원칙
- 개별 페르소나(이름·서사·ID)는 내보내지 않는다. 비율(%)만 기록한다.
- 세그먼트 표본이 MIN_SEG 미만이면 세그먼트 자체를 생략한다.
- 세그먼트 안에서 MIN_CELL 미만인 항목은 '기타'로 합친다.

사용법 (Persona-Survey-System 과 같은 PC에서)
    python tools/build_persona_stats.py "C:/Project/Nemotro-Persons-Korea/database/personas_db.db"
    → js/persona-stats.js 가 생성되며, 웹 페이지가 자동으로 읽어 맞춤 해설에 사용한다.
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

MIN_SEG = 200   # 세그먼트 최소 인원
MIN_CELL = 20   # 항목 최소 인원
TOP = 6

REGION = {  # 시도 → 권역
    "서울": "수도권", "경기": "수도권", "인천": "수도권",
    "대전": "충청권", "세종": "충청권", "충북": "충청권", "충남": "충청권", "충청북": "충청권", "충청남": "충청권",
    "광주": "호남권", "전북": "호남권", "전남": "호남권", "전라북": "호남권", "전라남": "호남권",
    "부산": "영남권", "대구": "영남권", "울산": "영남권", "경북": "영남권", "경남": "영남권", "경상북": "영남권", "경상남": "영남권",
    "강원": "강원·제주권", "제주": "강원·제주권",
}


def region_of(prov: str | None) -> str | None:
    if not prov:
        return None
    p = str(prov).strip()
    for k, v in REGION.items():
        if p.startswith(k):
            return v
    return None


def age_band(age) -> str | None:
    try:
        a = int(age)
    except (TypeError, ValueError):
        return None
    if a < 19:
        return None
    return "70대+" if a >= 70 else f"{max(20, a // 10 * 10)}대"


def sex_of(s) -> str | None:
    s = str(s or "")
    if s.startswith("남") or s.lower().startswith("m"):
        return "남"
    if s.startswith("여") or s.lower().startswith("f"):
        return "여"
    return None


SPLIT = re.compile(r"[,，·/;、]|\s및\s|\s그리고\s")


def keywords(text: str | None):
    if not text:
        return []
    out = []
    for t in SPLIT.split(str(text)):
        t = t.strip(" .\"'()[]")
        if 1 < len(t) <= 14:
            out.append(t)
    return out[:8]


def dist(counter: Counter, n: int):
    items, etc = [], 0
    for k, c in counter.most_common():
        if c >= MIN_CELL and len(items) < TOP:
            items.append([k, round(c * 100 / n, 1)])
        else:
            etc += c
    if etc and items:
        items.append(["기타", round(etc * 100 / n, 1)])
    return items


def main(db_path: str, out_path: str):
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    cols = lambda t: [r[1] for r in conn.execute(f"PRAGMA table_info({t})")]
    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    p, d, a = "personas", "demographic_context", "persona_attributes"
    pc = cols(p)
    want_p = [c for c in ["sex", "age", "marital_status", "education_level", "occupation", "region"] if c in pc]
    sel = [f"{p}.{c}" for c in want_p]
    joins = ""
    dc = cols(d) if d in tables else []
    ac = cols(a) if a in tables else []
    if "persona_id" in dc:
        joins += f" LEFT JOIN {d} ON {d}.persona_id={p}.id"
        sel += [f"{d}.{c}" for c in ["province", "population_density", "household_type"] if c in dc]
    if "persona_id" in ac:
        joins += f" LEFT JOIN {a} ON {a}.persona_id={p}.id"
        sel += [f"{a}.{c}" for c in ["hobbies_interests", "lifestyle_preferences"] if c in ac]
    names = [s.split(".")[1] for s in sel]
    q = f"SELECT {', '.join(sel)} FROM {p}{joins}"

    seg = defaultdict(lambda: {"n": 0, "occupation": Counter(), "education_level": Counter(), "household_type": Counter(),
                               "population_density": Counter(), "married": 0, "hobby": Counter(), "life": Counter()})
    total = 0
    for row in conn.execute(q):
        r = dict(zip(names, row))
        band, sx = age_band(r.get("age")), sex_of(r.get("sex"))
        rg = region_of(r.get("province") or r.get("region"))
        if not (band and sx and rg):
            continue
        total += 1
        for key in (f"{band}|{sx}|{rg}", f"{band}|{sx}|전국"):
            s = seg[key]
            s["n"] += 1
            for c in ["occupation", "education_level", "household_type", "population_density"]:
                if r.get(c):
                    s[c][str(r[c]).strip()] += 1
            if "배우자" in str(r.get("marital_status") or "") or "기혼" in str(r.get("marital_status") or ""):
                s["married"] += 1
            for k in set(keywords(r.get("hobbies_interests"))):
                s["hobby"][k] += 1
            for k in set(keywords(r.get("lifestyle_preferences"))):
                s["life"][k] += 1
    conn.close()

    out = {}
    for key, s in seg.items():
        n = s["n"]
        if n < MIN_SEG:
            continue
        out[key] = {"n": n,
                    "occupation": dist(s["occupation"], n), "education": dist(s["education_level"], n),
                    "household": dist(s["household_type"], n), "density": dist(s["population_density"], n),
                    "married": round(s["married"] * 100 / n, 1),
                    "hobby": dist(s["hobby"], n)[:TOP], "lifestyle": dist(s["life"], n)[:TOP]}
    payload = {"meta": {"source": "NVIDIA Nemotron-Personas-Korea (합성 페르소나, CC BY 4.0)", "total": total,
                        "segments": len(out), "built": date.today().isoformat(), "min_segment": MIN_SEG, "min_cell": MIN_CELL},
               "seg": out}
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text("/* 자동 생성: tools/build_persona_stats.py — 집계 비율만 포함, 개별 페르소나 없음 */\n"
                              "window.PERSONA_STATS=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
                              encoding="utf-8")
    print(f"총 {total:,}명 → 세그먼트 {len(out)}개 → {out_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    here = Path(__file__).resolve().parent.parent
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else str(here / "js" / "persona-stats.js"))
