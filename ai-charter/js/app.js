// 학생 화면
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const SKEY = CONFIG.KEY + '-session';
let ME = null;          // { id, name, pw }
let A = {};             // 답안 (mode + 칸 key)
let INFO = { locked: true, submittedAt: '', updatedAt: '' };
let dirty = false, saving = false, saveTimer = null, failCount = 0;

function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); window.scrollTo(0, 0); }
let toastTimer = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
const hhmm = s => String(s || '').slice(11, 16);
const draftKey = () => CONFIG.KEY + '-draft-' + ME.id;
function keepDraft() { try { localStorage.setItem(draftKey(), JSON.stringify(A)); } catch (e) { /* 저장 공간 없음 */ } }

/* ---------- 로그인 ---------- */
async function login(pwConfirm) {
  const id = $('#l-id').value.trim(), name = $('#l-name').value.trim(), pw = $('#l-pw').value.trim();
  const errEl = pwConfirm ? $('#p-err') : $('#l-err');
  const btn = pwConfirm ? $('#p-go') : $('#l-go');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = '확인 중';
  const r = await API.call('login', { id, name, pw, pwConfirm }, () => { btn.textContent = '연결이 느려 다시 시도 중'; });
  btn.disabled = false; btn.textContent = pwConfirm ? '비밀번호 정하고 시작' : '시작하기';
  if (!r.ok) { errEl.textContent = r.error; return; }
  if (r.needSetup) { $('#p-pw2').value = ''; $('#p-err').textContent = ''; show('s-setup'); setTimeout(() => $('#p-pw2').focus(), 50); return; }
  ME = { id: r.student.id, name: r.student.name, pw };
  try { sessionStorage.setItem(SKEY, JSON.stringify(ME)); } catch (e) { /* 무시 */ }
  start(r);
}

function start(r) {
  INFO = { locked: !!r.locked, submittedAt: (r.answer && r.answer.submittedAt) || '', updatedAt: (r.answer && r.answer.updatedAt) || '' };
  A = {};
  if (r.answer) { A.mode = r.answer.mode; ALL_FIELDS.forEach(f => { A[f.key] = r.answer[f.key] || ''; }); }
  dirty = false;
  // 서버에 저장된 것이 없는데 이 기기에 쓰던 내용이 있으면 이어서 씀
  if (!r.answer) {
    try { const d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); if (d && d.mode) { A = d; dirty = true; } } catch (e) { /* 무시 */ }
  }
  $('#who').textContent = ME.id + ' ' + ME.name;
  render();
  show('s-work');
  setSaveState(r.answer ? '불러옴 ' + hhmm(INFO.updatedAt) : '');
  if (dirty) scheduleSave();
  if (r.answer) toast('저장된 내용 불러옴');
}

/* ---------- 그리기 ---------- */
function fieldHtml(f) {
  const id = 'f-' + f.key, dis = INFO.locked ? ' disabled' : '';
  const hint = f.hint ? `<span class="fh">${esc(f.hint)}</span>` : '';
  let body = '';
  if (f.type === 'in') body = `<input class="input" id="${id}" data-k="${f.key}" autocomplete="off" maxlength="300"${dis}>`;
  else if (f.type === 'ta') body = `<textarea class="ta" id="${id}" data-k="${f.key}" rows="${f.rows || 4}" maxlength="3000"${dis}></textarea><div class="count" data-count="${f.key}"></div>`;
  else if (f.type === 'pick') body = `<div class="chips" role="radiogroup" aria-label="${esc(f.label)}">${f.opts.map((o, i) =>
    `<label class="chip"><input type="radio" name="r-${f.key}" id="${id}-${i}" data-k="${f.key}" value="${esc(o)}"${dis}><span>${esc(o)}</span></label>`).join('')}</div>`;
  const lab = f.type === 'pick' ? `<span class="fl">${esc(f.label)}</span>` : `<label class="fl" for="${id}">${esc(f.label)}</label>`;
  return `<div class="field"${f.only ? ` data-only="${f.only}"` : ''}>${lab}${hint}${body}</div>`;
}

function render() {
  const modes = Object.entries(ACTIVITY.modes).map(([k, m]) =>
    `<label class="mode"><input type="radio" name="mode" data-k="mode" value="${k}"${INFO.locked ? ' disabled' : ''}><div class="art">${icon(k, 34)}</div><div><b>${esc(m.name)}</b><span>${esc(m.desc)}, ${esc(m.time)}</span></div></label>`).join('');
  const notice = INFO.locked
    ? `<div class="notice gray">${icon('lock', 22)}활동이 닫혀 있음, 내용 보기만 가능 (선생님이 열면 작성 가능)</div>` : '';
  const hero = `<section class="card hero" id="top">${notice}
    <p class="eyebrow">${esc(ACTIVITY.eyebrow)}</p><h1>${esc(ACTIVITY.heading)}</h1>
    <p class="lead">${esc(ACTIVITY.lead)}</p>
    <div class="terms">${ACTIVITY.terms.map(([a, b]) => `<span><b>${esc(a)}</b>${esc(b)}</span>`).join('')}</div>
    <h2 style="margin-top:28px">활동 방식 고르기</h2>
    <div class="modes" role="radiogroup" aria-label="활동 방식">${modes}</div>
    <div class="meta-grid" data-needmode>${ACTIVITY.meta.map(fieldHtml).join('')}</div>
  </section>`;
  const steps = ACTIVITY.steps.map((s, i) => `<section class="card" id="${s.id}" data-needmode>
    <div class="step-head"><div class="glyph">${i + 1}</div><div><h2>${esc(s.name)}</h2><p>STEP ${i + 1} <span data-time="${s.id}"></span></p></div></div>
    <div class="qbox">${esc(s.q)}</div>${s.fields.map(fieldHtml).join('')}</section>`).join('');
  const submit = `<section class="card" id="submit" data-needmode>
    <div class="step-head"><div class="glyph">${icon('check', 26).replace('#00A661', 'transparent')}</div><div><h2>제출하기</h2><p>제출 후에도 활동이 열려 있으면 고쳐서 다시 제출 가능</p></div></div>
    <div id="sub-state"></div>
    <ul class="missing" id="missing"></ul>
    <div class="submit-row"><button class="btn" id="submit-btn"${INFO.locked ? ' disabled' : ''}>제출하기</button><span class="muted">쓰는 내용은 몇 초마다 자동 저장</span></div>
  </section>`;
  const waiting = `<div class="notice blue" id="waiting">${icon('solo', 22)}위에서 개별 활동 또는 모둠 활동을 고르면 활동지가 나타남</div>`;
  $('#main').innerHTML = hero + waiting + steps + submit;
  const nav = ACTIVITY.steps.map((s, i) => `<a href="#${s.id}" data-nav="${s.id}"><span class="n">${i + 1}</span><span>${esc(s.name)}<small>${esc(s.time.solo)}</small></span></a>`).join('');
  $('#side').innerHTML = `<a href="#top"><span class="n">${icon('charter', 18)}</span><span>활동 소개<small>활동 방식 고르기</small></span></a>${nav}
    <a href="#submit" data-nav="submit"><span class="n">${icon('check', 26).replace('#00A661', 'transparent')}</span><span>제출하기<small>빈칸 확인</small></span></a>
    <div class="side-foot">필수 칸 작성<div class="bar"><i id="bar"></i></div><div id="bar-t" style="margin-top:6px"></div></div>`;
  $$('[data-k]').forEach(el => {
    const v = A[el.dataset.k];
    if (el.type === 'radio') el.checked = v === el.value; else el.value = v == null ? '' : v;
  });
  $('#submit-btn').addEventListener('click', trySubmit);
  sync();
}

function sync() {
  const m = A.mode;
  $$('[data-only]').forEach(el => { el.hidden = el.dataset.only !== m; });
  $$('[data-needmode]').forEach(el => { el.hidden = !m; });
  $('#waiting').hidden = !!m;
  $$('#side a[data-nav]').forEach(a => { a.hidden = !m; });
  ACTIVITY.steps.forEach(s => {
    const t = $(`[data-time="${s.id}"]`); if (t) t.textContent = m ? '| ' + ACTIVITY.modes[m].name + ' ' + s.time[m] : '';
    const a = $(`[data-nav="${s.id}"]`);
    if (a) {
      a.querySelector('small').textContent = m ? s.time[m] : s.time.solo;
      const need = s.fields.filter(f => (!f.only || f.only === m));
      a.classList.toggle('done', !!m && need.some(f => String(A[f.key] || '').trim()) && need.filter(f => f.need).every(f => String(A[f.key] || '').trim()));
    }
  });
  $$('[data-count]').forEach(el => { el.textContent = String(A[el.dataset.count] || '').length + '자'; });
  const p = progressOf(A);
  $('#bar').style.width = (p.total ? p.done / p.total * 100 : 0) + '%';
  $('#bar-t').textContent = m ? `${p.done} / ${p.total}칸` : '활동 방식 먼저 고르기';
  // 제출 상태
  const miss = m ? fieldsFor(m).filter(f => f.need) : [];
  $('#missing').innerHTML = miss.map(f => {
    const ok = !!String(A[f.key] || '').trim();
    return `<li class="${ok ? 'ok' : ''}">${ok ? icon('check', 20) : '<span class="dot"></span>'}${esc(f.label.replace(/^[①②③④⑤]\s*/, ''))}</li>`;
  }).join('');
  const changed = INFO.submittedAt && (dirty || INFO.updatedAt > INFO.submittedAt);
  $('#sub-state').innerHTML = !INFO.submittedAt ? ''
    : changed ? `<div class="notice orange">${icon('warning', 22)}${hhmm(INFO.submittedAt)} 제출 후 고친 내용 있음, 다시 제출 필요</div>`
    : `<div class="notice green">${icon('check', 22)}제출 완료 (${esc(INFO.submittedAt)})</div>`;
  $('#submit-btn').textContent = INFO.submittedAt ? '고친 내용 다시 제출' : '제출하기';
  $('#submit-btn').disabled = INFO.locked || !!(INFO.submittedAt && !changed);
}

/* ---------- 저장 ---------- */
function setSaveState(t, isErr) { const el = $('#save-state'); el.textContent = t; el.classList.toggle('err', !!isErr); }
function onEdit(e) {
  const t = e.target;
  if (!t || !t.dataset || !t.dataset.k || INFO.locked) return;
  if (t.type === 'radio' && !t.checked) return;
  A[t.dataset.k] = t.value;
  dirty = true;
  keepDraft();
  sync();
  setSaveState('입력 중');
  scheduleSave();
}
function scheduleSave(delay) { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, delay == null ? CONFIG.AUTOSAVE_SEC * 1000 : delay); }
async function saveNow() {
  if (!dirty || !ME || INFO.locked) return true;
  if (saving) { scheduleSave(1000); return false; }
  saving = true; dirty = false;
  setSaveState('저장 중');
  const r = await API.call('save', { id: ME.id, pw: ME.pw, answer: A }, () => setSaveState('연결이 느려 다시 저장 중'));
  saving = false;
  if (!r.ok) {
    dirty = true;
    if (r.network) { failCount++; setSaveState('저장 실패, 다시 시도 중', true); scheduleSave(Math.min(30000, 4000 * failCount)); }
    else { setSaveState(r.error, true); if (/닫혀/.test(r.error)) { INFO.locked = true; render(); } }
    return false;
  }
  failCount = 0;
  INFO.updatedAt = r.updatedAt; INFO.submittedAt = r.submittedAt || INFO.submittedAt;
  setSaveState('저장됨 ' + hhmm(r.updatedAt));
  sync();
  return true;
}

/* ---------- 제출 ---------- */
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  return bg;
}
function trySubmit() {
  const miss = fieldsFor(A.mode).filter(f => f.need && !String(A[f.key] || '').trim());
  const bg = modal(`<h2>${miss.length ? '빈칸이 있음' : '제출할까?'}</h2>
    <p class="sub" style="margin:0">${miss.length ? `필수 칸 ${miss.length}개 비어 있음<br>${miss.map(f => esc(f.label.replace(/^[①②③④⑤]\s*/, ''))).join(', ')}<br>그래도 제출 가능, 나중에 고쳐서 다시 제출 가능` : '제출 후에도 활동이 열려 있으면 고쳐서 다시 제출 가능'}</p>
    <div class="error" id="m-err"></div>
    <div class="row"><button class="btn gray" id="m-no">돌아가기</button><button class="btn" id="m-yes">제출하기</button></div>`);
  $('#m-no', bg).onclick = () => bg.remove();
  $('#m-yes', bg).onclick = async () => {
    const b = $('#m-yes', bg); b.disabled = true; b.textContent = '제출 중';
    clearTimeout(saveTimer);
    const r = await API.call('submit', { id: ME.id, pw: ME.pw, answer: A }, () => { b.textContent = '연결이 느려 다시 시도 중'; });
    if (!r.ok) { b.disabled = false; b.textContent = '제출하기'; $('#m-err', bg).textContent = r.error; return; }
    dirty = false;
    INFO.submittedAt = r.submittedAt; INFO.updatedAt = r.updatedAt;
    setSaveState('저장됨 ' + hhmm(r.updatedAt));
    bg.remove(); sync(); toast('제출 완료');
    $('#submit').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}

/* ---------- 시작 ---------- */
document.addEventListener('input', e => { if ($('#s-work').classList.contains('on')) onEdit(e); });
document.addEventListener('change', e => { if ($('#s-work').classList.contains('on') && e.target.type === 'radio') onEdit(e); });
$('#l-go').addEventListener('click', () => login());
$('#p-go').addEventListener('click', () => {
  if ($('#p-pw2').value.trim() !== $('#l-pw').value.trim()) { $('#p-err').textContent = '두 비밀번호가 다름'; return; }
  login($('#p-pw2').value.trim());
});
$('#p-back').addEventListener('click', () => show('s-login'));
['#l-id', '#l-name', '#l-pw'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') login(); }));
$('#p-pw2').addEventListener('keydown', e => { if (e.key === 'Enter') $('#p-go').click(); });
$('#logout').addEventListener('click', async () => {
  if (dirty && !(await saveNow())) { if (!confirm('저장되지 않은 내용이 있음, 그래도 나갈까?')) return; }
  try { sessionStorage.removeItem(SKEY); } catch (e) { /* 무시 */ }
  ME = null; A = {}; $('#l-pw').value = ''; show('s-login');
});
// 창을 닫거나 다른 페이지로 갈 때 : 저장 안 된 내용을 sendBeacon으로 보냄 (응답은 못 받음)
function flushOnLeave() {
  if (!dirty || !ME || INFO.locked) return;
  const req = { action: 'save', id: ME.id, pw: ME.pw, answer: A };
  if (API.isLocal) { LocalStore.reload(); LocalServer.handle(req); dirty = false; return; }
  try { if (navigator.sendBeacon(CONFIG.API_URL, new Blob([JSON.stringify(req)], { type: 'text/plain' }))) dirty = false; } catch (e) { /* 무시 */ }
}
window.addEventListener('pagehide', flushOnLeave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) saveNow(); });
fillIcons();

// 새로 고침해도 이어서 (같은 탭 안에서만 기억)
(async () => {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { /* 무시 */ }
  if (!s) return;
  $('#l-id').value = s.id; $('#l-name').value = s.name; $('#l-pw').value = s.pw;
  await login();
})();
