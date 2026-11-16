// 부정행위 방지 : 전체 화면, 탭과 창 이동, 창 크기, 복사와 붙여넣기, 캡처 키
const Guard = {
  active: false,
  onEvent: null,   // (kind, detail) => void  기록 전송
  onWarn: null,    // (type, info) => void    경고 화면 표시 ('fullscreen' | 'leave')
  leaveCount: 0,
  lastLeaveAt: 0,
  shrunk: false,

  start() { this.active = true; this.lockEsc(); },
  stop() { this.active = false; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); },

  async enterFullscreen() {
    try {
      const req = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await Promise.race([req, new Promise(r => setTimeout(r, 1500))]); // 일부 환경에서 응답이 없을 때 멈추지 않게
    } catch (e) {}
    this.lockEsc();
    return !!document.fullscreenElement;
  },
  lockEsc() { try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) {} },

  record(kind, detail = '') { if (this.active && this.onEvent) this.onEvent(kind, detail); },

  leave(kind, detail) {
    if (!this.active) return;
    const now = Date.now();
    if (now - this.lastLeaveAt < 2000) return; // 같은 이동이 blur와 visibilitychange로 두 번 잡히는 것 방지
    this.lastLeaveAt = now;
    this.leaveCount++;
    this.record(kind, detail);
    this.pendingLeave = true;
  },

  init() {
    document.addEventListener('visibilitychange', () => {
      if (!this.active) return;
      if (document.hidden) this.leave('탭 이동', '다른 탭 또는 프로그램으로 이동');
      else if (this.pendingLeave) { this.pendingLeave = false; this.onWarn && this.onWarn('leave', { count: this.leaveCount }); }
    });
    window.addEventListener('blur', () => {
      if (!this.active) return;
      // CODAP iframe 안을 클릭해도 blur가 발생하므로 이 경우는 제외
      setTimeout(() => {
        const el = document.activeElement;
        if (el && el.tagName === 'IFRAME') return;
        if (document.hidden) return;
        this.leave('창 이동', '다른 창으로 이동');
      }, 50);
    });
    window.addEventListener('focus', () => {
      if (this.active && this.pendingLeave && !document.hidden) { this.pendingLeave = false; this.onWarn && this.onWarn('leave', { count: this.leaveCount }); }
    });
    document.addEventListener('fullscreenchange', () => {
      if (!this.active) return;
      if (!document.fullscreenElement) { this.record('전체 화면 해제', ''); this.onWarn && this.onWarn('fullscreen', {}); }
    });
    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (!this.active || document.fullscreenElement) { this.shrunk = false; return; }
        const small = window.innerWidth < screen.availWidth * 0.8 || window.innerHeight < screen.availHeight * 0.6;
        if (small && !this.shrunk) this.record('창 크기 줄임', `화면 분할 의심 (${window.innerWidth}x${window.innerHeight}, 화면 ${screen.availWidth}x${screen.availHeight})`);
        this.shrunk = small;
      }, 600);
    });

    const block = (e, kind) => { if (!this.active) return; e.preventDefault(); this.record(kind, e.target && e.target.dataset && e.target.dataset.label || ''); };
    document.addEventListener('contextmenu', e => { if (this.active) e.preventDefault(); });
    document.addEventListener('copy', e => block(e, '복사 시도'), true);
    document.addEventListener('cut', e => block(e, '복사 시도'), true);
    document.addEventListener('paste', e => block(e, '붙여넣기 시도'), true);
    document.addEventListener('drop', e => block(e, '끌어 놓기 시도'), true);
    document.addEventListener('dragover', e => { if (this.active) e.preventDefault(); }, true);
    document.addEventListener('beforeinput', e => {
      if (this.active && /^insertFrom(Paste|Drop|PasteAsQuotation)/.test(e.inputType || '')) { e.preventDefault(); this.record('붙여넣기 시도', ''); }
    }, true);
    document.addEventListener('keydown', e => {
      if (!this.active) return;
      const k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['c', 'x', 'v'].includes(k)) { e.preventDefault(); this.record(k === 'v' ? '붙여넣기 시도' : '복사 시도', '단축키'); }
      if ((e.metaKey && e.shiftKey && ['s', '3', '4', '5'].includes(k)) || (e.ctrlKey && e.shiftKey && k === 's')) this.record('캡처 키', '캡처 단축키');
      if ((e.ctrlKey || e.metaKey) && ['p', 's'].includes(k) && !e.shiftKey) { e.preventDefault(); }
    }, true);
    document.addEventListener('keyup', e => {
      if (!this.active) return;
      if (e.key === 'PrintScreen') {
        this.record('캡처 키', 'Print Screen');
        try { navigator.clipboard.writeText('').catch(() => {}); } catch (err) {}
      }
    }, true);
  },
};
