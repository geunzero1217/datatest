// 수업 자료 앞부분 : 로그인, 규칙, 그래프 설명, 내 수행평가, 데이터 선택, 제출 화면 캡처
const { launch, connect, sleep } = require('./cdp');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
const img = k => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(OUT, k + '-saved.jpg')).toString('base64');
(async () => {
  const { proc, wsUrl } = await launch(path.join(__dirname, 'chrome-profile'));
  const c = await connect(wsUrl);
  try {
    await c.goto('http://localhost:8080/practice/index.html'); await sleep(1500);
    await c.eval(`localStorage.clear(); sessionStorage.clear(); return 1;`);
    await c.goto('http://localhost:8080/practice/index.html'); await sleep(1500);
    await c.eval(`document.getElementById('in-id').value='10301'; document.getElementById('in-name').value='김연습'; document.getElementById('in-pw').value='1111'; return 1;`);
    await c.shot(path.join(OUT, 'intro-login.png'));
    await c.eval(`await API.call('adminSetLock',{adminPw:'1234',locked:false});
      let r = await API.call('login',{id:'10301',name:'김연습',pw:'1111',pwConfirm:'1111'});
      Object.assign(S,{id:'10301',name:'김연습',pw:'1111'}); applyState(r); show('s-rules'); return 1;`);
    await sleep(500); await c.shot(path.join(OUT, 'intro-rules.png'));
    await c.eval(`show('s-guide'); return 1;`); await sleep(500); await c.shot(path.join(OUT, 'intro-guide.png'));
    await c.eval(`openDataSelect(1); return 1;`); await sleep(500); await c.shot(path.join(OUT, 'intro-data.png'));
    const imgs = { bar: img('bar'), hist: img('hist'), box: img('box') };
    await c.eval(`const I=${JSON.stringify(imgs)}; const T={q:'a',obs:'b',ev:'c',concl:'d'};
      S.answers = {1:Object.assign({data:'tips',type:'막대그래프',img:I.bar},T), 2:Object.assign({data:'mpg',type:'히스토그램',img:I.hist},T), 3:Object.assign({data:'iris',type:'상자그림',img:I.box},T)};
      renderHome(); show('s-home'); return 1;`);
    await sleep(500); await c.shot(path.join(OUT, 'intro-home.png'));
  } catch (e) { console.error('ERR', e.message); }
  c.close(); proc.kill();
})();
