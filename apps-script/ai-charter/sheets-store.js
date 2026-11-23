/**
 * AI 사용 윤리 헌장 만들기 : 구글 시트 저장소 (Apps Script 웹 앱)
 * 서버 코드 = ai-charter/js/activity.js + 이 파일 + ai-charter/js/core.js (node tools/build-charter-server.js)
 * 관리자 비밀번호 : 시트 '설정' 탭 adminPassword 줄 (코드에 없음)
 * AI 생기부 생성 : 스크립트 속성 ANTHROPIC_API_KEY (없으면 관리 화면에서 프롬프트 복사 방식)
 */

const TABLES = {
  학생: { cols: ['학번', '이름', '비밀번호', '첫 접속', '마지막 접속'], keys: ['id', 'name', 'pw', 'firstAt', 'lastAt'] },
  답안: {
    cols: ['학번', '활동 방식'].concat(ALL_FIELDS.map(f => f.label), ['수정 시간', '제출 시간']),
    keys: ['id', 'mode'].concat(ALL_FIELDS.map(f => f.key), ['updatedAt', 'submittedAt']),
  },
  생기부: { cols: ['학번', '생기부 내용', '요청 사항', '영역', '작성 시간', '우수'], keys: ['id', 'text', 'req', 'area', 'at', 'star'] },
  설정: { cols: ['키', '값'], keys: ['key', 'value'] },
};

let CACHE = {};

function sheetOf(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const n = TABLES[name].cols.length;
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@'); // 0으로 시작하는 값 보존
    sh.getRange(1, 1, 1, n).setValues([TABLES[name].cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    // 칸이 늘거나 이름이 바뀌면 제목 다시 쓰기 (데이터 위치는 key 순서 그대로)
    if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
    const head = sh.getRange(1, 1, 1, n).getValues()[0].map(String);
    if (head.join('|') !== TABLES[name].cols.join('|')) {
      sh.getRange(1, 1, 1, n).setValues([TABLES[name].cols]).setFontWeight('bold');
      sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@');
    }
  }
  return sh;
}

function table(name) {
  if (CACHE[name]) return CACHE[name];
  const sh = sheetOf(name), keys = TABLES[name].keys;
  const last = sh.getLastRow();
  const values = last > 1 ? sh.getRange(2, 1, last - 1, keys.length).getValues() : [];
  const rows = values.map((v, i) => {
    const o = { _row: i + 2 };
    keys.forEach((k, j) => { o[k] = v[j] === null || v[j] === undefined ? '' : String(v[j]); });
    return o;
  }).filter(o => o[keys[0]] !== '');
  CACHE[name] = { sh, keys, rows };
  return CACHE[name];
}

function strip(o) { if (!o) return null; const c = Object.assign({}, o); delete c._row; return c; }

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

function removeRows(name, id) {
  const t = table(name);
  t.rows.filter(r => r.id === String(id)).map(r => r._row).sort((a, b) => b - a).forEach(row => t.sh.deleteRow(row));
  delete CACHE[name];
}

let PEPPER_CACHE = '';
function pepper() {
  if (PEPPER_CACHE) return PEPPER_CACHE;
  const props = PropertiesService.getScriptProperties();
  let p = props.getProperty('PEPPER');
  if (!p) { p = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('PEPPER', p); }
  return (PEPPER_CACHE = p);
}

// Claude API로 생기부 문장 만들기 (키는 스크립트 속성에만 둠)
const AI_MODEL = 'claude-opus-5-5';
function callClaude(system, user) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, noKey: true, error: 'AI 키가 설정되지 않음, 프롬프트 복사로 진행' };
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 8000,
      output_config: { effort: 'medium' },
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
    }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  let body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) { /* 아래에서 처리 */ }
  if (code !== 200) return { ok: false, error: 'AI 응답 오류 ' + code + ' : ' + ((body.error && body.error.message) || '') };
  if (body.stop_reason === 'refusal') return { ok: false, error: 'AI가 이 내용으로는 작성하지 않음, 직접 작성 필요' };
  const text = (body.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!text) return { ok: false, error: 'AI 응답이 비어 있음, 다시 시도' };
  return { ok: true, text };
}

const hasKey = () => !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

const SheetStore = {
  now: () => Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
  hash: s => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pepper() + ':' + s, Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join(''),
  getStudent: id => strip(table('학생').rows.find(r => r.id === String(id))),
  putStudent: s => upsert('학생', s, r => r.id === String(s.id)),
  listStudents: () => table('학생').rows.map(strip),
  deleteStudent: id => { ['학생', '답안', '생기부'].forEach(n => removeRows(n, id)); },
  getAnswer: id => strip(table('답안').rows.find(r => r.id === String(id))),
  putAnswer: a => upsert('답안', a, r => r.id === String(a.id)),
  listAnswers: () => table('답안').rows.map(strip),
  getRecord: id => strip(table('생기부').rows.find(r => r.id === String(id))),
  putRecord: r => upsert('생기부', r, x => x.id === String(r.id)),
  listRecords: () => table('생기부').rows.map(strip),
  getSetting: k => { const r = table('설정').rows.find(x => x.key === k); return r ? r.value : ''; },
  setSetting: (k, v) => upsert('설정', { key: k, value: String(v) }, r => r.key === k),
};

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet() { return json({ ok: true, message: 'AI 윤리 헌장 서버 동작 중' }); }

function doPost(e) {
  CACHE = {};
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청' }); }
  // 키가 있을 때만 AI 생성 사용 (없으면 core.js가 프롬프트 복사 방식으로 안내)
  const store = Object.assign({}, SheetStore, hasKey() ? { callAI: callClaude } : {});
  const server = makeServer(store, '');
  const write = server.WRITE_ACTIONS.indexOf(req.action) >= 0;
  const lock = LockService.getScriptLock();
  if (write && !lock.tryLock(30000)) return json({ ok: false, error: '사용자가 많음, 잠시 후 다시 시도' });
  try { return json(server.handle(req)); }
  finally { if (write) lock.releaseLock(); }
}

// 처음 한 번 실행 : 시트 4개 만들기
function setup() { Object.keys(TABLES).forEach(sheetOf); }

// 키 확인용 : 편집기에서 실행하면 짧은 문장을 만들어 봄
function testAI() { Logger.log(JSON.stringify(callClaude('한 문장으로 답함.', 'AI 윤리 헌장이 무엇인지 한 문장으로 설명.'))); }
