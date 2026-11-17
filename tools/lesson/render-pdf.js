// pdf.js로 PDF 페이지를 그려서 캡처 (Word가 만든 PDF 확인용)
const { launch, connect, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');
const [pdf, ...pages] = process.argv.slice(2);
(async () => {
  const b64 = fs.readFileSync(pdf).toString('base64');
  const html = `<!doctype html><html><body style="margin:0;background:#888">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
window.renderPage = async n => { const data = Uint8Array.from(atob('${b64}'), c=>c.charCodeAt(0));
  const doc = await pdfjsLib.getDocument({data}).promise; const pg = await doc.getPage(n); const vp = pg.getViewport({scale:1.3});
  const cv = document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height; document.body.innerHTML=''; document.body.appendChild(cv);
  await pg.render({canvasContext: cv.getContext('2d'), viewport: vp}).promise; return {w:vp.width,h:vp.height,count:doc.numPages}; };
</script></body></html>`;
  const file = path.join(__dirname, 'pdfview.html'); fs.writeFileSync(file, html);
  const { proc, wsUrl } = await launch(path.join(__dirname, 'chrome-profile'));
  const c = await connect(wsUrl);
  try {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 1100, deviceScaleFactor: 1, mobile: false });
    await c.goto('file:///' + file.replace(/\\/g, '/')); await sleep(2500);
    for (const n of pages) {
      const r = await c.eval(`return await renderPage(${n});`);
      await c.send('Emulation.setDeviceMetricsOverride', { width: Math.ceil(r.w), height: Math.ceil(r.h), deviceScaleFactor: 1, mobile: false });
      await sleep(300);
      await c.shot(path.join(__dirname, 'shots', `docxpage-${n}.png`));
      console.log('page', n, 'of', r.count);
    }
  } catch (e) { console.error('ERR', e.message); }
  c.close(); proc.kill();
})();
