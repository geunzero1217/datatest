// 서버 로직 (Apps Script와 브라우저 테스트 저장소가 같이 사용)
// store : getStudent, putStudent, listStudents, getAnswers, putAnswer, listAnswers, addLogs, getLogs, getSetting, setSetting, now, hash
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
  function checkAdmin(req) { return String(req.adminPw || '') === String(adminPw()); }

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
    WRITE_ACTIONS: ['login', 'save', 'submit', 'log', 'adminResetPw', 'adminUnsubmit', 'adminSetLock', 'adminAddStudents'],
    handle(req) {
      const fn = H[req && req.action];
      if (!fn) return err('알 수 없는 요청');
      try { return fn(req); } catch (e) { return err('서버 오류 : ' + (e && e.message || e)); }
    },
  };
}
