const { launch, connect, sleep } = require('./cdp');
const path = require('path');
(async () => {
  const { proc, wsUrl } = await launch(path.join(__dirname, 'chrome-profile'));
  const c = await connect(wsUrl);
  try {
    // A4 210mm - 26mm 여백 = 184mm ≈ 695px, 높이 297 - 24 = 273mm ≈ 1032px
    await c.send('Emulation.setDeviceMetricsOverride', { width: 695, height: 1032, deviceScaleFactor: 1.4, mobile: false });
    await c.send('Emulation.setEmulatedMedia', { media: 'print' });
    await c.goto('file:///' + path.join(__dirname, 'lesson.html').replace(/\\/g, '/'));
    await sleep(3000);
    const info = await c.eval(`await document.fonts.ready; return [...document.querySelectorAll('.page')].map((p,i)=>{const r=p.getBoundingClientRect(); return {i, top:Math.round(r.top+scrollY), h:Math.round(r.height)};});`);
    console.log(JSON.stringify(info));
    for (const p of info) {
      if (![6].includes(p.i)) continue;
      await c.send('Emulation.setDeviceMetricsOverride', { width: 695, height: Math.max(p.h, 100), deviceScaleFactor: 1.4, mobile: false });
      await c.eval(`window.scrollTo(0, ${p.top}); return 1;`); await sleep(300);
      await c.shot(path.join(__dirname, 'shots', `pdfpage-${p.i}.png`));
    }
  } catch (e) { console.error('ERR', e.message); }
  c.close(); proc.kill();
})();
