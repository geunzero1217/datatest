# 연습용 데이터 전처리 : 한글 속성명, 미터 단위
import csv, sys, os, re

raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def read(name):
    with open(os.path.join(raw, name), encoding='utf-8') as f:
        return list(csv.DictReader(f))

def write(name, head, rows):
    with open(os.path.join(out, name), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(head)
        w.writerows(rows)
    print(name, len(rows), 'rows')

def r(x, n=1):
    v = round(float(x), n)
    return int(v) if v == int(v) else v

# 1 붓꽃 (펭귄 대응)
sp = {'setosa': '세토사', 'versicolor': '버시컬러', 'virginica': '버지니카'}
write('iris.csv', ['종', '꽃받침 길이(cm)', '꽃받침 너비(cm)', '꽃잎 길이(cm)', '꽃잎 너비(cm)'],
      [[sp[d['species']], d['sepal_length'], d['sepal_width'], d['petal_length'], d['petal_width']] for d in read('iris.csv')])

# 2 의료비와 기대수명 (출산율과 기대수명 대응)
cn = {'Germany': '독일', 'France': '프랑스', 'Great Britain': '영국', 'Japan': '일본', 'USA': '미국', 'Canada': '캐나다'}
rows = [[cn.get(d['Country'], d['Country']), d['Year'], r(d['Spending_USD'], 0), r(d['Life_Expectancy'], 1)] for d in read('healthexp.csv')]
write('healthexp.csv', ['나라', '연도(년)', '1인당 의료비(달러)', '기대수명(세)'], rows)

# 3 식당 팁 (타이타닉 대응)
day = {'Thur': '목', 'Fri': '금', 'Sat': '토', 'Sun': '일'}
write('tips.csv', ['요일', '시간대', '성별', '흡연 여부', '총 금액(달러)', '팁(달러)', '인원(명)'],
      [[day[d['day']], {'Lunch': '점심', 'Dinner': '저녁'}[d['time']], {'Male': '남자', 'Female': '여자'}[d['sex']],
        {'Yes': '흡연', 'No': '비흡연'}[d['smoker']], d['total_bill'], d['tip'], d['size']] for d in read('tips.csv')])

# 4 자동차 연비 (패스트푸드 대응) : mpg → km/L, 파운드 → kg
og = {'usa': '미국', 'japan': '일본', 'europe': '유럽'}
write('mpg.csv', ['제조 지역', '차 이름', '연식(년)', '실린더(개)', '연비(km/L)', '마력', '무게(kg)', '가속 시간(초)'],
      [[og[d['origin']], d['name'], 1900 + int(d['model_year']), d['cylinders'], r(float(d['mpg']) * 0.425144, 1),
        r(d['horsepower'], 0) if d['horsepower'] not in ('', 'NA') else '', r(float(d['weight']) * 0.453592, 0), d['acceleration']] for d in read('mpg.csv')])

# 5 항공 승객 (선그래프) : 월 이름 → 숫자, 시점 = 연도 + (월-1)/12
mo = {m: i + 1 for i, m in enumerate(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'])}
mo.update({k[:3]: v for k, v in list(mo.items())})
write('flights.csv', ['연도(년)', '월', '시점(년)', '승객 수(천 명)'],
      [[d['year'], mo[d['month']], round(int(d['year']) + (mo[d['month']] - 1) / 12, 2), d['passengers']] for d in read('flights.csv')])

# 6 지진 (지도) : 지역은 USGS 표기 그대로(영문)
rows = []
for d in read('quakes.csv'):
    if d['type'] != 'earthquake':
        continue
    place = d['place'].split(', ')[-1] if ', ' in d['place'] else re.sub(r'^.*? of ', '', d['place'])
    rows.append([int(d['time'][5:7]), place, r(d['mag'], 1), r(d['depth'], 0), r(d['latitude'], 2), r(d['longitude'], 2)])
write('quakes.csv', ['월', '지역(영문)', '규모', '깊이(km)', '위도', '경도'], rows)
