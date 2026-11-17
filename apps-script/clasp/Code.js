/**
 * 데이터 분석 수행평가 : 구글 시트 저장소 (Apps Script 웹 앱)
 * 이 파일 전체를 Apps Script 편집기의 Code.gs에 붙여넣기 (설치안내.md 참고)
 */

// ▼ 관리자 비밀번호 : 반드시 바꾸기
// 관리자 비밀번호는 코드가 아니라 시트 '설정' 탭에 둠 (키 : adminPassword, 값 : 비밀번호)
// 코드를 새로 올려도 비밀번호가 바뀌지 않게 하기 위함. 설정 탭에 없으면 관리자 로그인 불가
const ADMIN_PASSWORD = '';

const TABLES = {
  학생: { cols: ['학번', '이름', '비밀번호', '첫 접속', '마지막 접속', '제출 시간', '이탈 횟수'], keys: ['id', 'name', 'pw', 'firstAt', 'lastAt', 'submittedAt', 'leaveCount'] },
  // 그림 있음 : '1' 있음, '0' 없음, 빈칸은 이 칸이 생기기 전 데이터 (관리 목록에서 한 번 채움)
  답안: { cols: ['학번', '번호', '데이터', '그래프 종류', 'X축', 'Y축', 'plotType', '질문', '관찰', '근거', '결론', '그림', '수정 시간', '그림 있음'], keys: ['id', 'slot', 'data', 'type', 'x', 'y', 'plotType', 'q', 'obs', 'ev', 'concl', 'img', 'updatedAt', 'hasImg'] },
  기록: { cols: ['시간', '학번', '종류', '내용'], keys: ['time', 'id', 'kind', 'detail'] },
  설정: { cols: ['키', '값'], keys: ['key', 'value'] },
};

let CACHE = {};

function sheetOf(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), TABLES[name].cols.length).setNumberFormat('@'); // 0으로 시작하는 비밀번호 보존
    sh.getRange(1, 1, 1, TABLES[name].cols.length).setValues([TABLES[name].cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    // 나중에 추가된 칸의 제목 채우기 (기존 데이터는 그대로)
    const n = TABLES[name].cols.length;
    if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
    const head = sh.getRange(1, 1, 1, n).getValues()[0];
    if (head[n - 1] === '' || head[n - 1] === null) {
      sh.getRange(1, 1, 1, n).setValues([TABLES[name].cols]).setFontWeight('bold');
      sh.getRange(1, n, sh.getMaxRows(), 1).setNumberFormat('@');
    }
  }
  return sh;
}

// 답안의 그림 칸(행마다 최대 4.5만 자)은 무거워서 표를 읽을 때 빼고, 필요한 행만 따로 읽음
const IMG_COL = TABLES['답안'].keys.indexOf('img') + 1;

function table(name) {
  if (CACHE[name]) return CACHE[name];
  const sh = sheetOf(name), keys = TABLES[name].keys;
  const last = sh.getLastRow();
  let values = [];
  if (last > 1) {
    if (name === '답안') {
      const left = sh.getRange(2, 1, last - 1, IMG_COL - 1).getValues();
      const right = sh.getRange(2, IMG_COL + 1, last - 1, keys.length - IMG_COL).getValues();
      values = left.map((v, i) => v.concat([null], right[i]));
    } else values = sh.getRange(2, 1, last - 1, keys.length).getValues();
  }
  const rows = values.map((v, i) => {
    const o = { _row: i + 2 };
    keys.forEach((k, j) => { o[k] = v[j] === null || v[j] === undefined ? '' : String(v[j]); });
    if (name === '답안') delete o.img; // 아직 안 읽음
    return o;
  });
  CACHE[name] = { sh, keys, rows };
  return CACHE[name];
}

function withImg(rows) {
  const t = table('답안');
  rows.forEach(r => { if (r.img === undefined) r.img = String(t.sh.getRange(r._row, IMG_COL).getValue() || ''); });
  return rows;
}

function strip(o) { const c = Object.assign({}, o); delete c._row; return c; }

function upsert(name, obj, match) {
  const t = table(name);
  const vals = [t.keys.map(k => (obj[k] === undefined || obj[k] === null) ? '' : String(obj[k]))];
  const found = t.rows.find(match);
  if (found) {
    t.sh.getRange(found._row, 1, 1, t.keys.length).setNumberFormat('@').setValues(vals);
    Object.assign(found, obj);
  } else {
    const row = t.sh.getLastRow() + 1;
    t.sh.getRange(row, 1, 1, t.keys.length).setNumberFormat('@').setValues(vals);
    t.rows.push(Object.assign({ _row: row }, obj));
  }
}

// 비밀번호 해시용 비밀 값 : 처음 한 번 만들어 스크립트 속성에 보관 (시트에는 없음)
let PEPPER_CACHE = '';
function pepper() {
  if (PEPPER_CACHE) return PEPPER_CACHE;
  const props = PropertiesService.getScriptProperties();
  let p = props.getProperty('PEPPER');
  if (!p) { p = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('PEPPER', p); }
  return (PEPPER_CACHE = p);
}

const SheetStore = {
  now: () => Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
  hash: s => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pepper() + ':' + s, Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join(''),
  getStudent: id => { const s = table('학생').rows.find(r => r.id === String(id)); return s ? strip(s) : null; },
  putStudent: s => upsert('학생', s, r => r.id === String(s.id)),
  listStudents: () => table('학생').rows.map(strip),
  getAnswers: id => withImg(table('답안').rows.filter(r => r.id === String(id))).map(strip),
  putAnswer: a => upsert('답안', Object.assign({}, a, { hasImg: a.img ? '1' : '0' }), r => r.id === String(a.id) && Number(r.slot) === Number(a.slot)),
  // 관리 목록용 : 그림 내용은 읽지 않고 '그림 있음' 칸만 사용
  listAnswers: () => {
    const t = table('답안');
    if (t.rows.some(r => r.hasImg === '')) {
      // 이 칸이 생기기 전 데이터가 있으면 그림 칸을 한 번만 읽어서 채워 둠
      const n = t.sh.getLastRow() - 1;
      const imgs = t.sh.getRange(2, IMG_COL, n, 1).getValues();
      const flags = imgs.map(v => [v[0] ? '1' : '0']);
      const col = t.keys.indexOf('hasImg') + 1;
      t.sh.getRange(2, col, n, 1).setNumberFormat('@').setValues(flags);
      t.rows.forEach(r => { r.hasImg = flags[r._row - 2][0]; });
    }
    return t.rows.map(r => { const c = strip(r); c.img = r.hasImg === '1' ? '1' : ''; return c; });
  },
  addLogs: rows => {
    if (!rows.length) return;
    const sh = sheetOf('기록'), keys = TABLES['기록'].keys; // 기록 표 전체를 읽지 않고 맨 아래에 바로 추가
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, keys.length).setNumberFormat('@')
      .setValues(rows.map(r => keys.map(k => String(r[k] == null ? '' : r[k]))));
  },
  getLogs: id => table('기록').rows.filter(r => r.id === String(id)).map(strip),
  // 학생 1명의 계정, 답안, 기록 행 삭제 (아래 행부터 지워야 행 번호가 안 밀림)
  deleteStudent: id => {
    ['학생', '답안'].forEach(name => {
      const t = table(name);
      t.rows.filter(r => r.id === String(id)).map(r => r._row).sort((a, b) => b - a).forEach(row => t.sh.deleteRow(row));
      delete CACHE[name];
    });
    // 기록은 행이 많아서 한 줄씩 지우지 않고 남길 행만 다시 씀
    const t = table('기록');
    if (t.rows.some(r => r.id === String(id))) {
      const keep = t.rows.filter(r => r.id !== String(id)).map(r => t.keys.map(k => r[k]));
      const last = t.sh.getLastRow();
      if (last > 1) t.sh.getRange(2, 1, last - 1, t.keys.length).clearContent();
      if (keep.length) t.sh.getRange(2, 1, keep.length, t.keys.length).setNumberFormat('@').setValues(keep);
    }
    delete CACHE['기록'];
  },
  getSetting: k => { const r = table('설정').rows.find(x => x.key === k); return r ? r.value : ''; },
  setSetting: (k, v) => upsert('설정', { key: k, value: String(v) }, r => r.key === k),
};

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return json({ ok: true, message: '수행평가 서버 동작 중' }); }

function doPost(e) {
  CACHE = {};
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청' }); }
  const server = makeServer(SheetStore, ADMIN_PASSWORD);
  const write = server.WRITE_ACTIONS.indexOf(req.action) >= 0;
  const lock = LockService.getScriptLock();
  if (write && !lock.tryLock(30000)) return json({ ok: false, error: '사용자가 많음, 잠시 후 다시 시도' });
  try { return json(server.handle(req)); }
  finally { if (write) lock.releaseLock(); }
}

// 처음 한 번 실행 : 시트 4개 만들기
function setup() { Object.keys(TABLES).forEach(sheetOf); }

// ===== 아래는 사이트의 js/core.js와 같은 코드 =====

// 서버 로직 (Apps Script와 브라우저 테스트 저장소가 같이 사용)
// store : getStudent, putStudent, listStudents, getAnswers, putAnswer, listAnswers, addLogs, getLogs, getSetting, setSetting, now, hash, deleteStudent
// 비밀번호는 'h:' + 해시로 저장 (store.hash가 비밀 값(pepper)을 섞어 SHA-256 계산). 교사도 원래 비밀번호를 알 수 없음
function makeServer(store, defaultAdminPw) {
  const hashPw = (id, pw) => 'h:' + store.hash(String(id) + ':' + String(pw));
  function checkPw(s, pw) {
    if (!s || !s.pw) return false;
    if (String(s.pw).indexOf('h:') === 0) return String(s.pw) === hashPw(s.id, pw);
    // 예전 방식(원문 저장)이면 맞을 때 해시로 바꿔 저장
    if (String(s.pw) !== String(pw)) return false;
    s.pw = hashPw(s.id, pw); store.putStudent(s);
    return true;
  }
  const publicStudent = s => { const c = Object.assign({}, s); c.hasPw = !!c.pw; delete c.pw; return c; };
  const LEAVE_KINDS = ['탭 이동', '창 이동'];
  const TEXT_KEYS = ['q', 'obs', 'ev', 'concl'];
  const err = msg => ({ ok: false, error: msg });
  const isLocked = () => String(store.getSetting('locked')) === 'true';
  const adminPw = () => store.getSetting('adminPassword') || defaultAdminPw;

  function state(s) {
    return {
      ok: true,
      student: { id: s.id, name: s.name },
      answers: store.getAnswers(s.id),
      submittedAt: s.submittedAt || '',
      leaveCount: Number(s.leaveCount || 0),
      locked: isLocked(),
    };
  }
  function auth(req) {
    const s = store.getStudent(String(req.id || ''));
    return checkPw(s, req.pw) ? s : null;
  }
  function checkAdmin(req) { const p = String(adminPw() || ''); return p !== '' && String(req.adminPw || '') === p; }

  const H = {
    login(req) {
      const id = String(req.id || '').trim(), name = String(req.name || '').trim(), pw = String(req.pw || '').trim();
      if (!/^\d{5}$/.test(id)) return err('학번은 숫자 5자리');
      if (!name) return err('이름 입력 필요');
      if (!/^\d{4}$/.test(pw)) return err('비밀번호는 숫자 4자리');
      let s = store.getStudent(id);
      if (!s) { s = { id, name, pw: '', firstAt: '', lastAt: '', submittedAt: '', leaveCount: 0 }; }
      else if (s.name !== name) return err('학번과 이름이 명단과 다름');
      if (!s.pw) {
        if (!req.pwConfirm) { if (!store.getStudent(id)) store.putStudent(s); return { ok: true, needSetup: true }; }
        if (String(req.pwConfirm) !== pw) return err('두 비밀번호가 다름');
        s.pw = hashPw(id, pw);
      } else if (!checkPw(s, pw)) return err('비밀번호가 다름 (잊었으면 선생님께 초기화 요청)');
      const now = store.now();
      if (!s.firstAt) s.firstAt = now;
      s.lastAt = now;
      store.putStudent(s);
      return state(s);
    },
    save(req) {
      const s = auth(req); if (!s) return err('로그인 정보 오류, 다시 로그인 필요');
      if (isLocked()) return err('평가가 잠겨 저장 불가');
      if (s.submittedAt) return err('제출 후 수정 불가');
      const slot = Number(req.slot);
      if (![1, 2, 3].includes(slot)) return err('잘못된 번호');
      const a = req.answer || {};
      const old = store.getAnswers(s.id).find(x => Number(x.slot) === slot) || {};
      const row = { id: s.id, slot, data: a.data || '', type: a.type || '', x: a.x || '', y: a.y || '', plotType: a.plotType || '',
        q: a.q || '', obs: a.obs || '', ev: a.ev || '', concl: a.concl || '',
        img: a.img === undefined ? (old.img || '') : (a.img || ''), updatedAt: store.now() };
      if (String(row.img).length > 49000) return err('그래프 그림이 너무 큼, 그래프 크기를 줄이고 다시 가져오기');
      store.putAnswer(row);
      return { ok: true, updatedAt: row.updatedAt };
    },
    submit(req) {
      const s = auth(req); if (!s) return err('로그인 정보 오류, 다시 로그인 필요');
      if (isLocked()) return err('평가가 잠겨 제출 불가');
      if (s.submittedAt) return { ok: true, submittedAt: s.submittedAt };
      // 미완성이어도 제출 가능 (완성 개수는 관리 화면에서 확인)
      s.submittedAt = store.now();
      store.putStudent(s);
      return { ok: true, submittedAt: s.submittedAt };
    },
    log(req) {
      const s = auth(req); if (!s) return err('로그인 정보 오류');
      const events = (req.events || []).slice(0, 50);
      const add = events.filter(e => LEAVE_KINDS.includes(e.kind)).length;
      store.addLogs(events.map(e => ({ time: String(e.time || store.now()), id: s.id, kind: String(e.kind || ''), detail: String(e.detail || '').slice(0, 200) })));
      if (add) { s.leaveCount = Number(s.leaveCount || 0) + add; store.putStudent(s); }
      return { ok: true, leaveCount: Number(s.leaveCount || 0) };
    },
    adminLogin(req) { return checkAdmin(req) ? { ok: true } : err('관리자 비밀번호가 다름'); },
    adminList(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const answers = store.listAnswers().map(a => { const c = Object.assign({}, a); c.hasImg = !!c.img; delete c.img; return c; });
      return { ok: true, locked: isLocked(), students: store.listStudents().map(publicStudent), answers };
    },
    adminDetail(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      const logs = store.getLogs(s.id).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      return { ok: true, student: publicStudent(s), answers: store.getAnswers(s.id), logs };
    },
    adminResetPw(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      // 임의의 숫자 4자리로 초기화, 이 응답에서만 교사에게 한 번 보여 줌
      const tempPw = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      s.pw = hashPw(s.id, tempPw); store.putStudent(s);
      return { ok: true, tempPw };
    },
    adminUnsubmit(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      s.submittedAt = ''; store.putStudent(s); return { ok: true };
    },
    adminSetLock(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      store.setSetting('locked', req.locked ? 'true' : 'false'); return { ok: true, locked: !!req.locked };
    },
    // 학생 삭제 : 계정, 답안, 기록 모두 지움 (되돌릴 수 없음)
    adminDeleteStudents(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const ids = (req.ids || []).map(String).filter(id => store.getStudent(id));
      ids.forEach(id => store.deleteStudent(id));
      return { ok: true, deleted: ids.length };
    },
    adminAddStudents(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      let added = 0, skipped = 0;
      (req.list || []).forEach(x => {
        const id = String(x.id || '').trim(), name = String(x.name || '').trim();
        if (!/^\d{5}$/.test(id) || !name || store.getStudent(id)) { skipped++; return; }
        store.putStudent({ id, name, pw: '', firstAt: '', lastAt: '', submittedAt: '', leaveCount: 0 }); added++;
      });
      return { ok: true, added, skipped };
    },
  };
  return {
    WRITE_ACTIONS: ['login', 'save', 'submit', 'log', 'adminResetPw', 'adminUnsubmit', 'adminSetLock', 'adminAddStudents', 'adminDeleteStudents'],
    handle(req) {
      const fn = H[req && req.action];
      if (!fn) return err('알 수 없는 요청');
      try { return fn(req); } catch (e) { return err('서버 오류 : ' + (e && e.message || e)); }
    },
  };
}
