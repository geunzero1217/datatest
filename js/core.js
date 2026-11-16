// 서버 로직 (Apps Script와 브라우저 테스트 저장소가 같이 사용)
// store : getStudent, putStudent, listStudents, getAnswers, putAnswer, listAnswers, addLogs, getLogs, getSetting, setSetting, now
function makeServer(store, defaultAdminPw) {
  const LEAVE_KINDS = ['탭 이동', '창 이동'];
  const TEXT_KEYS = ['q', 'obs', 'ev', 'concl'];
  const err = msg => ({ ok: false, error: msg });
  const isLocked = () => String(store.getSetting('locked')) === 'true';
  const adminPw = () => store.getSetting('adminPassword') || defaultAdminPw;
  const complete = a => !!(a && a.data && a.type && a.img && TEXT_KEYS.every(k => String(a[k] || '').trim()));

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
    if (!s || !s.pw || String(s.pw) !== String(req.pw)) return null;
    return s;
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
        s.pw = pw;
      } else if (String(s.pw) !== pw) return err('비밀번호가 다름 (잊었으면 선생님께 초기화 요청)');
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
      const ans = store.getAnswers(s.id);
      if (![1, 2, 3].every(n => complete(ans.find(a => Number(a.slot) === n)))) return err('3개 모두 완성해야 제출 가능');
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
      return { ok: true, locked: isLocked(), students: store.listStudents(), answers };
    },
    adminDetail(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      const logs = store.getLogs(s.id).sort((a, b) => String(a.time).localeCompare(String(b.time)));
      return { ok: true, student: s, answers: store.getAnswers(s.id), logs };
    },
    adminResetPw(req) {
      if (!checkAdmin(req)) return err('관리자 인증 필요');
      const s = store.getStudent(String(req.id)); if (!s) return err('학생 없음');
      s.pw = ''; store.putStudent(s); return { ok: true };
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
