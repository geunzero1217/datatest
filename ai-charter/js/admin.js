// 관리 화면
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const AKEY = CONFIG.KEY + '-admin';
let PW = '';
let D = { students: [], answers: [], records: [], locked: true, guide: '', aiReady: false };
let ROWS = [];          // 화면 목록 (학생 + 답안 + 생기부)
const SEL = new Set();

let toastTimer = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800); }
function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
const call = (action, data, onRetry) => API.call(action, Object.assign({ adminPw: PW }, data || {}), onRetry);
const classOf = id => { const s = String(id); return s.length === 5 ? `${s[0]}학년 ${Number(s.slice(1, 3))}반` : '기타'; };
const modeName = m => (ACTIVITY.modes[m] || {}).name || '';
const ruleOf = a => a ? (a.mode === 'group' ? a.s2_mine : a.s2_rule) || '' : '';
// 나이스 기준 : 한글 3바이트, 영문 숫자 공백 1바이트, 줄바꿈 2바이트
const bytesOf = s => Array.from(String(s || '')).reduce((n, c) => n + (c === '\n' ? 2 : c.charCodeAt(0) > 127 ? 3 : 1), 0);
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('복사함'); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* 무시 */ }
    ta.remove(); toast(ok ? '복사함' : '복사 실패, 직접 선택해 복사'); return ok;
  }
}
function modal(html, wide) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  bg.addEventListener('mousedown', e => { if (e.target === bg && !bg.dataset.busy) bg.remove(); });
  return bg;
}

/* ---------- 로그인 ---------- */
async function adminLogin(pw) {
  $('#a-err').textContent = '';
  const b = $('#a-go'); b.disabled = true; b.textContent = '확인 중';
  const r = await API.call('adminLogin', { adminPw: pw });
  b.disabled = false; b.textContent = '들어가기';
  if (!r.ok) { $('#a-err').textContent = r.error; try { sessionStorage.removeItem(AKEY); } catch (e) { /* 무시 */ } return; }
  PW = pw;
  try { sessionStorage.setItem(AKEY, pw); } catch (e) { /* 무시 */ }
  show('s-admin');
  load();
}

/* ---------- 목록 ---------- */
async function load() {
  $('#rows').innerHTML = '<tr><td colspan="11" class="muted" style="text-align:center;padding:30px">불러오는 중</td></tr>';
  const r = await call('adminList', {}, () => toast('연결이 느려 다시 불러오는 중'));
  if (!r.ok) { toast(r.error); return; }
  D = r;
  const A = {}, R = {};
  r.answers.forEach(a => { A[a.id] = a; });
  r.records.forEach(x => { R[x.id] = x; });
  ROWS = r.students.map(s => {
    const a = A[s.id] || null, rec = R[s.id] || null, p = progressOf(a);
    const status = !s.lastAt ? '미접속' : a && a.submittedAt ? (a.updatedAt > a.submittedAt ? '제출 후 수정' : '제출') : a && a.mode ? '작성 중' : '접속만';
    return { s, a, rec, p, status, cls: classOf(s.id) };
  }).sort((x, y) => x.s.id.localeCompare(y.s.id));
  [...SEL].forEach(id => { if (!ROWS.some(x => x.s.id === id)) SEL.delete(id); });
  // 반 목록
  const cur = $('#f-class').value;
  const classes = [...new Set(ROWS.map(x => x.cls))];
  $('#f-class').innerHTML = '<option value="">전체 반</option>' + classes.map(c => `<option${c === cur ? ' selected' : ''}>${c}</option>`).join('');
  if (document.activeElement !== $('#guide')) $('#guide').value = r.guide || '';
  renderLock();
  renderList();
}

function filtered() {
  const c = $('#f-class').value, st = $('#f-status').value, q = $('#f-q').value.trim();
  return ROWS.filter(x => {
    if (c && x.cls !== c) return false;
    if (st === '제출' && !(x.a && x.a.submittedAt)) return false;
    if (st === '작성 중' && !(x.a && x.a.mode && !x.a.submittedAt)) return false;
    if (st === '미작성' && x.a && x.a.mode) return false;
    if (st === '생기부 있음' && !(x.rec && x.rec.text)) return false;
    if (st === '생기부 없음' && !(x.a && x.a.submittedAt && !(x.rec && x.rec.text))) return false;
    if (st === '우수' && !(x.rec && x.rec.star)) return false;
    if (q) {
      const hay = [x.s.id, x.s.name].concat(x.a ? ALL_FIELDS.map(f => x.a[f.key]) : [], x.rec ? [x.rec.text] : []).join(' ');
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });
}

const STATUS_BADGE = { '미접속': 'gray', '접속만': 'gray', '작성 중': 'blue', '제출': 'green', '제출 후 수정': 'orange' };
function renderList() {
  const list = filtered();
  const all = ROWS.length, sub = ROWS.filter(x => x.a && x.a.submittedAt).length;
  const writing = ROWS.filter(x => x.a && x.a.mode && !x.a.submittedAt).length;
  const recs = ROWS.filter(x => x.rec && x.rec.text).length, stars = ROWS.filter(x => x.rec && x.rec.star).length;
  $('#stats').innerHTML = [['전체 학생', all, '명'], ['제출', sub, '명'], ['작성 중', writing, '명'], ['생기부 작성', recs, '명'], ['우수 표시', stars, '명']]
    .map(([k, v, u]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}<small>${u}</small></div></div>`).join('');
  $('#empty').hidden = list.length > 0;
  $('#rows').innerHTML = list.map(x => {
    const id = esc(x.s.id), rule = ruleOf(x.a);
    return `<tr data-id="${id}">
      <td class="ck"><input type="checkbox" data-ck="${id}"${SEL.has(x.s.id) ? ' checked' : ''} aria-label="${id} 선택"></td>
      <td>${id}</td><td class="nm">${esc(x.s.name)}</td>
      <td>${x.a && x.a.mode ? esc(modeName(x.a.mode)) : '<span class="muted">-</span>'}</td>
      <td>${x.a && x.a.mode ? `${x.p.done}/${x.p.total}` : '<span class="muted">-</span>'}</td>
      <td><span class="badge ${STATUS_BADGE[x.status] || 'gray'}">${x.status}</span></td>
      <td class="muted">${esc((x.a && x.a.updatedAt || '').slice(5, 16))}</td>
      <td class="rule" title="${esc(rule)}">${rule ? esc(rule) : '<span class="muted">-</span>'}</td>
      <td>${x.rec && x.rec.text ? `<span class="badge purple">${esc(x.rec.area || '작성')}</span>` : '<span class="muted">-</span>'}</td>
      <td><button class="star-btn" data-star="${id}" aria-label="우수 표시">${icon(x.rec && x.rec.star ? 'star' : 'starOff', 22)}</button></td>
      <td><button class="btn sm soft" data-open="${id}">보기</button></td></tr>`;
  }).join('');
  $('#ck-all').checked = list.length > 0 && list.every(x => SEL.has(x.s.id));
  $('#sel-n').textContent = SEL.size ? `${SEL.size}명 선택` : '';
}

function renderLock() {
  const b = $('#lock-btn');
  b.textContent = D.locked ? '활동 열기' : '활동 닫기';
  b.className = 'btn sm ' + (D.locked ? '' : 'red');
  b.title = D.locked ? '지금 닫힘, 학생 저장 불가' : '지금 열림, 학생 작성 가능';
}

/* ---------- 답안 보기와 생기부 ---------- */
function ansHtml(a) {
  if (!a || !a.mode) return '<p class="muted">아직 작성한 내용 없음</p>';
  const v = s => String(s || '').trim() ? `<div class="v">${esc(s)}</div>` : '<div class="v none">(비어 있음)</div>';
  let h = `<div class="ans"><div class="l">활동 방식</div><div class="v">${esc(modeName(a.mode))}</div></div>`;
  ACTIVITY.meta.filter(f => !f.only || f.only === a.mode).forEach(f => { h += `<div class="ans"><div class="l">${esc(f.label)}</div>${v(a[f.key])}</div>`; });
  ACTIVITY.steps.forEach((s, i) => {
    h += `<div class="ans-step">STEP ${i + 1}. ${esc(s.name)}</div>`;
    s.fields.filter(f => !f.only || f.only === a.mode).forEach(f => { h += `<div class="ans"><div class="l">${esc(f.label)}</div>${v(a[f.key])}</div>`; });
  });
  return h;
}

async function openDetail(id) {
  const bg = modal('<div class="dv-head"><h2>불러오는 중</h2></div>', true);
  const r = await call('adminDetail', { id });
  if (!r.ok) { bg.remove(); toast(r.error); return; }
  const { student: s, answer: a, record: rec } = r;
  const sub = a && a.submittedAt ? `<span class="badge green">제출 ${esc(a.submittedAt.slice(5, 16))}</span>` : a && a.mode ? '<span class="badge blue">작성 중</span>' : '<span class="badge gray">미작성</span>';
  const area = (rec && rec.area) || '진로활동';
  bg.querySelector('.modal').innerHTML = `
    <div class="dv-head"><h2>${esc(s.id)} ${esc(s.name)}</h2>${sub}
      <span class="muted">첫 접속 ${esc(s.firstAt || '-')} | 마지막 ${esc(s.lastAt || '-')}</span>
      <div class="spacer"></div>
      ${a && a.submittedAt ? '<button class="btn sm gray" id="d-unsub">제출 취소</button>' : ''}
      <button class="btn sm gray" id="d-reset">비밀번호 초기화</button>
      <button class="btn sm" id="d-close">닫기</button></div>
    <div class="dv-body">
      <div class="dv-col">${ansHtml(a)}</div>
      <div class="dv-col">
        <h2 style="margin-bottom:14px">${icon('sparkle', 22)} 생활기록부 문장</h2>
        <div class="gen-opts">
          <div class="field"><label class="fl" for="g-area">영역</label><select class="input sel" id="g-area" style="width:100%">${RECORD_AREAS.map(x => `<option${x === area ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label class="fl" for="g-len">글자 수 (공백 포함)</label><input class="input sel" id="g-len" type="number" min="80" max="1500" step="10" value="${esc(localStorage.getItem(AKEY + '-len') || 300)}" style="width:100%"></div>
        </div>
        <div class="field"><label class="fl" for="g-req">요청 사항</label><span class="fh">이 학생에게만 더할 요청 (기본 요청은 아래 카드에서 같이 관리)</span>
          <textarea class="ta" id="g-req" rows="3" placeholder="예) 학생의 관심 분야인 간호와 연결, 마지막 문장은 성장 가능성으로">${esc(rec && rec.req ? rec.req : D.guide || '')}</textarea></div>
        <div class="gen-btns">
          <button class="btn md purple" id="g-gen"${a && a.mode ? '' : ' disabled'}>${icon('sparkle', 18)}AI로 만들기</button>
          <button class="btn md gray" id="g-prompt"${a && a.mode ? '' : ' disabled'}>프롬프트 복사</button>
        </div>
        <div id="g-howto"></div>
        <div class="field"><label class="fl" for="g-text">생기부 문장 (직접 고치기 가능)</label>
          <textarea class="ta" id="g-text" rows="9" placeholder="AI로 만들거나 직접 쓰기, 저장하면 다른 선생님도 볼 수 있음">${esc(rec && rec.text || '')}</textarea>
          <div class="rec-meta"><span id="g-count"></span><span>${rec && rec.at ? '마지막 저장 ' + esc(rec.at) : '저장 전'}</span></div></div>
        <div class="row-end"><span class="muted" id="g-state"></span><button class="btn md gray" id="g-copy">문장 복사</button><button class="btn md" id="g-save">저장</button></div>
      </div>
    </div>`;
  const opts = () => ({ id: s.id, area: $('#g-area', bg).value, len: Number($('#g-len', bg).value) || 300, req: $('#g-req', bg).value });
  const count = () => {
    const t = $('#g-text', bg).value, len = Number($('#g-len', bg).value) || 300;
    $('#g-count', bg).innerHTML = `<b class="${t.length > len * 1.1 ? 'over' : ''}">${t.length}자</b> (목표 ${len}자) | ${bytesOf(t)}바이트`;
  };
  count();
  $('#g-text', bg).addEventListener('input', () => { count(); $('#g-state', bg).textContent = '저장 안 됨'; });
  $('#g-len', bg).addEventListener('input', () => { count(); try { localStorage.setItem(AKEY + '-len', $('#g-len', bg).value); } catch (e) { /* 무시 */ } });
  $('#d-close', bg).onclick = () => bg.remove();
  $('#d-reset', bg).onclick = () => resetPw(s);
  if ($('#d-unsub', bg)) $('#d-unsub', bg).onclick = async () => {
    if (!confirm(`${s.id} ${s.name} 제출 취소 (답은 그대로, 상태만 작성 중)?`)) return;
    const x = await call('adminUnsubmit', { id: s.id }); toast(x.ok ? '제출 취소함' : x.error); if (x.ok) { bg.remove(); load(); }
  };
  const showHowto = prompt => {
    $('#g-howto', bg).innerHTML = `<div class="howto"><b>AI 키가 없어 직접 만드는 방법</b><ol>
      <li>프롬프트 복사 (복사함)</li><li>Claude 같은 AI 채팅 창에 붙여넣기</li><li>나온 문장을 아래 칸에 붙여넣고 저장</li></ol>
      <div class="muted" style="margin-top:6px">프롬프트에는 학생 이름과 학번이 들어가지 않음</div>
      <details style="margin-top:8px"><summary style="cursor:pointer">프롬프트 보기 (복사가 안 되면 여기서 직접 복사)</summary>
      <textarea class="ta" readonly rows="8" style="margin-top:8px;font-size:13px">${esc(prompt)}</textarea></details></div>`;
    copyText(prompt);
  };
  $('#g-prompt', bg).onclick = async () => {
    const x = await call('adminPrompt', opts());
    if (!x.ok) { toast(x.error); return; }
    showHowto(x.prompt);
  };
  $('#g-gen', bg).onclick = async () => {
    const b = $('#g-gen', bg), old = b.innerHTML;
    if ($('#g-text', bg).value.trim() && !confirm('지금 칸의 문장을 새로 만든 문장으로 바꿈, 계속?')) return;
    b.disabled = true; b.textContent = '만드는 중 (10~40초)'; bg.dataset.busy = '1';
    const x = await call('adminGenerate', opts());
    b.disabled = false; b.innerHTML = old; delete bg.dataset.busy;
    if (!x.ok) { if (x.noKey) showHowto(x.prompt); else toast(x.error); return; }
    $('#g-text', bg).value = x.text; count();
    await save();
  };
  async function save() {
    const o = opts();
    $('#g-state', bg).textContent = '저장 중';
    const x = await call('adminSaveRecord', { id: s.id, text: $('#g-text', bg).value, req: o.req, area: o.area });
    $('#g-state', bg).textContent = x.ok ? '저장됨 ' + x.record.at.slice(11, 16) : x.error;
    if (x.ok) { const row = ROWS.find(y => y.s.id === s.id); if (row) { row.rec = x.record; renderList(); } }
  }
  $('#g-save', bg).onclick = save;
  $('#g-copy', bg).onclick = () => copyText($('#g-text', bg).value);
}

async function resetPw(s) {
  if (!confirm(`${s.id} ${s.name} 비밀번호를 임의의 4자리로 초기화?`)) return;
  const r = await call('adminResetPw', { id: s.id });
  if (!r.ok) { toast(r.error); return; }
  const bg = modal(`<h2>임시 비밀번호</h2><p class="sub" style="margin:0">${esc(s.id)} ${esc(s.name)}<br>지금 한 번만 보임, 학생에게 알려 주기</p>
    <div style="font-size:44px;font-weight:800;letter-spacing:8px;text-align:center;margin:18px 0">${esc(r.tempPw)}</div>
    <div class="row"><button class="btn" id="t-ok">확인</button></div>`);
  $('#t-ok', bg).onclick = () => bg.remove();
}

/* ---------- 선택 작업 ---------- */
function selectedRows() { return ROWS.filter(x => SEL.has(x.s.id)); }

function bulkGenerate() {
  const rows = selectedRows().filter(x => x.a && x.a.mode);
  if (!rows.length) { toast('작성한 활동지가 있는 학생을 먼저 선택'); return; }
  const has = rows.filter(x => x.rec && x.rec.text).length;
  const bg = modal(`<h2>${icon('sparkle', 22)} 선택 ${rows.length}명 생기부 만들기</h2>
    <p class="muted" style="margin:4px 0 14px">한 명씩 차례로 만듦 (1명에 10~40초), 만든 문장은 바로 저장</p>
    <div class="gen-opts">
      <div class="field"><label class="fl" for="b-area">영역</label><select class="input sel" id="b-area" style="width:100%">${RECORD_AREAS.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="field"><label class="fl" for="b-len">글자 수</label><input class="input sel" id="b-len" type="number" min="80" max="1500" step="10" value="${esc(localStorage.getItem(AKEY + '-len') || 300)}" style="width:100%"></div>
    </div>
    <div class="field"><label class="fl" for="b-req">요청 사항 (모두에게 같이 적용)</label><textarea class="ta" id="b-req" rows="3">${esc(D.guide || '')}</textarea></div>
    ${has ? `<label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:8px"><input type="checkbox" id="b-skip" checked>이미 생기부가 있는 ${has}명은 건너뛰기</label>` : ''}
    <div class="progress-list" id="b-prog"></div>
    <div class="row"><button class="btn gray" id="b-no">닫기</button><button class="btn purple" id="b-go">만들기 시작</button></div>`);
  let stop = false;
  $('#b-no', bg).onclick = () => { stop = true; bg.remove(); load(); };
  $('#b-go', bg).onclick = async () => {
    const area = $('#b-area', bg).value, len = Number($('#b-len', bg).value) || 300, req = $('#b-req', bg).value;
    const skip = $('#b-skip', bg) && $('#b-skip', bg).checked;
    const todo = rows.filter(x => !(skip && x.rec && x.rec.text));
    const b = $('#b-go', bg); b.disabled = true;
    if (!todo.length) { b.textContent = '새로 만들 학생 없음'; return; }
    const prog = $('#b-prog', bg);
    prog.innerHTML = todo.map(x => `<div data-p="${esc(x.s.id)}"><span>${esc(x.s.id)} ${esc(x.s.name)}</span><span class="muted">대기</span></div>`).join('');
    let ok = 0;
    for (const x of todo) {
      if (stop) return;
      const cell = $(`[data-p="${x.s.id}"] span:last-child`, prog);
      cell.textContent = '만드는 중'; cell.scrollIntoView({ block: 'nearest' });
      const g = await call('adminGenerate', { id: x.s.id, area, len, req });
      if (!g.ok) {
        cell.textContent = g.noKey ? 'AI 키 없음' : '실패';
        cell.style.color = 'var(--red)';
        if (g.noKey) { toast('AI 키가 설정되지 않음, 학생별 보기에서 프롬프트 복사로 진행'); break; }
        continue;
      }
      const sv = await call('adminSaveRecord', { id: x.s.id, text: g.text, req, area });
      cell.textContent = sv.ok ? `완료 ${g.text.length}자` : '저장 실패';
      if (sv.ok) { ok++; cell.style.color = 'var(--green)'; }
    }
    b.textContent = `${ok}명 완료`; toast(`${ok}명 생기부 저장`);
  };
}

function csvExport() {
  const rows = SEL.size ? selectedRows() : filtered();
  if (!rows.length) { toast('내보낼 학생 없음'); return; }
  const head = ['학번', '이름', '반', '활동 방식'].concat(ALL_FIELDS.map(f => f.label), ['상태', '제출 시간', '마지막 저장', '생기부 영역', '생기부 내용', '생기부 글자 수', '우수']);
  const lines = [head].concat(rows.map(x => [x.s.id, x.s.name, x.cls, x.a ? modeName(x.a.mode) : '']
    .concat(ALL_FIELDS.map(f => x.a ? x.a[f.key] || '' : ''),
      [x.status, x.a ? x.a.submittedAt || '' : '', x.a ? x.a.updatedAt || '' : '', x.rec ? x.rec.area || '' : '', x.rec ? x.rec.text || '' : '', x.rec && x.rec.text ? x.rec.text.length : '', x.rec && x.rec.star ? '우수' : ''])));
  const csv = '﻿' + lines.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `AI윤리헌장_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${rows.length}명 CSV 저장${SEL.size ? '' : ' (선택 없음, 지금 목록 전체)'}`);
}

async function deleteSelected() {
  const rows = selectedRows();
  if (!rows.length) { toast('삭제할 학생 먼저 선택'); return; }
  if (!confirm(`${rows.length}명의 계정, 활동지, 생기부 문장을 모두 삭제\n되돌릴 수 없음, 계속?\n\n${rows.slice(0, 10).map(x => x.s.id + ' ' + x.s.name).join('\n')}${rows.length > 10 ? '\n...' : ''}`)) return;
  const r = await call('adminDeleteStudents', { ids: rows.map(x => x.s.id) });
  toast(r.ok ? `${r.deleted}명 삭제` : r.error);
  SEL.clear(); load();
}

function showQR() {
  const url = new URL('./', location.href).href;
  const bg = modal(`<h2>학생 주소</h2><p class="muted" style="margin:4px 0 0">수업 화면에 띄우거나 계획서에 넣기</p>
    <div id="qr-box"></div><div class="url-box">${esc(url)}</div>
    <div class="row"><button class="btn gray" id="q-copy">주소 복사</button><button class="btn" id="q-ok">닫기</button></div>`);
  try { new QRCode($('#qr-box', bg), { text: url, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.M }); }
  catch (e) { $('#qr-box', bg).innerHTML = '<p class="muted">QR 만들기 실패 (인터넷 연결 확인)</p>'; }
  $('#q-copy', bg).onclick = () => copyText(url);
  $('#q-ok', bg).onclick = () => bg.remove();
}

/* ---------- 이벤트 ---------- */
$('#a-go').addEventListener('click', () => adminLogin($('#a-pw').value));
$('#a-pw').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin($('#a-pw').value); });
$('#out-btn').addEventListener('click', () => { try { sessionStorage.removeItem(AKEY); } catch (e) { /* 무시 */ } PW = ''; $('#a-pw').value = ''; show('s-login'); });
$('#reload-btn').addEventListener('click', load);
$('#qr-btn').addEventListener('click', showQR);
$('#lock-btn').addEventListener('click', async () => {
  const next = !D.locked;
  if (!confirm(next ? '활동 닫기 : 학생 저장, 제출 불가 (보기만 가능)' : '활동 열기 : 학생 작성, 제출 가능')) return;
  const r = await call('adminSetLock', { locked: next });
  if (!r.ok) { toast(r.error); return; }
  D.locked = r.locked; renderLock(); toast(r.locked ? '활동 닫음' : '활동 열림');
});
['#f-class', '#f-status'].forEach(s => $(s).addEventListener('change', renderList));
$('#f-q').addEventListener('input', renderList);
$('#rows').addEventListener('click', async e => {
  const ck = e.target.closest('[data-ck]'), op = e.target.closest('[data-open]'), st = e.target.closest('[data-star]');
  if (ck) { ck.checked ? SEL.add(ck.dataset.ck) : SEL.delete(ck.dataset.ck); renderList(); return; }
  if (op) { openDetail(op.dataset.open); return; }
  if (st) {
    const row = ROWS.find(x => x.s.id === st.dataset.star);
    const next = !(row.rec && row.rec.star);
    const r = await call('adminSetStar', { id: row.s.id, star: next });
    if (!r.ok) { toast(r.error); return; }
    row.rec = Object.assign({ id: row.s.id, text: '', area: '' }, row.rec, { star: r.star }); renderList();
  }
});
$('#ck-all').addEventListener('change', e => { filtered().forEach(x => e.target.checked ? SEL.add(x.s.id) : SEL.delete(x.s.id)); renderList(); });
$('#bulk-gen').addEventListener('click', bulkGenerate);
$('#csv-btn').addEventListener('click', csvExport);
$('#del-btn').addEventListener('click', deleteSelected);
$('#guide-save').addEventListener('click', async () => {
  $('#guide-state').textContent = '저장 중';
  const r = await call('adminSetGuide', { guide: $('#guide').value });
  $('#guide-state').textContent = r.ok ? '저장됨' : r.error; if (r.ok) D.guide = $('#guide').value;
});
$('#roster-add').addEventListener('click', async () => {
  const list = $('#roster').value.split(/\r?\n/).map(l => l.trim().split(/[\s,\t]+/)).filter(p => p[0]).map(p => ({ id: p[0], name: p.slice(1).join('') }));
  if (!list.length) return;
  $('#roster-state').textContent = '추가 중';
  const r = await call('adminAddStudents', { list });
  $('#roster-state').textContent = r.ok ? `${r.added}명 추가, ${r.skipped}명 건너뜀 (형식 오류 또는 이미 있음)` : r.error;
  if (r.ok) { $('#roster').value = ''; load(); }
});

fillIcons();
if (API.isLocal) { $('#a-local').hidden = false; $('#test-badge').hidden = false; }
(() => { let p = ''; try { p = sessionStorage.getItem(AKEY) || ''; } catch (e) { /* 무시 */ } if (p) adminLogin(p); })();
