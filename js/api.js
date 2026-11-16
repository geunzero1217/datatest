// 서버 호출. CONFIG.API_URL이 비어 있으면 브라우저 안 임시 저장소(테스트용) 사용
const LocalStore = (() => {
  const KEY = 'pa-local-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  let db = load() || { students: {}, answers: {}, logs: [], settings: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('임시 저장 실패', e); } };
  const pad = n => String(n).padStart(2, '0');
  return {
    reload() { db = load() || db; },
    now() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; },
    getStudent: id => db.students[id] ? Object.assign({}, db.students[id]) : null,
    putStudent: s => { db.students[s.id] = Object.assign({}, s); save(); },
    listStudents: () => Object.values(db.students).map(s => Object.assign({}, s)),
    getAnswers: id => Object.values(db.answers).filter(a => a.id === id).map(a => Object.assign({}, a)),
    putAnswer: a => { db.answers[a.id + '_' + a.slot] = Object.assign({}, a); save(); },
    listAnswers: () => Object.values(db.answers).map(a => Object.assign({}, a)),
    addLogs: rows => { db.logs.push(...rows); save(); },
    getLogs: id => db.logs.filter(l => l.id === id).map(l => Object.assign({}, l)),
    getSetting: k => db.settings[k],
    setSetting: (k, v) => { db.settings[k] = v; save(); },
  };
})();
const LocalServer = makeServer(LocalStore, '1234');

const API = {
  isLocal: !CONFIG.API_URL,
  async call(action, data = {}) {
    const req = Object.assign({ action }, data);
    if (!CONFIG.API_URL) {
      LocalStore.reload();
      await new Promise(r => setTimeout(r, 120));
      return JSON.parse(JSON.stringify(LocalServer.handle(req)));
    }
    try {
      // text/plain으로 보내야 Apps Script에서 CORS 사전 요청이 생기지 않음
      const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(req) });
      return await res.json();
    } catch (e) {
      return { ok: false, error: '서버 연결 실패, 인터넷 확인 후 다시 시도', network: true };
    }
  },
};
