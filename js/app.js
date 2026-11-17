// 학생 화면
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dsById = id => DATASETS.find(d => d.id === id);
const TEXT_KEYS = TEXT_FIELDS.map(f => f.key);
const DONE_MARK = `${icon('check', 16)} 완료`;
fillIcons();

const S = {
  id: '', name: '', pw: '',
  answers: { 1: {}, 2: {}, 3: {} },
  submittedAt: '', locked: false,
  slot: null, work: null, dirty: false, imgChanged: false, changingData: false,
  logQueue: [], sending: false, autosaveTimer: null, screen: '',
};

/* ---------- 공통 ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  S.screen = id;
  window.scrollTo(0, 0);
}
let toastT = null;
function toast(msg, ms = 2400) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}
function confirmBox(title, text, yes = '확인', no = '취소') {
  return new Promise(resolve => {
    $('cf-title').textContent = title; $('cf-text').textContent = text;
    $('cf-yes').textContent = yes; $('cf-no').textContent = no;
    $('ov-confirm').classList.add('on');
    const done = v => { $('ov-confirm').classList.remove('on'); $('cf-yes').onclick = $('cf-no').onclick = null; resolve(v); };
    $('cf-yes').onclick = () => done(true);
    $('cf-no').onclick = () => done(false);
  });
}
const isComplete = a => !!(a && a.data && a.type && a.img && TEXT_KEYS.every(k => String(a[k] || '').trim()));
const textCount = a => TEXT_KEYS.filter(k => String((a || {})[k] || '').trim()).length;
function usedTypes(exceptSlot) {
  const m = {};
  [1, 2, 3].forEach(n => { if (n !== exceptSlot && S.answers[n].type) (m[S.answers[n].type] = m[S.answers[n].type] || []).push(n); });
  return m;
}
function duplicateTypes() {
  const m = usedTypes(null);
  return Object.keys(m).filter(t => m[t].length > 1);
}

/* ---------- 기록 전송 ---------- */
function nowStr() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const SCREEN_NAMES = { 's-home': '내 수행평가', 's-data': '데이터 선택', 's-work': '작업 화면', 's-rules': '규칙', 's-guide': '그래프 설명' };
function logEvent(kind, detail = '') {
  const where = SCREEN_NAMES[S.screen] ? (S.screen === 's-work' ? `시각화 ${S.slot}` : SCREEN_NAMES[S.screen]) : '';
  S.logQueue.push({ time: nowStr(), kind, detail: [detail, where].filter(Boolean).join(' / ') });
  flushLogs();
}
async function flushLogs() {
  if (S.sending || !S.id) return;
  // 실패한 묶음은 같은 번호(batchId)로 다시 보내서 서버가 두 번 세지 않게 함
  if (!S.pendingBatch) {
    if (!S.logQueue.length) return;
    S.pendingBatch = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), events: S.logQueue.splice(0, 50) };
  }
  S.sending = true;
  const b = S.pendingBatch;
  const r = await API.call('log', { id: S.id, pw: S.pw, events: b.events, batchId: b.id });
  S.sending = false;
  if (!r.ok) { setTimeout(flushLogs, 10000); return; }
  S.pendingBatch = null;
  if (r.leaveCount > Guard.leaveCount) Guard.leaveCount = r.leaveCount;
  if (S.logQueue.length) flushLogs();
}

/* ---------- 로그인 ---------- */
function resetLoginForm() {
  $('pw2-field').hidden = true; $('in-pw2').value = '';
  $('login-title').textContent = '데이터 분석 수행평가';
  $('login-sub').textContent = '학번, 이름, 비밀번호 입력';
  $('login-btn').textContent = '로그인';
  $('login-error').textContent = '';
}
['in-id', 'in-pw', 'in-pw2'].forEach(id => $(id).addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); }));
['in-id', 'in-name'].forEach(id => $(id).addEventListener('input', () => { if (!$('pw2-field').hidden) resetLoginForm(); }));

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('in-id').value.trim(), name = $('in-name').value.trim(), pw = $('in-pw').value.trim();
  const setup = !$('pw2-field').hidden;
  if (!/^\d{5}$/.test(id)) return ($('login-error').textContent = '학번은 숫자 5자리');
  if (!name) return ($('login-error').textContent = '이름 입력 필요');
  if (!/^\d{4}$/.test(pw)) return ($('login-error').textContent = '비밀번호는 숫자 4자리');
  if (setup && !/^\d{4}$/.test($('in-pw2').value)) return ($('login-error').textContent = '비밀번호 확인 입력 필요');
  $('login-btn').disabled = true; $('login-error').textContent = '';
  const r = await API.call('login', { id, name, pw, pwConfirm: setup ? $('in-pw2').value : '' });
  $('login-btn').disabled = false;
  if (!r.ok) return ($('login-error').textContent = r.error);
  if (r.needSetup) {
    $('pw2-field').hidden = false;
    $('login-title').textContent = '비밀번호 설정';
    $('login-sub').textContent = '처음 접속, 비밀번호 한 번 더 입력';
    $('login-btn').textContent = '설정하고 시작';
    $('in-pw2').focus();
    return;
  }
  S.id = id; S.name = name; S.pw = pw;
  try { sessionStorage.setItem('pa-session', JSON.stringify({ id, name, pw })); } catch (err) {}
  afterLogin(r);
});

function applyState(r) {
  S.answers = { 1: {}, 2: {}, 3: {} };
  (r.answers || []).forEach(a => { S.answers[Number(a.slot)] = a; });
  S.submittedAt = r.submittedAt || '';
  S.locked = !!r.locked;
  S.request = r.request || { status: '' };
  Guard.leaveCount = Number(r.leaveCount || 0);
}
function afterLogin(r, reloaded) {
  applyState(r);
  if (S.submittedAt) return showDone();
  if (S.locked) return show('s-locked');
  show('s-rules');
  if (reloaded) logEvent('새로고침', '페이지 다시 열림');
}

/* ---------- 규칙, 시작 ---------- */
$('start-btn').onclick = async () => {
  await Guard.enterFullscreen();
  Guard.start();
  logEvent('평가 시작', document.fullscreenElement ? '전체 화면' : '전체 화면 실패');
  show('s-guide');
};

/* ---------- 그래프 종류 설명 ---------- */
const guideHTML = () => GRAPH_GUIDE.map(g => `<div class="guide">
  <div class="art"><svg viewBox="0 0 100 50" aria-hidden="true">${g.svg}</svg></div>
  <div class="name">${esc(g.type)}</div>
  <div class="use">${esc(g.use)}</div>
  <div class="tags"><span class="tag"><b>데이터</b>${esc(g.data)}</span><span class="tag"><b>예</b>${esc(g.ex)}</span></div>
</div>`).join('');
$('guide-grid').innerHTML = guideHTML();
$('guide-grid2').innerHTML = guideHTML();
$('guide-ok').onclick = () => goHome();
$('w-guide').onclick = () => $('ov-guide').classList.add('on');
$('guide-close').onclick = () => $('ov-guide').classList.remove('on');

/* ---------- 내 수행평가 ---------- */
function goHome() {
  S.slot = null; S.work = null; S.changingData = false;
  stopAutosave(); Codap.close(); $('codap-box').querySelector('iframe') && $('codap-box').querySelector('iframe').remove();
  renderHome(); show('s-home');
}
function renderHome() {
  $('who').textContent = `${S.id} ${S.name}`;
  const dups = duplicateTypes();
  $('dup-notice').innerHTML = dups.length
    ? `<div class="notice red">${icon('warning', 20)} 그래프 종류 중복 (${esc(dups.join(', '))}), 제출 가능하지만 감점 대상</div>` : '';
  $('slots').innerHTML = [1, 2, 3].map(n => {
    const a = S.answers[n], ds = dsById(a.data);
    const done = isComplete(a), started = !!a.data;
    const badge = done ? '<span class="badge green">완성</span>' : started ? '<span class="badge blue">작성 중</span>' : '<span class="badge gray">미작성</span>';
    const dupType = a.type && dups.includes(a.type);
    return `<div class="card slot">
      <div class="head"><div class="title">시각화 ${n}</div>${badge}</div>
      <div class="thumb">${a.img ? `<img src="${a.img}" alt="">` : '그래프 없음'}</div>
      <dl>
        <dt>데이터</dt><dd>${ds ? esc(ds.title) : '-'}</dd>
        <dt>그래프 종류</dt><dd>${a.type ? esc(a.type) + (dupType ? ' <span class="badge red">중복</span>' : '') : '-'}</dd>
        <dt>해석</dt><dd>${textCount(a)} / 4칸</dd>
      </dl>
      <button class="btn ${started ? 'soft' : ''} md full" data-slot="${n}">${started ? (done ? '수정하기' : '이어하기') : '시작하기'}</button>
    </div>`;
  }).join('');
  $('slots').querySelectorAll('button[data-slot]').forEach(b => b.onclick = () => {
    const n = Number(b.dataset.slot);
    if (S.answers[n].data) openWork(n); else openDataSelect(n);
  });
  const doneN = [1, 2, 3].filter(n => isComplete(S.answers[n])).length;
  $('progress-text').textContent = `${doneN} / 3 완성`;
  $('submit-hint').textContent = doneN === 3 ? (dups.length ? '그래프 종류 중복 상태로 제출 가능 (감점 대상)' : '제출 준비 완료') : `미완성 ${3 - doneN}개, 미완성도 제출 가능 (제출 후 수정 불가)`;
  $('submit-btn').disabled = false;
}
$('submit-btn').onclick = async () => {
  const dups = duplicateTypes();
  const left = [1, 2, 3].filter(n => !isComplete(S.answers[n]));
  const warn = (left.length ? `미완성 : 시각화 ${left.join(', ')}. ` : '') + (dups.length ? `그래프 종류 중복 (${dups.join(', ')}), 감점 대상. ` : '');
  const ok = await confirmBox(left.length ? '미완성 상태로 제출' : '제출하기', warn + '제출 후 수정 불가', '제출');
  if (!ok) return;
  $('submit-btn').disabled = true;
  const r = await API.call('submit', { id: S.id, pw: S.pw });
  if (!r.ok) { $('submit-btn').disabled = false; return handleError(r); }
  S.submittedAt = r.submittedAt;
  logEvent('제출', '');
  await flushLogs();
  showDone();
};
function showDone() {
  Guard.stop();
  $('done-sub').textContent = `${S.id} ${S.name}, 제출 시간 ${S.submittedAt}`;
  renderRequest();
  show('s-done');
}

/* ---------- 수정 요청 (제출한 학생만) ---------- */
function renderRequest() {
  const q = S.request || { status: '' };
  if (q.status === '대기') {
    $('done-req').innerHTML = `<div class="req-card"><b>수정 요청 보냄</b> (${esc(q.at)})<br>선생님 확인 기다리는 중<br>사유 : ${esc(q.reason)}</div>
      <button class="btn full soft md" id="req-check">승인됐는지 확인</button>`;
    $('req-check').onclick = checkRequest;
    return;
  }
  $('done-req').innerHTML = `${q.status === '거절' ? `<div class="req-card"><b>지난 수정 요청 거절됨</b><br>사유 : ${esc(q.reason)}</div>` : ''}
    <textarea class="input" id="req-reason" maxlength="300" placeholder="수정이 필요하면 이유 입력 (예: 시각화 2 해석을 다시 쓰고 싶음)"></textarea>
    <button class="btn full md" id="req-send">선생님께 수정 요청</button>`;
  $('req-send').onclick = async () => {
    const reason = $('req-reason').value.trim();
    if (!reason) return toast('수정하려는 이유 입력 필요');
    $('req-send').disabled = true;
    const r = await API.call('requestEdit', { id: S.id, pw: S.pw, reason });
    $('req-send').disabled = false;
    if (!r.ok) return toast(r.error);
    S.request = r.request; renderRequest(); toast('수정 요청 보냄');
  };
}
async function checkRequest() {
  $('req-check').disabled = true;
  const r = await API.call('login', { id: S.id, name: S.name, pw: S.pw });
  if ($('req-check')) $('req-check').disabled = false;
  if (!r.ok) return toast(r.error);
  if (!r.submittedAt) { toast('수정 요청 승인됨, 다시 작성 가능'); afterLogin(r); return; }
  applyState(r); renderRequest();
  toast(S.request.status === '거절' ? '수정 요청 거절됨' : '아직 확인 전');
}
function logout() {
  Guard.stop(); stopAutosave(); Codap.close();
  try { sessionStorage.removeItem('pa-session'); } catch (e) {}
  location.reload();
}
$('logout-btn').onclick = async () => { if (await confirmBox('로그아웃', '작성한 내용은 저장되어 있음', '로그아웃')) logout(); };
$('done-logout').onclick = logout;
$('locked-logout').onclick = logout;

function handleError(r) {
  if (/닫혀|잠겨/.test(r.error || '')) { S.locked = true; Guard.stop(); show('s-locked'); return; }
  if (/제출 후/.test(r.error || '')) { location.reload(); return; }
  toast(r.error || '오류 발생');
}

/* ---------- 데이터 선택 ---------- */
function openDataSelect(slot, changing = false) {
  S.slot = slot; S.changingData = changing;
  $('data-title').textContent = `시각화 ${slot} 데이터 선택`;
  $('data-back').textContent = changing ? '← 작업 화면으로' : '← 내 수행평가';
  $('datasets').innerHTML = DATASETS.map(d => `
    <button class="card ds" data-id="${d.id}">
      <div class="emoji">${icon(d.id, 48)}</div>
      <div class="name">${esc(d.title)}</div>
      <div class="desc">${esc(d.desc)}</div>
      <div class="attrs"><b>범주</b> ${esc(d.cat.join(', '))}<br><b>수치</b> ${esc(d.num.join(', '))}</div>
      <div class="rows">${d.rows}개 행${d.map ? ', 지도 가능' : ''}</div>
    </button>`).join('');
  $('datasets').querySelectorAll('.ds').forEach(b => b.onclick = () => pickData(b.dataset.id));
  show('s-data');
}
$('data-back').onclick = () => { if (S.changingData) show('s-work'); else goHome(); };
async function pickData(id) {
  if (S.changingData) {
    if (id === S.work.data) { show('s-work'); return; }
    if (S.work.img && !(await confirmBox('데이터 바꾸기', '데이터를 바꾸면 저장한 그래프 그림 삭제, 해석은 유지', '바꾸기'))) return;
  }
  openWork(S.slot, id);
}

/* ---------- 작업 화면 ---------- */
async function openWork(slot, newData) {
  const keep = S.changingData && S.work && S.slot === slot;
  S.slot = slot;
  S.work = keep ? S.work : Object.assign({}, S.answers[slot]);
  S.changingData = false;
  S.dirty = false; S.imgChanged = false;
  if (newData && newData !== S.work.data) {
    Object.assign(S.work, { data: newData, img: '', x: '', y: '', plotType: '' });
    S.dirty = true; S.imgChanged = true;
  }
  renderWork();
  show('s-work');
  startAutosave();
  if (S.dirty) saveWork(true);
  await loadCodap();
}
async function loadCodap() {
  const ds = dsById(S.work.data);
  const box = $('codap-box');
  box.querySelector('iframe') && box.querySelector('iframe').remove();
  $('codap-loading').style.display = 'flex';
  $('codap-loading').innerHTML = '<div class="spinner"></div><div id="codap-loading-text">CODAP 여는 중</div>';
  try {
    await Codap.open(box);
    $('codap-loading-text').textContent = `${ds.title} 데이터 넣는 중`;
    await Codap.loadData(ds);
    $('codap-loading').style.display = 'none';
  } catch (e) {
    $('codap-loading').innerHTML = `${icon('error', 48)}<div>${esc(e.message)}</div><button class="btn md" id="codap-retry">다시 시도</button>`;
    $('codap-retry').onclick = () => loadCodap();
  }
}
function renderWork() {
  const w = S.work, ds = dsById(w.data);
  $('w-title').textContent = `시각화 ${S.slot}`;
  $('w-data').innerHTML = `${icon(ds.id, 20)} ${esc(ds.title)}`;
  $('w-add-map').hidden = !ds.map;
  renderTypes();
  renderPreview();
  $('w-texts').innerHTML = TEXT_FIELDS.map(f => `
    <div class="ta-field"><div class="lab"><b>${f.label}</b><span id="cnt-${f.key}"></span></div>
    <textarea class="input" id="ta-${f.key}" data-label="${f.label}" placeholder="${esc(f.hint)}" spellcheck="false" autocomplete="off"></textarea></div>`).join('');
  TEXT_FIELDS.forEach(f => {
    const ta = $('ta-' + f.key);
    ta.value = w[f.key] || '';
    ta.addEventListener('input', () => { w[f.key] = ta.value; S.dirty = true; updateChecks(); setSaveState('저장 안 됨'); });
  });
  updateChecks();
  setSaveState(w.updatedAt ? `마지막 저장 ${String(w.updatedAt).slice(11, 16)}` : '');
}
function renderTypes() {
  const used = usedTypes(S.slot);
  $('w-types').innerHTML = GRAPH_TYPES.map(t => `<button class="chip ${S.work.type === t ? 'on' : ''} ${used[t] ? 'used' : ''}" data-t="${t}">${t}</button>`).join('');
  $('w-types').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    S.work.type = b.dataset.t; S.dirty = true; renderTypes(); updateChecks(); setSaveState('저장 안 됨');
  });
  const dupWith = S.work.type && used[S.work.type];
  $('w-dup').hidden = !dupWith;
  if (dupWith) $('w-dup').innerHTML = `${icon('warning', 16)} 시각화 ${dupWith.join(', ')}와 같은 종류, 감점 대상`;
}
function renderPreview() {
  const w = S.work;
  $('w-preview').innerHTML = w.img ? `<div class="graph-preview"><img src="${w.img}" alt="가져온 그래프">
    <div class="graph-meta">${/^map/.test(w.plotType || '') ? esc(w.plotType.replace(/^map/, '지도')) : `X축 ${esc(w.x || '없음')} / Y축 ${esc(w.y || '없음')}`}</div></div>` : '';
  $('w-grab').textContent = w.img ? '다시 저장하기 (새 그림으로 바꾸기)' : '만든 그래프 저장하기';
}
function updateChecks() {
  const w = S.work;
  $('w-type-ok').innerHTML = w.type ? DONE_MARK : '';
  $('w-graph-ok').innerHTML = w.img ? DONE_MARK : '';
  const n = textCount(w);
  $('w-text-ok').innerHTML = n === 4 ? DONE_MARK : `${n} / 4`;
  TEXT_FIELDS.forEach(f => { const c = $('cnt-' + f.key); if (c) c.textContent = `${String(w[f.key] || '').trim().length}자`; });
}
function setSaveState(t) { $('w-save-state').textContent = t; }

$('w-add-graph').onclick = async () => { if (!Codap.contextName) return toast('데이터 불러오는 중'); if (!(await Codap.addGraph('graph'))) toast('그래프 추가 실패'); };
$('w-add-map').onclick = async () => { if (!Codap.contextName) return toast('데이터 불러오는 중'); if (!(await Codap.addGraph('map'))) toast('지도 추가 실패'); };
$('w-change-data').onclick = () => openDataSelect(S.slot, true);

$('w-grab').onclick = async () => {
  if (!Codap.contextName) return toast('데이터 불러오는 중');
  const btn = $('w-grab'); btn.disabled = true; btn.textContent = '저장하는 중';
  try {
    const graphs = await Codap.getGraphs();
    if (!graphs.length) { toast('CODAP에 그래프 없음, 먼저 ＋ 그래프 추가'); return; }
    const g = graphs.length === 1 ? graphs[0] : await pickGraph(graphs);
    if (!g) return;
    if (g.kind === 'map') {
      const attr = await pickMapAttr();
      if (attr === null) return;
      g.image = await renderMapImage(Codap.table, attr);
      Object.assign(g, { x: '경도(long)', y: '위도(lat)', plotType: attr ? `map (색 : ${attr})` : 'map' });
    }
    if (!g.image) { toast('그래프 저장 실패, 그래프를 조금 움직인 뒤 다시 시도'); return; }
    S.work.img = await compressImage(g.image);
    Object.assign(S.work, { x: g.x, y: g.y, plotType: g.plotType });
    S.imgChanged = true; S.dirty = true;
    logEvent('그래프 저장', `${g.plotType || g.kind} X:${g.x || '-'} Y:${g.y || '-'}`);
    updateChecks(); setSaveState('저장 안 됨');
    await saveWork(true);
    toast('그래프 저장 완료');
  } catch (e) {
    toast('그래프 저장 실패 : ' + e.message);
  } finally {
    btn.disabled = false; renderPreview();
  }
};
function pickMapAttr() {
  return new Promise(resolve => {
    const t = Codap.table;
    const attrs = t.head.filter(h => !/lat|long/i.test(h));
    const cat = attrs.filter(h => !t.isNum[t.head.indexOf(h)]), num = attrs.filter(h => t.isNum[t.head.indexOf(h)]);
    $('map-attr').innerHTML = `<option value="">색 없음</option>` +
      `<optgroup label="범주">${cat.map(h => `<option ${h === '대륙' ? 'selected' : ''}>${esc(h)}</option>`).join('')}</optgroup>` +
      `<optgroup label="수치">${num.map(h => `<option>${esc(h)}</option>`).join('')}</optgroup>`;
    $('ov-map').classList.add('on');
    const done = v => { $('ov-map').classList.remove('on'); resolve(v); };
    $('map-ok').onclick = () => done($('map-attr').value);
    $('map-cancel').onclick = () => done(null);
  });
}
function pickGraph(graphs) {
  return new Promise(resolve => {
    $('pick-list').innerHTML = graphs.map((g, i) => `<button class="pick" data-i="${i}">
      ${g.image ? `<img src="${g.image}" alt="">` : `<div class="noimg">${g.kind === 'map' ? icon('map', 32) + '<br>선택하면 지도 그림 생성' : '그림 없음'}</div>`}
      <div class="m">${g.kind === 'map' ? '지도' : `X축 ${esc(g.x || '없음')} / Y축 ${esc(g.y || '없음')}`}</div></button>`).join('');
    $('ov-pick').classList.add('on');
    const done = v => { $('ov-pick').classList.remove('on'); resolve(v); };
    $('pick-list').querySelectorAll('.pick').forEach(b => b.onclick = () => done(graphs[Number(b.dataset.i)]));
    $('pick-cancel').onclick = () => done(null);
  });
}

// 저장은 한 번에 하나씩 (자동 저장 중에 버튼을 눌러도 두 번 보내지 않음)
async function saveWork(silent) {
  while (S.savingP) await S.savingP.catch(() => {});
  S.savingP = doSave(silent);
  try { return await S.savingP; } finally { S.savingP = null; }
}
async function doSave(silent) {
  if (!S.work || !S.slot) return true;
  const w = S.work;
  const answer = { data: w.data, type: w.type || '', x: w.x || '', y: w.y || '', plotType: w.plotType || '', q: w.q || '', obs: w.obs || '', ev: w.ev || '', concl: w.concl || '' };
  if (S.imgChanged) answer.img = w.img || '';
  const wasImgChanged = S.imgChanged;
  S.dirty = false; S.imgChanged = false;
  setSaveState('저장 중');
  const r = await API.call('save', { id: S.id, pw: S.pw, slot: S.slot, answer }, n => setSaveState(`연결이 느려 다시 저장 중 (${n}번째)`));
  if (!r.ok) {
    S.dirty = true; S.imgChanged = S.imgChanged || wasImgChanged;
    setSaveState('저장 실패');
    if (!silent || /닫혀|잠겨|제출 후/.test(r.error)) handleError(r);
    return false;
  }
  w.updatedAt = r.updatedAt;
  S.answers[S.slot] = Object.assign({}, w);
  setSaveState(`저장됨 ${String(r.updatedAt).slice(11, 16)}`);
  return true;
}
function startAutosave() {
  stopAutosave();
  S.autosaveTimer = setInterval(() => { if (S.dirty && S.screen === 's-work') saveWork(true); }, CONFIG.AUTOSAVE_SEC * 1000);
}
function stopAutosave() { clearInterval(S.autosaveTimer); S.autosaveTimer = null; }

$('w-save').onclick = async () => {
  $('w-save').disabled = true; $('w-save').textContent = '저장 중';
  if (S.savingP) await S.savingP.catch(() => {}); // 자동 저장이 진행 중이면 그것만 기다림
  const ok = S.dirty ? await saveWork(false) : true; // 바뀐 게 없으면 바로 나감
  $('w-save').disabled = false; $('w-save').textContent = '저장하고 나가기';
  if (ok) { toast(isComplete(S.answers[S.slot]) ? `시각화 ${S.slot} 완성` : '저장 완료'); goHome(); }
};

/* ---------- 부정행위 방지 연결 ---------- */
Guard.onEvent = (kind, detail) => logEvent(kind, detail);
Guard.onWarn = (type, info) => {
  const ov = $('ov-warn');
  if (type === 'leave') {
    $('warn-icon').innerHTML = icon('warning', 72);
    $('warn-title').textContent = '다른 화면 이동 감지';
    $('warn-count').hidden = false;
    $('warn-count').textContent = `${info.count}번째 이동`;
    $('warn-text').textContent = '선생님께 기록됨, 반복 시 감점 대상';
    ov.dataset.type = 'leave';
  } else if (!ov.classList.contains('on') || ov.dataset.type !== 'leave') {
    $('warn-icon').innerHTML = icon('screen', 72);
    $('warn-title').textContent = '전체 화면 해제됨';
    $('warn-count').hidden = true;
    $('warn-text').textContent = '전체 화면에서만 평가 진행 가능, 해제 기록이 선생님께 전달됨';
    ov.dataset.type = 'fullscreen';
  }
  $('warn-btn').textContent = document.fullscreenElement ? '돌아가기' : '전체 화면으로 돌아가기';
  ov.classList.add('on');
};
$('warn-btn').onclick = async () => {
  if (!document.fullscreenElement) await Guard.enterFullscreen();
  $('ov-warn').classList.remove('on');
};
window.addEventListener('beforeunload', e => {
  if (S.dirty && S.work) saveWork(true);
  if (Guard.active) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- 시작 ---------- */
Guard.init();
(async () => {
  let sess = null;
  try { sess = JSON.parse(sessionStorage.getItem('pa-session')); } catch (e) {}
  if (sess && sess.id) {
    const r = await API.call('login', sess);
    if (r.ok && !r.needSetup) {
      Object.assign(S, { id: sess.id, name: sess.name, pw: sess.pw });
      return afterLogin(r, true);
    }
    try { sessionStorage.removeItem('pa-session'); } catch (e) {}
  }
  show('s-login');
  $('in-id').focus();
})();
