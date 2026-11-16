// CODAP 연결 (embeddedServer 방식 : 사이트가 iframe-phone으로 CODAP Data Interactive API 직접 호출)
const Codap = {
  frame: null, phone: null, contextName: null, graphCount: 0,

  async open(container) {
    this.close();
    const f = document.createElement('iframe');
    f.src = CONFIG.CODAP_URL + '?embeddedMode=yes&embeddedServer=yes';
    f.allow = 'clipboard-read; clipboard-write';
    f.title = 'CODAP';
    container.querySelectorAll('iframe').forEach(x => x.remove());
    container.appendChild(f);
    this.frame = f;
    await new Promise(r => f.addEventListener('load', r, { once: true }));
    this.phone = new iframePhone.IframePhoneRpcEndpoint(() => {}, 'data-interactive', f.contentWindow, new URL(CONFIG.CODAP_URL).origin);
    for (let i = 0; i < 40; i++) {
      const r = await this.call({ action: 'get', resource: 'dataContextList' }, 1500);
      if (!r.timeout) return true;
    }
    throw new Error('CODAP 연결 실패');
  },

  close() {
    if (this.phone) { try { this.phone.disconnect(); } catch (e) {} }
    this.phone = null; this.frame = null; this.contextName = null; this.graphCount = 0;
  },

  call(msg, timeout = 20000) {
    return new Promise(resolve => {
      if (!this.phone) return resolve({ success: false, error: '연결 없음' });
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve({ success: false, timeout: true }); } }, timeout);
      this.phone.call(msg, r => { if (!done) { done = true; clearTimeout(t); resolve(r || { success: false }); } });
    });
  },

  parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
  },

  async loadData(ds) {
    const text = await (await fetch(`data/${ds.id}.csv`)).text();
    const rows = this.parseCSV(text);
    // CODAP 지도는 속성 이름에 lat, long이 있어야 위치로 인식
    const RENAME = { '위도': '위도(lat)', '경도': '경도(long)' };
    const head = rows[0].map(h => RENAME[h.trim()] || h.trim()), body = rows.slice(1);
    const isNum = head.map((_, j) => body.every(r => r[j] === '' || r[j] === undefined || !isNaN(Number(r[j]))));
    const name = ds.title;
    let r = await this.call({ action: 'create', resource: 'dataContext', values: {
      name, title: name,
      collections: [{ name: ds.title, title: ds.title, attrs: head.map((h, j) => ({ name: h, type: isNum[j] ? 'numeric' : 'categorical' })) }],
    } });
    if (!r.success) throw new Error('데이터 만들기 실패');
    const items = body.map(row => Object.fromEntries(head.map((h, j) => [h, isNum[j] && row[j] !== '' ? Number(row[j]) : (row[j] || '')])));
    this.table = { head, isNum, items };
    r = await this.call({ action: 'create', resource: `dataContext[${name}].item`, values: items });
    if (!r.success) throw new Error('데이터 넣기 실패');
    await this.call({ action: 'create', resource: 'component', values: { type: 'caseTable', dataContext: name, position: { left: 5, top: 5 }, dimensions: { width: 560, height: 420 } } });
    this.contextName = name;
  },

  async addGraph(type = 'graph') {
    this.graphCount++;
    const n = this.graphCount;
    const r = await this.call({ action: 'create', resource: 'component', values: {
      type, dataContext: this.contextName,
      position: { left: 580 + (n - 1) * 30, top: 5 + (n - 1) * 30 },
      dimensions: { width: 460, height: 380 },
    } });
    return !!r.success;
  },

  async getGraphs() {
    const list = await this.call({ action: 'get', resource: 'componentList' });
    const comps = (list.values || []).filter(c => c.type === 'graph' || c.type === 'map');
    const out = [];
    for (const c of comps) {
      const key = c.id != null ? c.id : c.name;
      let comp = await this.call({ action: 'get', resource: `component[${key}]` });
      if (!comp.success && c.name) comp = await this.call({ action: 'get', resource: `component[${c.name}]` });
      let disp = await this.call({ action: 'get', resource: `dataDisplay[${key}]` });
      if (!disp.success && c.name) disp = await this.call({ action: 'get', resource: `dataDisplay[${c.name}]` });
      const v = comp.values || {};
      out.push({
        id: c.id, kind: c.type, title: c.title || c.name || '',
        x: v.xAttributeName || '', y: v.yAttributeName || '', legend: v.legendAttributeName || '',
        plotType: c.type === 'map' ? 'map' : (v.plotType || ''),
        image: (disp.values && disp.values.exportDataUri) || null,
      });
    }
    return out;
  },
};

// CODAP v3는 지도 그림 내보내기를 지원하지 않음 → 같은 데이터로 사이트에서 지도 그림을 다시 그림
async function renderMapImage(table, colorAttr) {
  const latKey = table.head.find(h => /lat/i.test(h)), lonKey = table.head.find(h => /long/i.test(h));
  const Z = 2, T = 256, W = T * (1 << Z);
  const LAT_TOP = 75, LAT_BOTTOM = -56;
  const merc = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * W; };
  const projX = lon => (lon + 180) / 360 * W;
  const top = merc(LAT_TOP), bottom = merc(LAT_BOTTOM);
  const legendH = 84;
  const c = document.createElement('canvas'); c.width = W; c.height = Math.round(bottom - top) + legendH;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  const tiles = [];
  for (let x = 0; x < (1 << Z); x++) for (let y = 0; y < (1 << Z); y++) {
    tiles.push(new Promise(res => {
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => { g.drawImage(im, x * T, y * T - top); res(); };
      im.onerror = () => res();
      im.src = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${Z}/${y}/${x}`;
    }));
  }
  await Promise.all(tiles);
  g.fillStyle = '#fff'; g.fillRect(0, c.height - legendH, W, legendH);

  const ci = table.head.indexOf(colorAttr), num = ci >= 0 && table.isNum[ci];
  const PALETTE = ['#3182F6', '#F04452', '#00A661', '#FF8A00', '#8B5CF6', '#14B8A6', '#EC4899', '#6B7684'];
  const vals = table.items.map(it => it[colorAttr]).filter(v => v !== '' && v != null);
  let colorOf = () => '#3182F6', cats = [], min = 0, max = 1;
  if (ci >= 0 && num) {
    min = Math.min(...vals); max = Math.max(...vals);
    colorOf = v => { const t = max > min ? (v - min) / (max - min) : 0.5; return `hsl(${215 - t * 215}, 85%, ${62 - t * 18}%)`; };
  } else if (ci >= 0) {
    cats = [...new Set(vals.map(String))].slice(0, 8);
    colorOf = v => PALETTE[Math.max(0, cats.indexOf(String(v)))] ;
  }
  table.items.forEach(it => {
    const la = Number(it[latKey]), lo = Number(it[lonKey]);
    if (!isFinite(la) || !isFinite(lo)) return;
    g.beginPath(); g.arc(projX(lo), merc(la) - top, 7, 0, Math.PI * 2);
    g.fillStyle = ci >= 0 && it[colorAttr] !== '' ? colorOf(it[colorAttr]) : '#3182F6';
    g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
    g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
  });
  // 범례
  const ly = c.height - legendH + 22;
  g.fillStyle = '#191F28'; g.font = 'bold 24px "Noto Sans KR", sans-serif'; g.textBaseline = 'middle';
  g.fillText(ci >= 0 ? `색 : ${colorAttr}` : '지도', 16, ly);
  g.font = '21px "Noto Sans KR", sans-serif';
  if (ci >= 0 && num) {
    const x0 = 16, w = 320, y0 = ly + 34;
    const grad = g.createLinearGradient(x0, 0, x0 + w, 0);
    for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, colorOf(min + (max - min) * i / 10));
    g.fillStyle = grad; g.fillRect(x0, y0 - 8, w, 16);
    g.fillStyle = '#4E5968'; g.fillText(`작음 ${min}  ~  ${max} 큼`, x0 + w + 12, y0);
  } else if (cats.length) {
    let x = 16;
    cats.forEach((cat, i) => {
      g.fillStyle = PALETTE[i]; g.beginPath(); g.arc(x + 9, ly + 34, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4E5968'; g.fillText(cat, x + 24, ly + 34); x += 24 + g.measureText(cat).width + 26;
    });
  }
  g.fillStyle = '#8B95A1'; g.font = '13px sans-serif'; g.textAlign = 'right';
  g.fillText('지도 : Esri', W - 10, c.height - 12);
  return c.toDataURL('image/png');
}

// 그래프 그림을 시트 셀(5만 자)에 들어가게 JPEG로 줄임
async function compressImage(dataUri, limit = 45000) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUri; });
  let w = Math.min(img.width, 900);
  for (let step = 0; step < 8; step++) {
    const h = Math.round(img.height * w / img.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
    for (const q of [0.85, 0.7, 0.55]) {
      const out = c.toDataURL('image/jpeg', q);
      if (out.length <= limit) return out;
    }
    w = Math.round(w * 0.8);
  }
  throw new Error('그림 줄이기 실패');
}
