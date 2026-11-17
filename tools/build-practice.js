// 본 사이트(index.html, admin.html)로 테스트 사이트(practice/) 페이지를 만듦
// 코드(css, js)는 같이 쓰고, practice/config.js로 서버 주소와 데이터만 바꿈
// 실행 : node tools/build-practice.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SUFFIX = ' (수행평가 테스트)';

function build(name, titles) {
  let t = fs.readFileSync(path.join(root, name), 'utf8');
  t = t.replace(/href="css\//g, 'href="../css/').replace(/src="js\//g, 'src="../js/');
  t = t.replace('<script src="../js/config.js"></script>', '<script src="../js/config.js"></script>\n<script src="config.js"></script>');
  for (const s of titles) t = t.split(s).join(s.replace(/(<\/title>|<\/h1>)$/, SUFFIX + '$1'));
  t = t.replace(/출처 : [^<]*/, '출처 : seaborn-data (iris, healthexp, tips, mpg, flights), 미국 지질조사국(USGS) 지진 자료');
  t = '<!-- 자동 생성 파일 : tools/build-practice.js 로 다시 만들기, 직접 고치지 말 것 -->\n' + t;
  fs.writeFileSync(path.join(root, 'practice', name), t);
  console.log('practice/' + name);
}

build('index.html', ['<title>데이터 분석 수행평가</title>', '데이터 분석 수행평가</h1>']);
build('admin.html', ['<title>수행평가 관리</title>', '수행평가 관리</h1>']);
