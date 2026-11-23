// 서버 호출. CONFIG.API_URL이 비어 있으면 브라우저 안 임시 저장소(테스트용) 사용
const LocalStore = (() => {
  const KEY = CONFIG.KEY + '-local-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  let db = load() || { students: {}, answers: {}, records: {}, settings: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('임시 저장 실패', e); } };
  const pad = n => String(n).padStart(2, '0');
  const copy = o => o ? JSON.parse(JSON.stringify(o)) : null;
  // 테스트 모드용 간단 해시 (실제 서버는 SHA-256 + 비밀 값)
  const hash = s => { let h1 = 0x811c9dc5, h2 = 0x1234567; for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ s.charCodeAt(i), 2246822507); } return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16); };
  return {
    hash: s => hash('local-test:' + s),
    reload() { db = load() || db; },
    now() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; },
    getStudent: id => copy(db.students[id]),
    putStudent: s => { db.students[s.id] = copy(s); save(); },
    listStudents: () => Object.values(db.students).map(copy),
    deleteStudent: id => { delete db.students[id]; delete db.answers[id]; delete db.records[id]; save(); },
    getAnswer: id => copy(db.answers[id]),
    putAnswer: a => { db.answers[a.id] = copy(a); save(); },
    listAnswers: () => Object.values(db.answers).map(copy),
    getRecord: id => copy(db.records[id]),
    putRecord: r => { db.records[r.id] = copy(r); save(); },
    listRecords: () => Object.values(db.records).map(copy),
    getSetting: k => db.settings[k],
    setSetting: (k, v) => { db.settings[k] = v; save(); },
    // callAI 없음 : 테스트 모드에서는 프롬프트 복사 방식
  };
})();
const LocalServer = makeServer(LocalStore, '1234');

// 구글 서버가 가끔 응답 없이 멈추는 경우가 있어서 일정 시간 뒤 끊고 다시 보냄
// 다시 보내도 결과가 같은 요청만 재시도 (비밀번호 초기화, AI 생성은 제외)
const RETRY_SAFE = ['login', 'save', 'submit', 'adminLogin', 'adminList', 'adminDetail', 'adminSetLock', 'adminUnsubmit', 'adminAddStudents', 'adminDeleteStudents', 'adminSetGuide', 'adminPrompt', 'adminSaveRecord', 'adminSetStar'];
const TIMEOUTS = [12000, 20000, 30000];
const LONG = { adminGenerate: 120000 }; // AI 생성은 오래 걸림

const API = {
  isLocal: !CONFIG.API_URL,
  async call(action, data = {}, onRetry) {
    const req = Object.assign({ action }, data);
    if (!CONFIG.API_URL) {
      LocalStore.reload();
      await new Promise(r => setTimeout(r, 120));
      return JSON.parse(JSON.stringify(LocalServer.handle(req)));
    }
    const tries = RETRY_SAFE.includes(action) ? TIMEOUTS.length : 1;
    for (let i = 0; i < tries; i++) {
      if (i > 0 && onRetry) onRetry(i);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), LONG[action] || TIMEOUTS[i]);
      try {
        // text/plain으로 보내야 Apps Script에서 CORS 사전 요청이 생기지 않음
        const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(req), signal: ctrl.signal, cache: 'no-store' });
        const text = await res.text();
        clearTimeout(timer);
        try { return JSON.parse(text); } catch (e) { /* 구글 오류 페이지면 다시 시도 */ }
      } catch (e) {
        clearTimeout(timer);
      }
    }
    return { ok: false, error: '서버 응답 없음, 잠시 후 다시 시도', network: true };
  },
};
