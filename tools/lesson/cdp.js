// 크롬 원격 디버깅으로 페이지를 조작하고 캡처하는 작은 도구 (수업 자료 캡처용)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch(dir) {
  const mode = process.env.HEADED ? ['--window-position=-3000,0'] : ['--headless=new'];
  const proc = spawn(CHROME, [...mode, `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`,
    '--window-size=1600,900', '--force-device-scale-factor=1', '--hide-scrollbars', '--no-first-run',
    '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/list`); const l = await r.json(); const p = l.find(x => x.type === 'page'); if (p) return { proc, wsUrl: p.webSocketDebuggerUrl }; } catch (e) {}
    await sleep(200);
  }
  throw new Error('chrome start failed');
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const contexts = new Map(); // frameId -> contextId
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    if (m.method === 'Runtime.executionContextCreated') { const c = m.params.context; if (c.auxData && c.auxData.isDefault) contexts.set(c.auxData.frameId, c.id); }
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1.5, mobile: false });
  const api = {
    send, contexts,
    async eval(expr, contextId) {
      const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true, contextId });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
      return r.result.value;
    },
    async codapCtx() {
      const tree = await send('Page.getFrameTree');
      const walk = n => [n.frame, ...(n.childFrames || []).flatMap(walk)];
      const f = walk(tree.frameTree).find(fr => /codap3\.concord\.org/.test(fr.url));
      if (!f) throw new Error('codap frame not found');
      for (let i = 0; i < 50 && !contexts.has(f.id); i++) await sleep(100);
      return contexts.get(f.id);
    },
    async inCodap(expr) { return api.eval(expr, await api.codapCtx()); },
    async goto(url) { await send('Page.navigate', { url }); await sleep(1500); },
    async shot(file, clip) {
      const p = { format: 'png', captureBeyondViewport: false };
      if (clip) p.clip = Object.assign({ scale: 1 }, clip);
      const r = await send('Page.captureScreenshot', p);
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    close() { ws.close(); },
  };
  return api;
}

module.exports = { launch, connect, sleep };
