// 사이트 설정
const CONFIG = {
  // Apps Script 웹 앱 주소. 비워 두면 브라우저 안 임시 저장소(테스트용)로 동작
  API_URL: 'https://script.google.com/macros/s/AKfycbwSHkd-e-E_pgdVc8F8eCPWaIem-qlEniUdEtPOGPo69FMHnNieO9uXequIFzXaJiQzhw/exec',
  KEY: 'aic', // 브라우저 저장 이름
  AUTOSAVE_SEC: 3, // 입력을 멈추고 몇 초 뒤 서버에 저장할지
};

// 내 컴퓨터(localhost)에서 열면 실제 시트 대신 테스트 모드
if (['localhost', '127.0.0.1'].includes(location.hostname)) CONFIG.API_URL = '';
