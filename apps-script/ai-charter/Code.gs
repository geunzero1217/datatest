// 활동지 내용 (학생 화면, 관리 화면, 서버가 같이 사용)
// 칸을 바꾸면 시트 '답안' 탭 칸 제목도 자동으로 바뀜. key는 영문, 한 번 정하면 바꾸지 않기 (바꾸면 예전 답이 안 보임)
const ACTIVITY = {
  title: 'AI 사용 윤리 헌장 만들기',
  eyebrow: '창의적 체험활동 | AI 시대의 배움과 평가',
  heading: '우리 학교\nAI 사용 윤리 헌장 만들기',
  lead: '수능 AI 부정행위 기사를 읽고 수행평가, 과제, 시험에서 AI를 어떻게 써야 할지 헌장 조항 만들기',
  terms: [['헌장', '우리가 함께 지키기로 정한 규칙'], ['조항', '헌장 안의 규칙 하나하나']],
  modes: {
    solo: { name: '개별 활동', desc: '세 문항에 짧게 답하기', time: '10~15분' },
    group: { name: '모둠 활동', desc: '모둠이 함께 헌장을 만든 뒤 내가 맡은 조항 기록', time: '약 30분' },
  },
  // 활동 방식과 상관없이 받는 칸
  meta: [
    { key: 'group', label: '모둠 이름', only: 'group', type: 'in', hint: '예) 3모둠, 공정지킴이' },
    { key: 'career', label: '관심 진로 분야 (선택)', type: 'in', hint: '예) 교사, 소프트웨어 개발자, 간호사, 아직 고민 중' },
  ],
  steps: [
    {
      id: 'step1', name: '기사와 나의 질문', time: { solo: '약 5분', group: '약 5분' },
      q: '기사를 읽고 무엇이 문제인지 정리한 뒤 나만의 질문 만들기',
      fields: [
        { key: 's1_issue', label: '① 기사 제목과 핵심 쟁점', type: 'ta', rows: 3, need: true,
          hint: '예) 「기사 제목」(언론사) - 시험에서 AI를 몰래 쓰면 공정한 평가가 어렵다는 점이 문제' },
        { key: 's1_q', label: '② 나의 질문', type: 'in', need: true,
          hint: '\'~해야 할까?\'로 끝나는 한 문장. 예) 수행평가에서 AI 사용을 허용해야 할까?' },
      ],
    },
    {
      id: 'step2', name: '헌장 조항 만들기', time: { solo: '약 5분', group: '약 15분' },
      q: '수행평가, 과제, 시험에서 AI를 어떻게 써야 할지 헌장 조항을 만들고 왜 필요한지 쓰기',
      fields: [
        { key: 's2_area', label: '조항의 영역', type: 'pick', need: true, opts: ['수행평가', '과제', '지필 및 수능 시험', '수업 활동'], hint: '하나 고르기' },
        { key: 's2_rule', label: '③ 내가 제안하는 헌장 조항과 그 이유', type: 'ta', rows: 4, only: 'solo', need: true,
          hint: '예) 조항 : 보고서에 AI를 썼다면 어느 부분에 썼는지 밝힌다. 이유 : 내 생각과 AI의 생각을 구분해야 정직하게 평가받을 수 있기 때문' },
        { key: 's2_mine', label: '③ 우리 모둠 헌장에서 내가 맡은 조항과 그 이유', type: 'ta', rows: 4, only: 'group', need: true,
          hint: '예) 제2조 : 시험 중에는 어떤 AI 도구도 쓰지 않는다. 이 조항을 제안한 이유는 ~ 때문' },
      ],
    },
    {
      id: 'step3', name: '한 줄 소감 (선택)', time: { solo: '약 2분', group: '약 2분' },
      q: '쓰고 싶은 사람만 자유롭게, 비워 둬도 됨',
      fields: [
        { key: 's3_note', label: '오늘 활동에서 기억에 남는 점', type: 'in', hint: '예) 친구들마다 AI를 쓰는 기준이 달라서 놀랐다.' },
      ],
    },
  ],
};

// 모든 칸 목록 (meta 포함), 활동 방식에 맞는 칸만 고르기
const ALL_FIELDS = ACTIVITY.meta.concat(...ACTIVITY.steps.map(s => s.fields));
const fieldsFor = mode => ALL_FIELDS.filter(f => !f.only || f.only === mode);
// 필수 칸 중 몇 개 썼는지
function progressOf(a) {
  if (!a || !a.mode) return { done: 0, total: ACTIVITY.steps.reduce((n, s) => n + s.fields.filter(f => f.need && (!f.only || f.only === 'solo')).length, 0) };
  const need = fieldsFor(a.mode).filter(f => f.need);
  return { done: need.filter(f => String(a[f.key] || '').trim()).length, total: need.length };
}

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

// 서버 로직 (Apps Script와 브라우저 테스트 저장소가 같이 사용, ACTIVITY는 activity.js)
// store : now, hash, getStudent, putStudent, listStudents, deleteStudent, getAnswer, putAnswer, listAnswers,
//         getRecord, putRecord, listRecords, getSetting, setSetting, callAI(없으면 AI 생성 불가, 프롬프트 복사 방식)
// 비밀번호는 'h:' + 해시로 저장. 교사도 원래 비밀번호를 알 수 없음

const RECORD_AREAS = ['진로활동', '자율활동'];

// 생기부 문장 만들기용 프롬프트 (학생 이름, 학번은 넣지 않음)
function buildRecordPrompt(a, opt) {
  opt = opt || {};
  const area = RECORD_AREAS.includes(opt.area) ? opt.area : '진로활동';
  const len = Math.max(80, Math.min(1500, Number(opt.len) || 300));
  const mode = ACTIVITY.modes[a.mode] ? a.mode : 'solo';
  const focus = area === '진로활동'
    ? '진로활동 기록이므로 AI 시대의 배움과 진로에 대한 성찰, 관심 진로 분야에서 필요한 AI 윤리의식이 드러나게 씀. 관심 진로 분야가 적혀 있으면 학생이 쓴 내용과 무리 없이 이어지는 범위에서만 연결함. 관심 진로 분야가 없으면 진로를 지어내지 않음'
    : '자율활동 기록이므로 공동체 규칙을 만드는 과정, 근거를 들어 판단하는 태도, 모둠 활동이면 협업과 합의 과정이 드러나게 씀';
  const system = [
    '고등학교 교사가 학교생활기록부 창의적 체험활동 ' + area + ' 특기사항을 쓰도록 돕는 역할.',
    '아래 학생 활동지 내용만 근거로 특기사항 한 문단을 작성.',
    '',
    '[규칙]',
    '- 학생 이름, 학번, "학생은" 같은 주어를 쓰지 않음 (주어 생략)',
    '- 문장은 "~함", "~임", "~보임", "~드러남" 같은 명사형으로 끝냄',
    '- 활동지에 없는 사실, 수치, 태도, 후속 활동을 지어내지 않음. 학생이 쓴 내용이 적으면 짧게 씀',
    '- 학생이 쓴 질문, 조항, 이유의 핵심을 구체적으로 담되 학생 글을 길게 그대로 옮기지 않음',
    '- 활동명 "' + ACTIVITY.title + '" 이름을 자연스럽게 포함',
    '- "매우 뛰어남", "탁월함" 같은 과장된 칭찬 대신 관찰할 수 있는 행동과 생각으로 표현',
    '- 언론사 이름, 기관명, 상호명, 특정 대학명, 교외 수상, 사교육, 부모 관련 내용은 쓰지 않음',
    '- 비어 있는 칸은 언급하지 않음',
    '- ' + focus,
    '- 공백 포함 ' + len + '자 안팎, ' + Math.round(len * 1.1) + '자를 넘지 않게',
    '- 교사의 추가 요청이 있으면 위 규칙을 지키는 범위에서 반영',
    '- 출력은 특기사항 본문 한 문단만. 제목, 따옴표, 설명, 글자 수 표시 없이',
  ].join('\n');
  const lines = ['[활동 소개]', ACTIVITY.title + ' : ' + ACTIVITY.lead, '활동 방식 : ' + ACTIVITY.modes[mode].name + ' (' + ACTIVITY.modes[mode].desc + ')', '', '[학생 활동지]'];
  fieldsFor(mode).forEach(f => { if (f.key === 'group') return; lines.push('- ' + f.label + ' : ' + (String(a[f.key] || '').trim() || '(비어 있음)')); });
  const req = String(opt.req || '').trim();
  lines.push('', '[교사의 추가 요청]', req || '(없음)');
  return { system, user: lines.join('\n'), area, len };
}

function makeServer(store, defaultAdminPw) {
  const hashPw = (id, pw) => 'h:' + store.hash(String(id) + ':' + String(pw));
  const checkPw = (s, pw) => !!(s && s.pw) && String(s.pw) === hashPw(s.id, pw);
  const publicStudent = s => { const c = Object.assign({}, s); c.hasPw = !!c.pw; delete c.pw; return c; };
  const err = msg => ({ ok: false, error: msg });
  // 활동은 교사가 '활동 열기'를 눌렀을 때만 저장 가능 (설정이 없으면 닫힘)
  const isLocked = () => String(store.getSetting('locked')) !== 'false';
  const adminPw = () => store.getSetting('adminPassword') || defaultAdminPw;
  const checkAdmin = req => { const p = String(adminPw() || ''); return p !== '' && String(req.adminPw || '') === p; };
  const auth = req => { const s = store.getStudent(String(req.id || '')); return checkPw(s, req.pw) ? s : null; };
  const LIMIT = 3000; // 칸마다 최대 글자 수

  function cleanAnswer(id, a, old) {
    a = a || {};
    const row = { id, mode: ACTIVITY.modes[a.mode] ? a.mode : '' };
    ALL_FIELDS.forEach(f => {
      let v = String(a[f.key] == null ? '' : a[f.key]).slice(0, LIMIT);
      if (f.type === 'pick' && v && f.opts.indexOf(v) < 0) v = '';
      row[f.key] = v;
    });
    row.updatedAt = store.now();
    row.submittedAt = (old && old.submittedAt) || '';
    return row;
  }
  function state(s) {
    return { ok: true, student: { id: s.id, name: s.name }, answer: store.getAnswer(s.id) || null, locked: isLocked() };
  }
  const guard = req => checkAdmin(req) ? null : err('관리자 인증 필요');

  const H = {
    login(req) {
      const id = String(req.id || '').trim(), name = String(req.name || '').replace(/\s+/g, ''), pw = String(req.pw || '').trim();
      if (!/^\d{5}$/.test(id)) return err('학번은 숫자 5자리 (예 10312)');
      if (!name) return err('이름 입력 필요');
      if (!/^\d{4}$/.test(pw)) return err('비밀번호는 숫자 4자리');
      let s = store.getStudent(id);
      if (s && s.name !== name) return err('학번과 이름이 명단과 다름');
      if (!s) s = { id, name, pw: '', firstAt: '', lastAt: '' };
      if (!s.pw) {
        if (!req.pwConfirm) return { ok: true, needSetup: true };
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
      if (isLocked()) return err('활동이 닫혀 저장 불가');
      const row = cleanAnswer(s.id, req.answer, store.getAnswer(s.id));
      store.putAnswer(row);
      return { ok: true, updatedAt: row.updatedAt, submittedAt: row.submittedAt };
    },
    // 제출 : 저장과 같이 처리. 제출 후에도 활동이 열려 있으면 고쳐서 다시 제출 가능
    submit(req) {
      const s = auth(req); if (!s) return err('로그인 정보 오류, 다시 로그인 필요');
      if (isLocked()) return err('활동이 닫혀 제출 불가');
      const row = cleanAnswer(s.id, req.answer, null);
      if (!row.mode) return err('활동 방식 선택 필요');
      row.submittedAt = row.updatedAt;
      store.putAnswer(row);
      return { ok: true, updatedAt: row.updatedAt, submittedAt: row.submittedAt };
    },

    adminLogin(req) { return checkAdmin(req) ? { ok: true } : err('관리자 비밀번호가 다름'); },
    adminList(req) {
      const g = guard(req); if (g) return g;
      return { ok: true, locked: isLocked(), guide: store.getSetting('recordGuide') || '', aiReady: !!store.callAI,
        students: store.listStudents().map(publicStudent), answers: store.listAnswers(), records: store.listRecords() };
    },
    adminDetail(req) {
      const g = guard(req); if (g) return g;
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      return { ok: true, student: publicStudent(s), answer: store.getAnswer(s.id) || null, record: store.getRecord(s.id) || null };
    },
    adminResetPw(req) {
      const g = guard(req); if (g) return g;
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      const tempPw = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      s.pw = hashPw(s.id, tempPw); store.putStudent(s);
      return { ok: true, tempPw };
    },
    adminUnsubmit(req) {
      const g = guard(req); if (g) return g;
      const a = store.getAnswer(String(req.id)); if (!a) return err('답안 없음');
      a.submittedAt = ''; store.putAnswer(a); return { ok: true };
    },
    adminSetLock(req) {
      const g = guard(req); if (g) return g;
      store.setSetting('locked', req.locked ? 'true' : 'false'); return { ok: true, locked: !!req.locked };
    },
    adminDeleteStudents(req) {
      const g = guard(req); if (g) return g;
      const ids = (req.ids || []).map(String).filter(id => store.getStudent(id));
      ids.forEach(id => store.deleteStudent(id));
      return { ok: true, deleted: ids.length };
    },
    adminAddStudents(req) {
      const g = guard(req); if (g) return g;
      let added = 0, skipped = 0;
      (req.list || []).forEach(x => {
        const id = String(x.id || '').trim(), name = String(x.name || '').replace(/\s+/g, '');
        if (!/^\d{5}$/.test(id) || !name || store.getStudent(id)) { skipped++; return; }
        store.putStudent({ id, name, pw: '', firstAt: '', lastAt: '' }); added++;
      });
      return { ok: true, added, skipped };
    },
    // 두 선생님이 같이 쓰는 생기부 기본 요청 사항
    adminSetGuide(req) {
      const g = guard(req); if (g) return g;
      store.setSetting('recordGuide', String(req.guide || '').slice(0, 1000)); return { ok: true };
    },
    adminPrompt(req) {
      const g = guard(req); if (g) return g;
      const a = store.getAnswer(String(req.id)); if (!a || !a.mode) return err('작성한 활동지 없음');
      const p = buildRecordPrompt(a, req);
      return { ok: true, prompt: p.system + '\n\n' + p.user };
    },
    // AI로 생기부 문장 만들기 (저장은 adminSaveRecord로 따로, 오래 걸려서 잠금 없이 실행)
    adminGenerate(req) {
      const g = guard(req); if (g) return g;
      const a = store.getAnswer(String(req.id)); if (!a || !a.mode) return err('작성한 활동지 없음');
      const p = buildRecordPrompt(a, req);
      if (!store.callAI) return { ok: false, noKey: true, error: 'AI 키가 설정되지 않음, 프롬프트 복사로 진행', prompt: p.system + '\n\n' + p.user };
      const r = store.callAI(p.system, p.user);
      if (!r.ok) return Object.assign(r, { prompt: p.system + '\n\n' + p.user });
      return { ok: true, text: String(r.text || '').trim(), area: p.area, len: p.len };
    },
    adminSaveRecord(req) {
      const g = guard(req); if (g) return g;
      const id = String(req.id); if (!store.getStudent(id)) return err('학생 없음');
      const old = store.getRecord(id) || {};
      const r = { id, text: String(req.text || '').slice(0, 3000), req: String(req.req || '').slice(0, 1000),
        area: RECORD_AREAS.includes(req.area) ? req.area : (old.area || ''), at: store.now(), star: old.star || '' };
      store.putRecord(r);
      return { ok: true, record: r };
    },
    // 우수 헌장 표시
    adminSetStar(req) {
      const g = guard(req); if (g) return g;
      const id = String(req.id); if (!store.getStudent(id)) return err('학생 없음');
      const r = store.getRecord(id) || { id, text: '', req: '', area: '', at: '' };
      r.star = req.star ? '1' : '';
      store.putRecord(r);
      return { ok: true, star: r.star };
    },
  };
  return {
    WRITE_ACTIONS: ['login', 'save', 'submit', 'adminResetPw', 'adminUnsubmit', 'adminSetLock', 'adminAddStudents', 'adminDeleteStudents', 'adminSetGuide', 'adminSaveRecord', 'adminSetStar'],
    handle(req) {
      const fn = H[req && req.action];
      if (!fn) return err('알 수 없는 요청');
      try { return fn(req); } catch (e) { return err('서버 오류 : ' + (e && e.message || e)); }
    },
  };
}
