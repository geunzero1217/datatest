// 관리자 (교사) 화면
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TEXT_KEYS = TEXT_FIELDS.map(f => f.key);
const dsTitle = id => (DATASETS.find(d => d.id === id) || {}).title || '';
const LEAVE_KINDS = ['탭 이동', '창 이동'];
const WARN_KINDS = ['전체 화면 해제', '창 크기 줄임', '캡처 키', '복사 시도', '붙여넣기 시도', '끌어 놓기 시도', '새로고침'];

const A = { pw: '', students: [], answers: [], locked: false, cls: '', selected: new Set(), timer: null };

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
let toastT;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }
function confirmBox(title, text, yes = '확인', html = '', noCancel = false) {
  return new Promise(res => {
    $('cf-title').textContent = title; $('cf-yes').textContent = yes;
    $('cf-text').innerHTML = html + esc(text);
    $('cf-no').hidden = noCancel;
    $('ov-confirm').classList.add('on');
    const done = v => { $('ov-confirm').classList.remove('on'); res(v); };
    $('cf-yes').onclick = () => done(true); $('cf-no').onclick = () => done(false);
  });
}
async function call(action, data = {}) {
  const r = await API.call(action, Object.assign({ adminPw: A.pw }, data));
  if (!r.ok && /관리자 인증/.test(r.error || '')) { sessionStorage.removeItem('pa-admin'); location.reload(); }
  return r;
}

/* ---------- 계산 ---------- */
const classOf = id => `${id[0]}학년 ${Number(id.slice(1, 3))}반`;
const isComplete = a => !!(a && a.data && a.type && (a.img || a.hasImg) && TEXT_KEYS.every(k => String(a[k] || '').trim()));
function infoOf(s) {
  const ans = [1, 2, 3].map(n => A.answers.find(a => a.id === s.id && Number(a.slot) === n) || null);
  const types = ans.map(a => a && a.type).filter(Boolean);
  const dup = types.length !== new Set(types).size;
  const progress = ans.filter(isComplete).length;
  const leave = Number(s.leaveCount || 0);
  const main = !s.firstAt ? '미접속' : s.submittedAt ? '제출' : '작성 중';
  const flags = [];
  if (dup) flags.push('그래프 중복');
  if (leave >= CONFIG.LEAVE_WARN) flags.push('이탈 주의');
  return { ans, types, dup, progress, leave, main, flags };
}
const MAIN_COLOR = { '미접속': 'gray', '작성 중': 'blue', '제출': 'green' };
const FLAG_COLOR = { '그래프 중복': 'orange', '이탈 주의': 'red' };
const badgesHTML = inf => `<div class="badges"><span class="badge ${MAIN_COLOR[inf.main]}">${inf.main}</span>${inf.flags.map(f => `<span class="badge ${FLAG_COLOR[f]}">${f}</span>`).join('')}</div>`;

/* ---------- 로그인 ---------- */
$('a-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  A.pw = $('a-pw').value;
  const r = await API.call('adminLogin', { adminPw: A.pw });
  if (!r.ok) return ($('a-login-error').textContent = r.error);
  try { sessionStorage.setItem('pa-admin', A.pw); } catch (err) {}
  start();
});
async function start() {
  show('a-main');
  await load();
  clearInterval(A.timer);
  A.timer = setInterval(() => { if (!document.querySelector('.overlay.on')) load(true); }, 30000);
}

/* ---------- 목록 ---------- */
async function load(quiet) {
  const r = await call('adminList');
  if (!r.ok) { if (!quiet) toast(r.error); return; }
  A.students = r.students.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  A.answers = r.answers;
  A.locked = r.locked;
  const d = new Date();
  $('a-updated').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} 기준, 30초마다 자동 새로고침`;
  renderClasses(); render();
}
function renderClasses() {
  const classes = [...new Set(A.students.map(s => classOf(String(s.id))))].sort();
  if (A.cls && !classes.includes(A.cls)) A.cls = '';
  $('a-class').innerHTML = `<option value="">전체 반</option>` + classes.map(c => `<option ${c === A.cls ? 'selected' : ''}>${c}</option>`).join('');
}
$('a-class').onchange = () => { A.cls = $('a-class').value; render(); };
const visible = () => A.students.filter(s => !A.cls || classOf(String(s.id)) === A.cls);

function render() {
  $('a-lock').textContent = A.locked ? '잠금 해제' : '평가 잠금';
  $('a-lock').className = 'btn sm ' + (A.locked ? '' : 'red');
  $('a-lock-notice').innerHTML = A.locked ? '<div class="notice red">🔒 평가 잠김 상태, 학생 저장과 제출 불가</div>' : '';
  const list = visible(), infos = list.map(infoOf);
  const cnt = f => infos.filter(f).length;
  $('a-stats').innerHTML = [
    ['전체', list.length, ''], ['미접속', cnt(i => i.main === '미접속'), ''], ['작성 중', cnt(i => i.main === '작성 중'), ''],
    ['제출', cnt(i => i.main === '제출'), 'green'], ['그래프 중복', cnt(i => i.dup), 'orange'], ['이탈 주의', cnt(i => i.flags.includes('이탈 주의')), 'red'],
  ].map(([k, v, c]) => `<div class="stat ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('a-empty').hidden = list.length > 0;
  $('a-rows').innerHTML = list.map((s, i) => {
    const inf = infos[i];
    const on = A.selected.has(s.id);
    return `<tr class="click ${on ? 'sel' : ''}" data-id="${esc(s.id)}">
      <td class="ck"><input type="checkbox" data-act="check" ${on ? 'checked' : ''}></td>
      <td>${esc(s.id)}</td><td><b>${esc(s.name)}</b></td>
      <td>${s.hasPw ? '<span class="badge gray">설정됨</span> <button class="mini red" data-act="reset">초기화</button>' : '<span class="muted">미설정</span>'}</td>
      <td><div class="prog"><div class="bar"><i style="width:${inf.progress / 3 * 100}%"></i></div>${inf.progress} / 3</div></td>
      <td><div class="types">${inf.ans.map(a => a && a.type ? `<span class="badge ${inf.types.filter(t => t === a.type).length > 1 ? 'orange' : 'gray'}">${esc(a.type)}</span>` : '').join('') || '<span class="muted">-</span>'}</div></td>
      <td>${inf.leave ? `<b style="color:${inf.leave >= CONFIG.LEAVE_WARN ? 'var(--red)' : 'inherit'}">${inf.leave}회</b>` : '<span class="muted">0</span>'}</td>
      <td>${badgesHTML(inf)}</td>
      <td><button class="mini" data-act="detail">답안 보기</button></td>
    </tr>`;
  }).join('');
  $('a-rows').querySelectorAll('tr').forEach(tr => tr.onclick = async e => {
    const id = tr.dataset.id, act = e.target.dataset && e.target.dataset.act;
    if (e.target.classList && e.target.classList.contains('ck')) { const cb = e.target.querySelector('input'); cb.checked = !cb.checked; if (cb.checked) A.selected.add(id); else A.selected.delete(id); render(); return; }
    if (act === 'check') { if (e.target.checked) A.selected.add(id); else A.selected.delete(id); render(); return; }
    if (act === 'reset') {
      const s = A.students.find(x => x.id === id);
      if (!(await confirmBox('비밀번호 초기화', `${s.id} ${s.name}, 임의의 숫자 4자리로 바뀜`, '초기화'))) return;
      const r = await call('adminResetPw', { id });
      if (!r.ok) return toast(r.error);
      await confirmBox('임시 비밀번호', '학생에게 알려 주기. 이 창을 닫으면 다시 볼 수 없음 (필요하면 다시 초기화)', '확인',
        `<span class="temp-pw" style="display:block">${esc(r.tempPw)}</span><b>${esc(s.id)} ${esc(s.name)}</b><br>`, true);
      load(true); return;
    }
    openDetail(id);
  });
  // 선택 상태
  const visIds = list.map(s => s.id), visSel = visIds.filter(id => A.selected.has(id)).length;
  $('a-check-all').checked = visIds.length > 0 && visSel === visIds.length;
  $('a-check-all').indeterminate = visSel > 0 && visSel < visIds.length;
  const n = A.selected.size;
  $('a-csv').disabled = n === 0;
  $('a-csv').textContent = n ? `CSV 내보내기 (${n}명)` : 'CSV 내보내기';
  $('a-sel-bar').innerHTML = n
    ? `<span><b>${n}명</b> 선택${n !== visSel ? ` (지금 보이는 반 밖 ${n - visSel}명 포함)` : ''}</span><button class="mini" id="a-sel-clear">선택 해제</button>`
    : '<span class="muted">CSV로 내보낼 학생 체크 (맨 위 칸 체크하면 보이는 반 전체 선택)</span>';
  if ($('a-sel-clear')) $('a-sel-clear').onclick = () => { A.selected.clear(); render(); };
}
$('a-check-all').onchange = () => {
  const ids = visible().map(s => s.id);
  if ($('a-check-all').checked) ids.forEach(id => A.selected.add(id)); else ids.forEach(id => A.selected.delete(id));
  render();
};

/* ---------- 상세 ---------- */
async function openDetail(id) {
  const s0 = A.students.find(x => x.id === id);
  $('d-title').textContent = `${s0.id} ${s0.name}`;
  $('d-badges').innerHTML = badgesHTML(infoOf(s0));
  $('d-answers').innerHTML = '<div class="muted">불러오는 중</div>';
  $('d-logs').innerHTML = ''; $('d-log-count').textContent = '';
  $('d-unsubmit').hidden = !s0.submittedAt;
  $('ov-detail').classList.add('on');
  const r = await call('adminDetail', { id });
  if (!r.ok) { $('d-answers').textContent = r.error; return; }
  const s = r.student;
  $('d-answers').innerHTML = [1, 2, 3].map(n => {
    const a = r.answers.find(x => Number(x.slot) === n) || {};
    return `<div class="ans">
      <div class="h">시각화 ${n} ${isComplete(a) ? '<span class="badge green">완성</span>' : a.data ? '<span class="badge blue">작성 중</span>' : '<span class="badge gray">미작성</span>'}</div>
      ${a.img ? `<img src="${a.img}" alt="">` : '<div class="noimg">그래프 없음</div>'}
      <div class="meta">데이터 <b>${esc(dsTitle(a.data) || '-')}</b><br>그래프 종류 <b>${esc(a.type || '-')}</b><br>X축 ${esc(a.x || '-')} / Y축 ${esc(a.y || '-')}${a.plotType ? `<br><span class="muted">CODAP ${esc(a.plotType)}</span>` : ''}</div>
      ${TEXT_FIELDS.map(f => `<div class="tx ${String(a[f.key] || '').trim() ? '' : 'empty-tx'}"><b>${f.label}</b><div>${esc(String(a[f.key] || '').trim() || '미작성')}</div></div>`).join('')}
      ${a.updatedAt ? `<div class="muted" style="font-size:12px">수정 ${esc(a.updatedAt)}</div>` : ''}
    </div>`;
  }).join('');
  $('d-answers').querySelectorAll('img').forEach(img => img.onclick = () => {
    const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${img.src}">`; z.onclick = () => z.remove(); document.body.appendChild(z);
  });
  const logs = r.logs;
  const leaveN = logs.filter(l => LEAVE_KINDS.includes(l.kind)).length;
  $('d-log-count').textContent = `이탈 ${leaveN}회, 전체 기록 ${logs.length}개${s.firstAt ? `, 첫 접속 ${s.firstAt}` : ''}${s.submittedAt ? `, 제출 ${s.submittedAt}` : ''}`;
  $('d-logs').innerHTML = logs.length ? logs.map(l => `<tr class="${LEAVE_KINDS.includes(l.kind) ? 'leave' : WARN_KINDS.includes(l.kind) ? '' : 'minor'}">
    <td style="white-space:nowrap">${esc(l.time)}</td><td style="white-space:nowrap">${esc(l.kind)}</td><td>${esc(l.detail)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="muted">기록 없음</td></tr>';
  $('d-unsubmit').onclick = async () => {
    if (!(await confirmBox('제출 취소', `${s.id} ${s.name}, 다시 수정 가능 상태로 변경`, '제출 취소'))) return;
    const r2 = await call('adminUnsubmit', { id: s.id });
    toast(r2.ok ? '제출 취소 완료' : r2.error);
    $('ov-detail').classList.remove('on'); load(true);
  };
}
$('d-close').onclick = () => $('ov-detail').classList.remove('on');
$('ov-detail').onclick = e => { if (e.target.id === 'ov-detail') $('ov-detail').classList.remove('on'); };

/* ---------- 도구 ---------- */
$('a-refresh').onclick = () => load();
$('a-lock').onclick = async () => {
  const to = !A.locked;
  if (!(await confirmBox(to ? '평가 잠금' : '잠금 해제', to ? '잠그면 학생 저장, 제출 불가' : '학생 저장, 제출 다시 가능', to ? '잠금' : '해제'))) return;
  const r = await call('adminSetLock', { locked: to });
  if (!r.ok) return toast(r.error);
  A.locked = r.locked; render();
};
$('a-add').onclick = () => { $('add-text').value = ''; $('add-error').textContent = ''; $('ov-add').classList.add('on'); };
$('add-cancel').onclick = () => $('ov-add').classList.remove('on');
$('add-ok').onclick = async () => {
  const lines = $('add-text').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const list = [], bad = [];
  lines.forEach(l => { const m = l.match(/^(\d{5})[\s,\t]+(.+)$/); if (m) list.push({ id: m[1], name: m[2].trim() }); else bad.push(l); });
  if (bad.length) return ($('add-error').textContent = `형식 오류 : ${bad.slice(0, 3).join(', ')}`);
  if (!list.length) return ($('add-error').textContent = '추가할 학생 없음');
  const r = await call('adminAddStudents', { list });
  if (!r.ok) return ($('add-error').textContent = r.error);
  $('ov-add').classList.remove('on');
  toast(`${r.added}명 추가${r.skipped ? `, ${r.skipped}명은 이미 있거나 형식 오류` : ''}`);
  load(true);
};

$('a-csv').onclick = () => {
  const list = A.students.filter(s => A.selected.has(s.id));
  if (!list.length) return toast('선택한 학생 없음');
  const classes = [...new Set(list.map(s => classOf(String(s.id))))];
  const head = ['반', '학번', '이름', '상태', '진행', '이탈 횟수', '그래프 중복', '첫 접속', '제출 시간'];
  [1, 2, 3].forEach(n => head.push(...[`시각화${n} 데이터`, `시각화${n} 그래프 종류`, `시각화${n} X축`, `시각화${n} Y축`, ...TEXT_FIELDS.map(f => `시각화${n} ${f.label}`)]));
  const rows = list.map(s => {
    const inf = infoOf(s);
    const row = [classOf(String(s.id)), s.id, s.name, [inf.main, ...inf.flags].join(' '), inf.progress, inf.leave, inf.dup ? 'O' : '', s.firstAt || '', s.submittedAt || ''];
    inf.ans.forEach(a => { a = a || {}; row.push(dsTitle(a.data), a.type || '', a.x || '', a.y || '', ...TEXT_KEYS.map(k => a[k] || '')); });
    return row;
  });
  const csv = '﻿' + [head, ...rows].map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `수행평가_${classes.length === 1 ? classes[0] : '여러 반'}_${list.length}명_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/* ---------- 시작 ---------- */
(async () => {
  let saved = null;
  try { saved = sessionStorage.getItem('pa-admin'); } catch (e) {}
  if (saved) { A.pw = saved; const r = await API.call('adminLogin', { adminPw: saved }); if (r.ok) return start(); }
  show('a-login');
  if (API.isLocal) $('a-login-error').textContent = '테스트 모드 (서버 미연결), 비밀번호 1234';
})();
