// 사이트 설정
const CONFIG = {
  // Apps Script 웹 앱 주소. 비워 두면 브라우저 안 임시 저장소(테스트용)로 동작
  API_URL: 'https://script.google.com/macros/s/AKfycbyyY_g2M8fl3vRSZPBIyKXbZRRLN1QANkF_evqxLFutd38_NiylIs3eIunzuFwomltupg/exec',
  CODAP_URL: 'https://codap3.concord.org/',
  LEAVE_WARN: 3, // 이탈 주의 기준 횟수
  AUTOSAVE_SEC: 30,
};

const GRAPH_TYPES = ['점그래프', '막대그래프', '히스토그램', '상자그림', '산점도', '선그래프', '지도'];

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
