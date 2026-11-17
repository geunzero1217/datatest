// 서버 코드 만들기 : apps-script/sheets-store.js + js/core.js → apps-script/Code.gs
// 그리고 clasp 폴더(본 서버 personal, 테스트 서버 practice)의 Code.js에도 복사
// 실행 : node tools/build-server.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'apps-script', 'sheets-store.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'js', 'core.js'), 'utf8');
fs.writeFileSync(path.join(root, 'apps-script', 'Code.gs'), code);
console.log('apps-script/Code.gs');
for (const dir of ['personal', 'practice']) {
  const d = path.join(root, 'apps-script', dir);
  if (fs.existsSync(path.join(d, '.clasp.json'))) { fs.writeFileSync(path.join(d, 'Code.js'), code); console.log(`apps-script/${dir}/Code.js`); }
}
