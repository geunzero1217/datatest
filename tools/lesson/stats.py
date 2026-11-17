import csv, sys, os, statistics as st
from collections import Counter, defaultdict
d = sys.argv[1]
sys.stdout.reconfigure(encoding='utf-8')
def rows(n):
    with open(os.path.join(d, n + '.csv'), encoding='utf-8') as f: return list(csv.DictReader(f))
def q(v):
    v = sorted(v); n = len(v)
    def p(x):
        k = (n - 1) * x; f = int(k); c = min(f + 1, n - 1); return v[f] + (v[c] - v[f]) * (k - f)
    return round(min(v),2), round(p(.25),2), round(p(.5),2), round(p(.75),2), round(max(v),2)

t = rows('tips'); print('1 tips day counts', Counter(r['요일'] for r in t), 'time by day', Counter((r['요일'], r['시간대']) for r in t))
m = rows('mpg'); km = [float(r['연비(km/L)']) for r in m]
bins = Counter(int(x // 2) * 2 for x in km); print('2 mpg n', len(km), 'min/med/mean/max', min(km), st.median(km), round(st.mean(km),1), max(km), 'bins(2)', sorted(bins.items()))
for o in ['미국','일본','유럽']: print('   ', o, round(st.median(float(r['연비(km/L)']) for r in m if r['제조 지역']==o),1))
ir = rows('iris')
for s in ['세토사','버시컬러','버지니카']: print('3 iris', s, q([float(r['꽃잎 길이(cm)']) for r in ir if r['종']==s]))
h = rows('healthexp'); by = defaultdict(list)
for r in h: by[r['나라']].append((int(r['연도(년)']), float(r['1인당 의료비(달러)']), float(r['기대수명(세)'])))
for k, v in by.items(): v.sort(); print('4 health', k, 'first', v[0], 'last', v[-1], 'n', len(v))
fl = rows('flights'); yr = defaultdict(list)
for r in fl: yr[int(r['연도(년)'])].append((int(r['월']), int(r['승객 수(천 명)'])))
for y in (1949, 1955, 1960): v = dict(yr[y]); print('5 flights', y, 'total', sum(v.values()), 'min', min(v.items(), key=lambda x: x[1]), 'max', max(v.items(), key=lambda x: x[1]))
print('   peak months per year', Counter(max(dict(yr[y]).items(), key=lambda x: x[1])[0] for y in yr))
qk = rows('quakes'); print('6 quakes n', len(qk), 'mag', q([float(r['규모']) for r in qk]), 'top', sorted(((float(r['규모']), r['지역(영문)'], r['월']) for r in qk), reverse=True)[:4])
lon = [float(r['경도']) for r in qk]; lat = [float(r['위도']) for r in qk]
print('   pacific-ish (lon>100 or lon<-60):', sum(1 for a in lon if a > 100 or a < -60), 'of', len(lon), 'regions', Counter(r['지역(영문)'] for r in qk).most_common(8))
