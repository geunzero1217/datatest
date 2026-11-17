// 사이트 설정
const CONFIG = {
  // Apps Script 웹 앱 주소. 비워 두면 브라우저 안 임시 저장소(테스트용)로 동작
  API_URL: 'https://script.google.com/macros/s/AKfycbxpijRseNzEtjTiFMsoNiBC7JhVqlzZivsHncXsHZyp6GCihZ5Vz3AClaAQXqjrAYct/exec',
  CODAP_URL: 'https://codap3.concord.org/',
  LEAVE_WARN: 3, // 이탈 주의 기준 횟수
  AUTOSAVE_SEC: 30,
  TITLE_SUFFIX: '', // 테스트 사이트는 ' (수행평가 테스트)'
  KEY: 'pa', // 브라우저 저장 이름 (테스트 사이트는 'pa-test')
};

// 내 컴퓨터(localhost)에서 열면 실제 시트 대신 테스트 모드
if (['localhost', '127.0.0.1'].includes(location.hostname)) CONFIG.API_URL = '';

const GRAPH_TYPES = ['막대그래프', '히스토그램', '상자그림', '산점도', '선그래프', '지도'];

// 그래프 종류 설명 (시작 전 안내, 작업 화면에서 다시 보기)
// 과제 데이터와 직접 연결되지 않게 일상 예시만 사용 (데이터 고르기, 만드는 법은 학생 몫)
const B = '#3182F6', G = '#B0B8C1';
const GRAPH_GUIDE = [
  { type: '막대그래프', data: '범주 1개', use: '항목(범주)마다 개수나 크기를 비교할 때', ex: '좋아하는 급식 메뉴별 학생 수',
    svg: `<line x1="6" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><rect x="14" y="14" width="18" height="30" rx="2" fill="${B}"/><rect x="41" y="26" width="18" height="18" rx="2" fill="${B}"/><rect x="68" y="6" width="18" height="38" rx="2" fill="${B}"/>` },
  { type: '히스토그램', data: '수치 1개', use: '값을 일정한 구간으로 나눠 구간마다 얼마나 많은지 볼 때', ex: '전교생 키를 5cm 단위로 나눠 보기',
    svg: `<line x1="6" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/>${[12,22,34,26,16,8].map((h,i)=>`<rect x="${10+i*14}" y="${44-h}" width="13" height="${h}" fill="${B}"/>`).join('')}` },
  { type: '상자그림', data: '수치 1개 (그룹 비교 시 범주 추가)', use: '중앙값, 사분위수, 이상값으로 분포를 요약하거나 여러 그룹을 비교할 때', ex: '반별 수학 점수 비교',
    svg: `<line x1="12" y1="25" x2="30" y2="25" stroke="${B}" stroke-width="2"/><rect x="30" y="12" width="36" height="26" fill="#fff" stroke="${B}" stroke-width="2"/><line x1="46" y1="12" x2="46" y2="38" stroke="${B}" stroke-width="2"/><line x1="66" y1="25" x2="84" y2="25" stroke="${B}" stroke-width="2"/><circle cx="92" cy="25" r="3" fill="none" stroke="${B}" stroke-width="2"/>` },
  { type: '산점도', data: '수치 2개', use: '두 값 사이에 관계가 있는지 볼 때 (함께 커지나, 반대로 가나)', ex: '공부 시간과 시험 점수',
    svg: `<line x1="8" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><line x1="8" y1="4" x2="8" y2="44" stroke="${G}" stroke-width="2"/>${[[16,38],[24,34],[30,36],[38,28],[46,26],[52,20],[60,22],[68,14],[76,12],[86,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.5" fill="${B}"/>`).join('')}` },
  { type: '선그래프', data: '시간 + 수치', use: '시간이 흐르면서 값이 어떻게 변하는지 볼 때', ex: '한 달 동안 매일 아침 기온',
    svg: `<line x1="8" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><polyline points="12,38 26,34 40,30 54,22 68,18 82,10 92,8" fill="none" stroke="${B}" stroke-width="2.5"/>${[[12,38],[26,34],[40,30],[54,22],[68,18],[82,10]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="${B}"/>`).join('')}` },
  { type: '지도', data: '위치 (위도, 경도)', use: '장소에 따라 값이 어떻게 다른지 볼 때 (위치 정보가 있는 데이터만 가능)', ex: '지역별 미세먼지 농도',
    svg: `<path d="M12 9 L37 5 L37 43 L12 47 Z" fill="#fff"/><path d="M37 5 L63 9 L63 47 L37 43 Z" fill="#E5E8EB"/><path d="M63 9 L88 5 L88 43 L63 47 Z" fill="#fff"/>
      <circle cx="24" cy="20" r="5" fill="${B}" opacity=".75"/><circle cx="29" cy="34" r="3" fill="${B}" opacity=".75"/>
      <circle cx="47" cy="30" r="7" fill="#F04452" opacity=".75"/><circle cx="75" cy="18" r="4" fill="#00A661" opacity=".8"/><circle cx="77" cy="34" r="6" fill="${B}" opacity=".75"/>
      <path d="M55 22 C55 22 49 15.5 49 11.5 a6 6 0 0 1 12 0 C61 15.5 55 22 55 22 Z" fill="#191F28"/><circle cx="55" cy="11.5" r="2.2" fill="#fff"/>` },
];

const DATASETS = [
  { id: 'penguins', title: '남극펭귄', rows: 333, desc: '펭귄 3종의 부리, 날개, 몸무게', cat: ['종', '섬', '성별'], num: ['부리 길이', '부리 깊이', '날개 길이', '몸무게'] },
  { id: 'gapminder', title: '출산율과 기대수명', rows: 682, desc: '나라별 인구, 기대수명, 출산율 (1955~2005, 5년 간격)', cat: ['나라', '대륙'], num: ['연도', '인구', '기대수명', '출산율'] },
  { id: 'co2', title: '탄소배출과 에너지', rows: 79, desc: '2022년 나라별 CO₂ 배출량과 재생에너지 비율', cat: ['나라', '대륙'], num: ['인구', '1인당 GDP', 'CO₂ 배출량', '1인당 CO₂', '재생에너지 비율', 'lat(위도)', 'long(경도)'], map: true },
  { id: 'titanic', title: '타이타닉', rows: 714, desc: '승객의 객실 등급, 나이, 요금, 생존 여부', cat: ['객실 등급', '성별', '생존 여부', '승선 항구'], num: ['나이', '요금', '동반 가족 수'] },
  { id: 'fastfood', title: '패스트푸드 영양', rows: 514, desc: '브랜드별 메뉴의 열량과 영양 성분 (메뉴 이름은 분석 X)', cat: ['브랜드'], num: ['열량', '지방', '포화지방', '나트륨', '탄수화물', '당', '단백질'] },
  { id: 'songs', title: '인기 노래', rows: 600, desc: '장르별 노래의 인기도, 에너지, 템포 (곡명은 분석 X)', cat: ['장르'], num: ['발매 연도', '인기도', '춤추기 좋은 정도', '에너지', '템포', '곡 길이'] },
];

const TEXT_FIELDS = [
  { key: 'q', label: '질문', hint: '이 그래프로 알아보려는 것' },
  { key: 'obs', label: '관찰', hint: '그래프에서 보이는 특징, 패턴' },
  { key: 'ev', label: '근거', hint: '관찰을 뒷받침하는 값, 모양, 비교' },
  { key: 'concl', label: '결론', hint: '질문에 대한 답과 알게 된 점' },
];
