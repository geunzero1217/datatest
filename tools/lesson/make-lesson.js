// 수업 자료 HTML 만들기 → Chrome으로 PDF 인쇄
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = __dirname, SH = path.join(D, 'shots');
const G = require('./lesson-spec.js');
const out = process.argv[2];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = f => 'shots/' + f;
const URL = 'https://geunzero1217.github.io/datatest/practice/';
const NAMES = { bar: '막대그래프', hist: '히스토그램', box: '상자그림', scatter: '산점도', line: '선그래프', map: '지도' };
const WHY = {
  bar: '범주(요일)마다 개수를 비교할 때',
  hist: '수치 1개를 구간으로 나눠 어디에 많이 모였는지 볼 때',
  box: '중앙값, 사분위수로 여러 그룹의 분포를 비교할 때',
  scatter: '두 수치 사이의 관계를 볼 때',
  line: '시간에 따라 값이 어떻게 변하는지 볼 때 (보고 싶은 나라만 남기기)',
  map: '장소에 따라 값이 어떻게 다른지 볼 때',
};

const page = (body, cls = '') => `<section class="page ${cls}">${body}</section>`;

const cover = page(`
  <div class="cover">
    <div class="tag">2단원 데이터 수업 자료</div>
    <h1>CODAP으로<br>그래프 6종 만들기</h1>
    <p class="lead">수행평가 전 연습 : 데이터 고르기, 그래프 만들기, 그래프 저장, 해석 쓰기</p>
    <div class="url-box"><div class="k">연습 사이트 (수행평가 테스트)</div><div class="v">${URL}</div></div>
    <table class="toc">
      ${G.map((g, i) => `<tr><td class="n">${i + 1}</td><td class="t">${NAMES[g.key]}</td><td class="d">${esc(g.dsName)}</td><td class="w">${esc(WHY[g.key])}</td></tr>`).join('')}
    </table>
    <p class="note">연습 데이터 출처 : seaborn-data (iris, healthexp, tips, mpg, flights), 미국 지질조사국(USGS) 2023년 규모 6 이상 지진</p>
  </div>`, 'cover-page');

const intro = page(`
  <h2><span class="num">0</span>사이트 사용 순서</h2>
  <ol class="flow">
    <li><b>로그인</b> : 학번 5자리, 이름, 비밀번호 숫자 4자리 (처음 접속하면 비밀번호 한 번 더 입력)</li>
    <li><b>규칙 확인</b> → "전체 화면으로 시작" (평가 중 다른 화면 이동, 캡처는 기록됨)</li>
    <li><b>그래프 종류 알아보기</b> → 확인</li>
    <li><b>내 수행평가</b>에서 시각화 1, 2, 3 중 하나 "시작하기" → <b>데이터 선택</b></li>
    <li><b>작업 화면</b> : 그래프 추가 → 그래프 종류 선택 → 만든 그래프 저장하기 → 해석 4칸 쓰기 → 저장하고 나가기</li>
    <li>3개를 모두 다른 그래프 종류로 만든 뒤 <b>제출</b></li>
  </ol>
  <div class="grid2">
    <figure><img src="${img('intro-login.png')}"><figcaption>로그인</figcaption></figure>
    <figure><img src="${img('intro-guide.png')}"><figcaption>그래프 종류 알아보기</figcaption></figure>
    <figure><img src="${img('intro-data.png')}"><figcaption>데이터 선택 (연습 데이터 6개)</figcaption></figure>
    <figure><img src="${img('intro-home.png')}"><figcaption>내 수행평가 (3개 완성 후 제출)</figcaption></figure>
  </div>
  <div class="tip"><b>CODAP 기본 조작</b> : 표의 속성 이름(열 제목)을 그래프의 아래쪽(X축)이나 왼쪽(Y축)으로 끌어다 놓기. 그래프를 한 번 클릭하면 오른쪽에 메뉴(Rescale, View, Measure, Config 등)가 나옴</div>`);

const graphPages = G.map((g, i) => {
  const menuImg = (g.key === 'map' || (!g.menu && !g.seq)) ? `${g.key}-graph.png` : `${g.key}-menu.png`;
  const cap = g.key === 'map' ? 'CODAP 지도 : 지진 위치가 점으로 표시됨'
    : g.seq ? 'CODAP 화면 : 범례에서 "일본" 클릭(일본 점이 선택됨) → View(눈 모양) → "선택하지 않은 케이스 숨기기"'
    : !g.menu ? 'CODAP 화면 : X축, Y축에 속성을 놓고 "나라"를 가운데로 끌어 색 구분'
    : `CODAP 화면 : 그래프 클릭 → ${g.menu === 'Config' ? 'Config(환경설정)' : 'Measure(측정)'} 메뉴에서 ${g.items.map(x => `"${x}"`).join(', ')}`;
  return page(`
    <h2><span class="num">${i + 1}</span>${NAMES[g.key]} <small>${esc(g.dsName)} 데이터</small></h2>
    <p class="why">${esc(WHY[g.key])}</p>
    <div class="steps-row">
      <div class="steps"><div class="lbl">만드는 순서</div><ol>${g.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
    </div>
    <figure class="wide"><img src="${img(menuImg)}"><figcaption>${esc(cap)}</figcaption></figure>
    <div class="result">
      <figure class="saved"><img src="${img(g.key + '-saved.jpg')}"><figcaption>"만든 그래프 저장하기"로 답안에 들어간 그림</figcaption></figure>
      <div class="answer">
        <div class="lbl">해석 예시</div>
        ${[['질문', g.text.q], ['관찰', g.text.obs], ['근거', g.text.ev], ['결론', g.text.concl]].map(([k, v]) => `<div class="a"><b>${k}</b><p>${esc(v)}</p></div>`).join('')}
      </div>
    </div>`);
});

const last = page(`
  <h2><span class="num">✓</span>해석 쓰기와 제출 전 확인</h2>
  <div class="cols">
    <div class="box"><div class="lbl">해석 4칸</div>
      <dl>
        <dt>질문</dt><dd>그래프로 알아보려는 것. "~할까?"로 끝나게</dd>
        <dt>관찰</dt><dd>그래프에서 눈에 보이는 모양, 가장 큰 것과 작은 것, 모여 있는 곳</dd>
        <dt>근거</dt><dd>관찰을 뒷받침하는 실제 값 (개수, 중앙값, 범위, 비율 등)</dd>
        <dt>결론</dt><dd>질문에 대한 답 + 이 데이터로 알 수 없는 것이나 더 알아볼 것</dd>
      </dl></div>
    <div class="box"><div class="lbl">제출 전 확인</div>
      <ul class="check">
        <li>시각화 3개의 그래프 종류가 모두 다름</li>
        <li>그래프마다 "만든 그래프 저장하기"를 눌러 그림이 들어감</li>
        <li>그래프 종류 버튼이 실제 그래프와 같음</li>
        <li>해석 4칸이 모두 채워짐 (복사, 붙여넣기 불가, 직접 입력)</li>
        <li>근거에 실제 숫자가 들어감</li>
        <li>제출 후에는 수정 요청을 해야 다시 고칠 수 있음</li>
      </ul></div>
  </div>
  <div class="box wide-box"><div class="lbl">그래프 6종 한눈에</div>
    <table class="sum"><tr><th>그래프</th><th>쓰는 데이터</th><th>CODAP에서</th></tr>
      <tr><td>막대그래프</td><td>범주 1개</td><td>범주를 X축 → Config "점을 막대로 변환"</td></tr>
      <tr><td>히스토그램</td><td>수치 1개</td><td>수치를 X축 → Config "히스토그램으로 변환" + "점을 막대로 변환"</td></tr>
      <tr><td>상자그림</td><td>수치 1개 (+ 범주)</td><td>수치를 X축 (범주를 Y축) → Measure "그림 상자와 정규 곡선" → "Box Plot"</td></tr>
      <tr><td>산점도</td><td>수치 2개</td><td>수치를 X축, 다른 수치를 Y축 (범주를 가운데로 끌면 색 구분)</td></tr>
      <tr><td>선그래프</td><td>시간 + 수치 (+ 범주)</td><td>시간을 X축, 수치를 Y축, 범주를 가운데 → Measure "연결 선" → 범례에서 하나 클릭 후 View "선택하지 않은 케이스 숨기기"</td></tr>
      <tr><td>지도</td><td>위치 (lat, long)</td><td>"＋ 지도 추가" → 저장할 때 색 기준 속성 선택</td></tr>
    </table></div>`);

const css = `
@page { size: A4; margin: 12mm 13mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Spoqa Han Sans Neo', sans-serif; color: #191F28; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; }
h2 { font-size: 22px; margin: 0 0 4px; display: flex; align-items: center; gap: 10px; }
h2 small { font-size: 14px; color: #4E5968; font-weight: 500; margin-left: 4px; }
.num { display: inline-flex; width: 30px; height: 30px; border-radius: 50%; background: #3182F6; color: #fff; font-size: 16px; align-items: center; justify-content: center; flex: none; }
.why { margin: 0 0 10px 40px; color: #3182F6; font-weight: 700; font-size: 14px; }
.lbl { font-size: 12px; font-weight: 700; color: #3182F6; margin-bottom: 6px; letter-spacing: .5px; }
.steps { background: #F2F4F6; border-radius: 12px; padding: 12px 16px; margin-bottom: 10px; }
.steps ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; }
figure { margin: 0; }
figure img { width: 100%; display: block; border-radius: 10px; border: 1px solid #E5E8EB; }
figcaption { font-size: 11px; color: #8B95A1; margin-top: 4px; text-align: center; }
figure.wide { margin-bottom: 10px; }
.result { display: grid; grid-template-columns: 0.95fr 1.15fr; gap: 14px; align-items: start; }
.answer { border: 2px solid #E8F3FF; border-radius: 12px; padding: 12px 14px; }
.answer .a { margin-bottom: 7px; }
.answer .a:last-child { margin-bottom: 0; }
.answer b { display: inline-block; font-size: 12px; color: #fff; background: #3182F6; border-radius: 6px; padding: 1px 7px; margin-bottom: 3px; }
.answer p { margin: 0; font-size: 12.5px; line-height: 1.6; }
.cover-page { display: flex; }
.cover { padding-top: 60px; }
.cover .tag { display: inline-block; background: #E8F3FF; color: #3182F6; font-weight: 700; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
.cover h1 { font-size: 44px; line-height: 1.25; margin: 22px 0 14px; letter-spacing: -1px; }
.cover .lead { font-size: 17px; color: #4E5968; margin: 0 0 30px; }
.url-box { background: #191F28; color: #fff; border-radius: 14px; padding: 18px 22px; margin-bottom: 30px; }
.url-box .k { font-size: 12px; color: #B0B8C1; margin-bottom: 6px; }
.url-box .v { font-size: 20px; font-weight: 700; letter-spacing: .3px; }
.toc { width: 100%; border-collapse: collapse; font-size: 14px; }
.toc td { padding: 12px 8px; border-bottom: 1px solid #E5E8EB; }
.toc .n { width: 36px; color: #3182F6; font-weight: 700; font-size: 18px; }
.toc .t { width: 110px; font-weight: 700; }
.toc .d { width: 140px; color: #4E5968; }
.toc .w { color: #8B95A1; }
.note { font-size: 11px; color: #8B95A1; margin-top: 26px; }
.flow { font-size: 13.5px; line-height: 1.9; padding-left: 22px; margin: 8px 0 14px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.tip { background: #FFF3E0; border-radius: 10px; padding: 12px 16px; font-size: 12.5px; line-height: 1.6; color: #4E5968; }
.tip b { color: #FF8A00; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
.box { background: #F2F4F6; border-radius: 12px; padding: 14px 16px; }
.box dl { margin: 0; font-size: 13px; line-height: 1.6; }
.box dt { font-weight: 700; margin-top: 8px; }
.box dt:first-child { margin-top: 0; }
.box dd { margin: 0; color: #4E5968; }
.check { list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; }
.check li { padding-left: 24px; position: relative; margin-bottom: 7px; }
.check li::before { content: ''; position: absolute; left: 0; top: 3px; width: 14px; height: 14px; border: 2px solid #3182F6; border-radius: 4px; }
.sum { width: 100%; border-collapse: collapse; font-size: 12.5px; background: #fff; border-radius: 8px; overflow: hidden; }
.sum th, .sum td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #F2F4F6; }
.sum th { background: #E8F3FF; color: #3182F6; font-size: 12px; }
.sum td:first-child { font-weight: 700; white-space: nowrap; }
`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CODAP 그래프 6종 연습</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@3.3.0/css/SpoqaHanSansNeo.css">
<style>${css}</style></head><body>${cover}${intro}${graphPages.join('')}${last}</body></html>`;
const htmlPath = path.join(D, 'lesson.html');
fs.writeFileSync(htmlPath, html);
execFileSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-pdf-header-footer',
  `--user-data-dir=${path.join(D, 'chrome-pdf')}`, '--virtual-time-budget=15000', `--print-to-pdf=${out}`, 'file:///' + htmlPath.replace(/\\/g, '/')], { stdio: 'inherit' });
console.log('PDF', out, fs.statSync(out).size);
