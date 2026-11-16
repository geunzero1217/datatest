// 사이트 설정
const CONFIG = {
  // Apps Script 웹 앱 주소. 비워 두면 브라우저 안 임시 저장소(테스트용)로 동작
  API_URL: 'https://script.google.com/macros/s/AKfycbyyY_g2M8fl3vRSZPBIyKXbZRRLN1QANkF_evqxLFutd38_NiylIs3eIunzuFwomltupg/exec',
  CODAP_URL: 'https://codap3.concord.org/',
  LEAVE_WARN: 3, // 이탈 주의 기준 횟수
  AUTOSAVE_SEC: 30,
};

// 내 컴퓨터(localhost)에서 열면 실제 시트 대신 테스트 모드
if (['localhost', '127.0.0.1'].includes(location.hostname)) CONFIG.API_URL = '';

const GRAPH_TYPES = ['점그래프', '막대그래프', '히스토그램', '상자그림', '산점도', '선그래프', '지도'];

// 그래프 종류 설명 (시작 전 안내, 작업 화면에서 다시 보기)
// 과제 데이터와 직접 연결되지 않게 일상 예시만 사용 (데이터 고르기, 만드는 법은 학생 몫)
const B = '#3182F6', G = '#D1D6DB';
const GRAPH_GUIDE = [
  { type: '점그래프', data: '수치 1개', use: '값 하나하나가 어디에 모여 있고 어떻게 퍼져 있는지 볼 때', ex: '우리 반 학생들의 하루 수면 시간',
    svg: `<line x1="6" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/>${[[14,1],[26,2],[38,4],[50,3],[62,2],[74,1],[86,1]].map(([x,n])=>Array.from({length:n},(_,i)=>`<circle cx="${x}" cy="${38-i*9}" r="4" fill="${B}"/>`).join('')).join('')}` },
  { type: '막대그래프', data: '범주 1개', use: '항목(범주)마다 개수나 크기를 비교할 때', ex: '좋아하는 급식 메뉴별 학생 수',
    svg: `<line x1="6" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><rect x="14" y="14" width="18" height="30" rx="2" fill="${B}"/><rect x="41" y="26" width="18" height="18" rx="2" fill="${B}"/><rect x="68" y="6" width="18" height="38" rx="2" fill="${B}"/>` },
  { type: '히스토그램', data: '수치 1개', use: '값을 일정한 구간으로 나눠 구간마다 얼마나 많은지 볼 때', ex: '전교생 키를 5cm 단위로 나눠 보기',
    svg: `<line x1="6" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/>${[12,22,34,26,16,8].map((h,i)=>`<rect x="${10+i*14}" y="${44-h}" width="13" height="${h}" fill="${B}"/>`).join('')}` },
  { type: '상자그림', data: '수치 1개 (그룹 비교 시 범주 추가)', use: '중앙값, 사분위수, 이상값으로 분포를 요약하거나 여러 그룹을 비교할 때', ex: '반별 수학 점수 비교',
    svg: `<line x1="12" y1="25" x2="30" y2="25" stroke="${B}" stroke-width="2"/><rect x="30" y="12" width="36" height="26" fill="#E8F3FF" stroke="${B}" stroke-width="2"/><line x1="46" y1="12" x2="46" y2="38" stroke="${B}" stroke-width="2"/><line x1="66" y1="25" x2="84" y2="25" stroke="${B}" stroke-width="2"/><circle cx="92" cy="25" r="3" fill="none" stroke="${B}" stroke-width="2"/>` },
  { type: '산점도', data: '수치 2개', use: '두 값 사이에 관계가 있는지 볼 때 (함께 커지나, 반대로 가나)', ex: '공부 시간과 시험 점수',
    svg: `<line x1="8" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><line x1="8" y1="4" x2="8" y2="44" stroke="${G}" stroke-width="2"/>${[[16,38],[24,34],[30,36],[38,28],[46,26],[52,20],[60,22],[68,14],[76,12],[86,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.5" fill="${B}"/>`).join('')}` },
  { type: '선그래프', data: '시간 + 수치', use: '시간이 흐르면서 값이 어떻게 변하는지 볼 때', ex: '한 달 동안 매일 아침 기온',
    svg: `<line x1="8" y1="44" x2="94" y2="44" stroke="${G}" stroke-width="2"/><polyline points="12,38 26,34 40,30 54,22 68,18 82,10 92,8" fill="none" stroke="${B}" stroke-width="2.5"/>${[[12,38],[26,34],[40,30],[54,22],[68,18],[82,10]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="${B}"/>`).join('')}` },
  { type: '지도', data: '위치 (위도, 경도)', use: '장소에 따라 값이 어떻게 다른지 볼 때 (위치 정보가 있는 데이터만 가능)', ex: '지역별 미세먼지 농도',
    svg: `<rect x="6" y="4" width="88" height="42" rx="4" fill="#F2F4F6"/><path d="M14 16 q8 -8 18 -2 q4 10 -6 14 q-8 2 -12 -12z M40 12 q12 -4 22 2 q-2 10 -12 8 q-8 0 -10 -10z M64 18 q14 -6 24 4 q-2 14 -14 12 q-10 -2 -10 -16z M36 30 q6 -2 8 6 q-4 8 -8 2z" fill="#D1D6DB"/><circle cx="24" cy="16" r="3" fill="${B}"/><circle cx="50" cy="14" r="3" fill="#F04452"/><circle cx="76" cy="22" r="3" fill="${B}"/><circle cx="40" cy="34" r="3" fill="#00A661"/>` },
];

const DATASETS = [
  { id: 'penguins', title: '남극펭귄', emoji: '🐧', rows: 333, desc: '펭귄 3종의 부리, 날개, 몸무게', cat: ['종', '섬', '성별'], num: ['부리 길이', '부리 깊이', '날개 길이', '몸무게'] },
  { id: 'gapminder', title: '출산율과 기대수명', emoji: '🌏', rows: 682, desc: '나라별 인구, 기대수명, 출산율 (1955~2005, 5년 간격)', cat: ['나라', '대륙'], num: ['연도', '인구', '기대수명', '출산율'] },
  { id: 'co2', title: '탄소배출과 에너지', emoji: '🏭', rows: 79, desc: '2022년 나라별 CO₂ 배출량과 재생에너지 비율', cat: ['나라', '대륙'], num: ['인구', '1인당 GDP', 'CO₂ 배출량', '1인당 CO₂', '재생에너지 비율', '위도', '경도'], map: true },
  { id: 'titanic', title: '타이타닉', emoji: '🚢', rows: 714, desc: '승객의 객실 등급, 나이, 요금, 생존 여부', cat: ['객실 등급', '성별', '생존 여부', '승선 항구'], num: ['나이', '요금', '동반 가족 수'] },
  { id: 'fastfood', title: '패스트푸드 영양', emoji: '🍔', rows: 514, desc: '브랜드별 메뉴의 열량과 영양 성분 (메뉴 이름은 분석 X)', cat: ['브랜드'], num: ['열량', '지방', '포화지방', '나트륨', '탄수화물', '당', '단백질'] },
  { id: 'songs', title: '인기 노래', emoji: '🎵', rows: 600, desc: '장르별 노래의 인기도, 에너지, 템포 (곡명은 분석 X)', cat: ['장르'], num: ['발매 연도', '인기도', '춤추기 좋은 정도', '에너지', '템포', '곡 길이'] },
];

const TEXT_FIELDS = [
  { key: 'q', label: '질문', hint: '이 그래프로 알아보려는 것' },
  { key: 'obs', label: '관찰', hint: '그래프에서 보이는 특징, 패턴' },
  { key: 'ev', label: '근거', hint: '관찰을 뒷받침하는 값, 모양, 비교' },
  { key: 'concl', label: '결론', hint: '질문에 대한 답과 알게 된 점' },
];
