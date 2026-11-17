/**
 * 데이터 분석 수행평가 : 구글 시트 저장소 (Apps Script 웹 앱)
 * 이 파일 전체를 Apps Script 편집기의 Code.gs에 붙여넣기 (설치안내.md 참고)
 */

// ▼ 관리자 비밀번호 : 반드시 바꾸기
// 관리자 비밀번호는 코드가 아니라 시트 '설정' 탭에 둠 (키 : adminPassword, 값 : 비밀번호)
// 코드를 새로 올려도 비밀번호가 바뀌지 않게 하기 위함. 설정 탭에 없으면 관리자 로그인 불가
const ADMIN_PASSWORD = '';

const TABLES = {
  학생: { cols: ['학번', '이름', '비밀번호', '첫 접속', '마지막 접속', '제출 시간', '이탈 횟수', '수정 요청 상태', '수정 요청 사유', '수정 요청 시간'], keys: ['id', 'name', 'pw', 'firstAt', 'lastAt', 'submittedAt', 'leaveCount', 'reqStatus', 'reqReason', 'reqAt'] },
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
  // 같은 기록 묶음을 이미 받았는지 (6시간 기억)
  seen: key => {
    const c = CacheService.getScriptCache();
    if (c.get('b:' + key)) return true;
    c.put('b:' + key, '1', 21600);
    return false;
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
