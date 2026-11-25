// 수행평가 테스트(연습) 사이트 설정 : ../js/config.js 다음에 불러와서 덮어씀
CONFIG.API_URL = 'https://script.google.com/macros/s/AKfycbzrwW11Tc83_DS5jnBq8nWQlakx3-XuobeWwMs-6YkMS3frxFDb1YsikrZngOUK2Cnxgw/exec';
CONFIG.KEY = 'pa-test';
CONFIG.MAX_SLOTS = 8;
CONFIG.FREE_SLOTS = true;
CONFIG.TITLE_SUFFIX = ' (수행평가 테스트)';
if (['localhost', '127.0.0.1'].includes(location.hostname)) CONFIG.API_URL = '';

// 연습용 데이터 6개 (수행평가 데이터와 구조가 비슷한 다른 주제)
DATASETS.splice(0, DATASETS.length,
  { id: 'iris', title: '붓꽃', rows: 150, desc: '붓꽃 3종의 꽃잎, 꽃받침 길이와 너비', cat: ['종'], num: ['꽃받침 길이', '꽃받침 너비', '꽃잎 길이', '꽃잎 너비'] },
  { id: 'healthexp', title: '의료비와 기대수명', rows: 274, desc: '6개 나라의 1인당 의료비와 기대수명 (1970~2020)', cat: ['나라'], num: ['연도', '1인당 의료비', '기대수명'] },
  { id: 'quakes', title: '2023년 큰 지진', rows: 147, desc: '2023년에 일어난 규모 6 이상 지진의 위치와 깊이', cat: ['지역(영문)'], num: ['월', '규모', '깊이', 'lat(위도)', 'long(경도)'], map: true },
  { id: 'tips', title: '식당 팁', rows: 244, desc: '한 식당 손님들의 요일, 시간대, 계산 금액, 팁', cat: ['요일', '시간대', '성별', '흡연 여부'], num: ['총 금액', '팁', '인원'] },
  { id: 'mpg', title: '자동차 연비', rows: 398, desc: '1970~1982년 자동차의 연비, 마력, 무게 (차 이름은 분석 X)', cat: ['제조 지역'], num: ['연식', '실린더', '연비', '마력', '무게', '가속 시간'] },
  { id: 'flights', title: '항공 승객', rows: 144, desc: '1949~1960년 한 항공사의 달마다 승객 수', cat: [], num: ['연도', '월', '시점', '승객 수'] },
);
