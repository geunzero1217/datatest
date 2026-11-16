// 서버 호출. CONFIG.API_URL이 비어 있으면 브라우저 안 임시 저장소(테스트용) 사용
const LocalStore = (() => {
  const KEY = 'pa-local-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  let db = load() || { students: {}, answers: {}, logs: [], settings: {} };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('임시 저장 실패', e); } };
  const pad = n => String(n).padStart(2, '0');
  // 테스트 모드용 동기 SHA-256
  function sha256(ascii) {
    const bytes = new TextEncoder().encode(ascii);
    const K = [], H = [];
    let n = 2, c = 0;
    const frac = x => ((x - Math.floor(x)) * 4294967296) | 0;
    while (c < 64) { let p = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; } if (p) { if (c < 8) H[c] = frac(Math.pow(n, 1 / 2)); K[c++] = frac(Math.pow(n, 1 / 3)); } n++; }
    const l = bytes.length, words = [];
    const padded = new Uint8Array(((l + 9 + 63) >> 6) << 6); padded.set(bytes); padded[l] = 0x80;
    const bits = l * 8; padded[padded.length - 4] = bits >>> 24; padded[padded.length - 3] = bits >>> 16; padded[padded.length - 2] = bits >>> 8; padded[padded.length - 1] = bits;
    for (let i = 0; i < padded.length; i += 4) words.push((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]);
    const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let j = 0; j < words.length; j += 16) {
      const w = words.slice(j, j + 16); let [a, b, cc, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        if (i >= 16) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & cc) ^ (b & cc))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = cc; cc = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, cc, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }
  return {
    hash: s => sha256('local-test-pepper:' + s),
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
