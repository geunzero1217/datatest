// AI 윤리 헌장 서버 코드 만들기
// ai-charter/js/activity.js + apps-script/ai-charter/sheets-store.js + ai-charter/js/core.js → apps-script/ai-charter/Code.gs
// clasp 폴더(apps-script/ai-charter/clasp)가 있으면 Code.js에도 복사
// 실행 : node tools/build-charter-server.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const code = [read('ai-charter/js/activity.js'), read('apps-script/ai-charter/sheets-store.js'), read('ai-charter/js/core.js')].join('\n');
fs.writeFileSync(path.join(root, 'apps-script', 'ai-charter', 'Code.gs'), code);
console.log('apps-script/ai-charter/Code.gs');
const d = path.join(root, 'apps-script', 'ai-charter', 'clasp');
if (fs.existsSync(path.join(d, '.clasp.json'))) { fs.writeFileSync(path.join(d, 'Code.js'), code); console.log('apps-script/ai-charter/clasp/Code.js'); }
