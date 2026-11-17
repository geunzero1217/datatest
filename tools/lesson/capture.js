// 수업 자료용 캡처 : 그래프 6종을 CODAP에서 실제로 만들고 단계별 화면 저장
const { launch, connect, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];

const G = require('./lesson-spec.js');

async function click(c, x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
    await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' });
}
// CODAP 안 요소 위치 (상단 페이지 좌표)
async function codapRect(c, js) {
  const off = await c.eval(`const r=document.querySelector('#codap-box iframe').getBoundingClientRect(); return {x:r.x,y:r.y};`);
  const r = await c.inCodap(`const el=(${js})(); if(!el) return null; el.scrollIntoView({block:'nearest'}); const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};`);
  if (!r) return null;
  return { x: off.x + r.x, y: off.y + r.y, w: r.w, h: r.h, cx: off.x + r.x + r.w / 2, cy: off.y + r.y + r.h / 2 };
}
const byText = (sel, text) => `()=>[...document.querySelectorAll('${sel}')].filter(e=>e.offsetParent!==null).find(e=>e.textContent.trim()===${JSON.stringify(text)})`;

(async () => {
  const { proc, wsUrl } = await launch(path.join(__dirname, 'chrome-profile'));
  const c = await connect(wsUrl);
  try {
    for (const g of G) {
      if (only && g.key !== only) continue;
      console.log('==', g.key);
      await c.goto('http://localhost:8080/practice/index.html');
      await sleep(1200);
      await c.eval(`
        localStorage.clear(); LocalStore.reload();
        await API.call('adminSetLock',{adminPw:'1234',locked:false});
        let r = await API.call('login',{id:'10301',name:'김연습',pw:'1111'});
        if (r.needSetup) r = await API.call('login',{id:'10301',name:'김연습',pw:'1111',pwConfirm:'1111'});
        Object.assign(S,{id:'10301',name:'김연습',pw:'1111'}); applyState(r);
        openWork(${g.slot}, '${g.ds}');
        for (let i=0;i<100 && !Codap.contextName;i++) await new Promise(r=>setTimeout(r,500));
        // 표를 조금 작게 해서 그래프 자리 확보
        const t = (await Codap.call({action:'get',resource:'componentList'})).values.find(x=>x.type==='caseTable');
        await Codap.call({action:'update',resource:'component['+t.id+']',values:{dimensions:{width:470,height:430}}});
        const kind = '${g.kind || 'graph'}';
        await Codap.call({action:'create',resource:'component',values:{type:kind, dataContext:Codap.contextName, position:{left:490,top:5}, dimensions:{width:${g.w || 570},height:${g.h || 470}}}});
        await new Promise(r=>setTimeout(r,1500));
        const comp = (await Codap.call({action:'get',resource:'componentList'})).values.find(x=>x.type===kind);
        if (kind==='graph') await Codap.call({action:'update',resource:'component['+comp.id+']',values:${JSON.stringify(g.attrs || {})}});
        return comp.id;`);
      await sleep(g.kind === 'map' ? 8000 : 2000);
      // 지도 : 선택 후 Rescale 눌러 데이터 범위에 맞춤
      if (g.kind === 'map') {
        const tile = await codapRect(c, `()=>document.querySelector('.codap-map, [class*="codap-map"]')`);
        if (tile) { await click(c, tile.x + tile.w / 2, tile.y + 12); await sleep(800); }
        const rs = await codapRect(c, byText('button, [role=button], div', 'Rescale'));
        if (rs) { await click(c, rs.cx, rs.cy); await sleep(4000); } else console.log('  no rescale button');
      }
      // 여러 단계 (메뉴 → 범례 클릭 → 다른 메뉴)
      if (g.seq) {
        const tile = await codapRect(c, `()=>document.querySelector('.codap-graph')`);
        await click(c, tile.x + tile.w / 2, tile.y + 12); await sleep(600);
        for (const st of g.seq) {
          if (st.legend) {
            const lg = await codapRect(c, `()=>[...document.querySelector('.codap-graph').querySelectorAll('*')].filter(e=>e.children.length===0 && e.getBoundingClientRect().width>0).find(e=>e.textContent.trim()===${JSON.stringify(st.legend)})`);
            if (!lg) throw new Error('legend not found ' + st.legend);
            await click(c, lg.cx, lg.cy); await sleep(1000);
            continue;
          }
          const btn = await codapRect(c, byText('button, [role=button], .inspector-tool-button, div', st.menu));
          if (!btn) throw new Error('menu not found ' + st.menu);
          await click(c, btn.cx, btn.cy); await sleep(900);
          if (st.shotMenu) await c.shot(path.join(OUT, st.shotMenu), { x: 0, y: 0, width: 1200, height: 560 });
          for (const item of st.items) {
            const it = await codapRect(c, `()=>{ const t=[...document.querySelectorAll('label, span, p, div, button, [role=menuitem]')].filter(e=>e.offsetParent!==null && e.children.length<=2).find(e=>e.textContent.trim()===${JSON.stringify(item)}); if(!t) return null;
              const lab=t.closest('label'); const inp=lab && lab.querySelector('[class*="checkbox__control"],input[type=checkbox]');
              return (inp && inp.getBoundingClientRect().width>0) ? inp : t; }`);
            if (!it) throw new Error('item not found ' + item);
            await click(c, it.cx, it.cy); await sleep(1200);
          }
          if (st.shot) await c.shot(path.join(OUT, st.shot), { x: 0, y: 0, width: 1200, height: 560 });
        }
        await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(600);
        // 그래프 빈 곳 클릭 → 선택 해제 (숨긴 나라는 그대로 숨겨짐)
        await click(c, tile.x + tile.w * 0.88, tile.y + tile.h * 0.25); await sleep(1000);
      }
      // 1) 그래프 선택 → 메뉴 열기 → 항목 체크
      if (g.seq) {
        // 위에서 캡처함
      } else if (g.menu) {
        const tile = await codapRect(c, `()=>document.querySelector('.codap-graph')`);
        await click(c, tile.x + tile.w / 2, tile.y + 12); await sleep(600);
        const btn = await codapRect(c, byText('button, [role=button], .inspector-tool-button, div', g.menu));
        if (!btn) throw new Error('menu not found ' + g.menu);
        await click(c, btn.cx, btn.cy); await sleep(900);
        for (const item of g.items) {
          const it = await codapRect(c, `()=>{ const t=[...document.querySelectorAll('label, span, p, div, button')].filter(e=>e.offsetParent!==null && e.children.length<=2).find(e=>e.textContent.trim()===${JSON.stringify(item)}); if(!t) return null;
            const lab=t.closest('label'); const inp=lab && lab.querySelector('[class*="checkbox__control"],[class*="radio__control"],input[type=checkbox],input[type=radio]');
            return (inp && inp.getBoundingClientRect().width>0) ? inp : t; }`);
          if (!it) throw new Error('item not found ' + item);
          await click(c, it.cx, it.cy); await sleep(900);
        }
        await sleep(800);
        await c.shot(path.join(OUT, `${g.key}-menu.png`), { x: 0, y: 0, width: 1200, height: 560 });
        await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await click(c, 1150, 860); await sleep(800);
      } else {
        await c.shot(path.join(OUT, `${g.key}-menu.png`), { x: 0, y: 0, width: 1200, height: 560 });
      }
      await c.shot(path.join(OUT, `${g.key}-graph.png`), { x: 0, y: 0, width: 1200, height: 560 });
      // 2) 종류 선택, 그래프 저장, 해석 입력
      const res = await c.eval(`
        document.querySelector('#w-types .chip[data-t="${g.type}"]').click();
        document.getElementById('w-grab').click();
        await new Promise(r=>setTimeout(r,1500));
        if (document.getElementById('ov-map').classList.contains('on')) { document.getElementById('map-attr').value = ${JSON.stringify(g.mapAttr || '')}; document.getElementById('map-ok').click(); }
        if (document.getElementById('ov-pick').classList.contains('on')) document.querySelector('#pick-list .pick').click();
        for (let i=0;i<60 && !S.work.img;i++) await new Promise(r=>setTimeout(r,300));
        const T = ${JSON.stringify(g.text)};
        for (const k of ['q','obs','ev','concl']) { const ta=document.getElementById('ta-'+k); ta.value=T[k]; ta.dispatchEvent(new Event('input')); }
        await saveWork(true);
        document.querySelector('.panel').scrollTop = document.getElementById('w-preview').offsetTop - 140;
        return {img: S.work.img.length, x: S.work.x, y: S.work.y, plot: S.work.plotType};`);
      console.log('  saved', JSON.stringify(res));
      await sleep(800);
      await c.shot(path.join(OUT, `${g.key}-done.png`));
      const img = await c.eval(`return S.work.img;`);
      fs.writeFileSync(path.join(OUT, `${g.key}-saved.jpg`), Buffer.from(img.split(',')[1], 'base64'));
    }
  } catch (e) { console.error('ERR', e.message); await c.shot(path.join(OUT, 'error.png')).catch(() => {}); }
  c.close(); proc.kill();
})();
