import subprocess, re, sys, collections
from xml.etree import ElementTree as ET
def check(pdf):
    out={}
    fonts=subprocess.run(['pdffonts',pdf],capture_output=True,text=True).stdout
    out['fonts_embedded']=all(('yes' in l.split()[-5:-2][0] and l.split()[-3]=='yes') for l in fonts.splitlines() if l.startswith(('KSans','KSerif','KFull')))
    txt=subprocess.run(['pdftotext',pdf,'-'],capture_output=True,text=True).stdout
    out['chars']=len(txt)
    out['search']={w:(w in txt) for w in ['상담 요약','월별 상담','대운','테스트 님의','2027년 기준','움직이기 좋은 달']}
    xml=subprocess.run(['pdftotext','-bbox-layout',pdf,'-'],capture_output=True,text=True).stdout
    xml=re.sub(r'<!DOCTYPE[^>]*>','',xml).replace('xmlns="http://www.w3.org/1999/xhtml"','')
    root=ET.fromstring(xml)
    ov=[]; outside=[]
    for pi,pg in enumerate(root.iter('page')):
        H=float(pg.get('height'))
        lines=[]
        for ln in pg.iter('line'):
            x1,y1,x2,y2=[float(ln.get(k)) for k in ('xMin','yMin','xMax','yMax')]
            t=''.join(w.text or '' for w in ln.iter('word'))
            lines.append((x1,y1,x2,y2,t))
            if pi>0 and (y2 > H-30 and not re.fullmatch(r'\d+',t.strip())): outside.append((pi+1,t[:30],round(y2)))
        for i in range(len(lines)):
            for j in range(i+1,len(lines)):
                a,b=lines[i],lines[j]
                ix=min(a[2],b[2])-max(a[0],b[0]); iy=min(a[3],b[3])-max(a[1],b[1])
                if ix>2 and iy>3: ov.append((pi+1,a[4][:20],b[4][:20],round(iy,1)))
    out['overlaps']=ov[:10]; out['n_overlap']=len(ov); out['in_footer']=outside[:5]
    sents=[s.strip() for s in re.split(r'(?<=[.다요])\s+', txt.replace('\n',' ')) if len(s.strip())>25]
    c=collections.Counter(sents); out['dup_sentences']=[(s[:50],n) for s,n in c.items() if n>2][:12]
    return out, txt
if __name__=='__main__':
    for f in sys.argv[1:]:
        o,_=check(f); print(f); [print(' ',k,':',v) for k,v in o.items()]
