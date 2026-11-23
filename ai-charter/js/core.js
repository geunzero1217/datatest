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
