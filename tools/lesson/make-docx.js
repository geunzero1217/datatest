// 수업 자료 .docx (구글 문서 업로드용) : PDF와 같은 내용, 같은 캡처
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, PageBreak, BorderStyle, LevelFormat, VerticalAlign,
} = require('docx');

const D = __dirname, SH = path.join(D, 'shots');
const G = require('./lesson-spec.js');
const OUT = process.argv[2];
const URL = 'https://geunzero1217.github.io/datatest/practice/';
const FONT = 'Noto Sans KR';
const BLUE = '3182F6', GRAY = '4E5968', LIGHT = 'F2F4F6', SOFT = 'E8F3FF';
const NAMES = { bar: '막대그래프', hist: '히스토그램', box: '상자그림', scatter: '산점도', line: '선그래프', map: '지도' };
const WHY = {
  bar: '범주(요일)마다 개수를 비교할 때',
  hist: '수치 1개를 구간으로 나눠 어디에 많이 모였는지 볼 때',
  box: '중앙값, 사분위수로 여러 그룹의 분포를 비교할 때',
  scatter: '두 수치 사이의 관계를 볼 때',
  line: '시간에 따라 값이 어떻게 변하는지 볼 때 (보고 싶은 나라만 남기기)',
  map: '장소에 따라 값이 어떻게 다른지 볼 때',
};

// 이미지 크기 읽기 (PNG, JPEG)
function size(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xC3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error('size ' + file);
}
function image(name, width) {
  const f = path.join(SH, name), s = size(f);
  return new ImageRun({ type: name.endsWith('.png') ? 'png' : 'jpg', data: fs.readFileSync(f), transformation: { width, height: Math.round(width * s.h / s.w) } });
}

const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
const p = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { after: 80, line: 300 }, ...o });
const pc = (children, o = {}) => p(children, { spacing: { after: 0, line: 264 }, ...o });
const caption = text => p(t(text, { size: 17, color: '8B95A1' }), { alignment: AlignmentType.CENTER, spacing: { after: 200 } });
const h1 = text => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [t(text)] });
const h2 = text => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// 표 (폭은 DXA, 구글 문서 호환)
const W = 9638; // A4 210mm - 여백 20mm x2 = 170mm
const border = { style: BorderStyle.SINGLE, size: 4, color: 'E5E8EB' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(children, width, fill, o = {}) {
  return new TableCell({ children: Array.isArray(children) ? children : [children], width: { size: width, type: WidthType.DXA }, borders,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 100, bottom: 100, left: 140, right: 140 }, verticalAlign: VerticalAlign.CENTER, ...o });
}
function table(widths, rows) {
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map(r => new TableRow({ children: r.map((c, i) => c instanceof TableCell ? c : cell(c, widths[i])) })) });
}

const numbering = { config: [
  { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 300 } } } }] },
  { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '□', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 300 } } } }] },
] };
let listNo = 0;
const steps = items => { const ref = 'steps'; const inst = ++listNo; return items.map(s => new Paragraph({ numbering: { reference: ref, level: 0, instance: inst }, spacing: { after: 40, line: 276 }, children: [t(s, { size: 21 })] })); };

const body = [];

// 표지
body.push(p(t('2단원 데이터 수업 자료', { bold: true, color: BLUE, size: 22 }), { spacing: { before: 1200, after: 200 } }));
body.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [t('CODAP으로 그래프 6종 만들기')] }));
body.push(p(t('수행평가 전 연습 : 데이터 고르기, 그래프 만들기, 그래프 저장, 해석 쓰기', { size: 24, color: GRAY }), { spacing: { after: 400 } }));
body.push(table([W], [[cell([p(t('연습 사이트 (수행평가 테스트)', { size: 18, color: 'B0B8C1' })), p(t(URL, { bold: true, size: 26, color: 'FFFFFF' }))], W, '191F28')]]));
body.push(p(t(''), { spacing: { after: 200 } }));
const tw = [700, 1900, 2500, 4538];
body.push(table(tw, [
  [cell(p(t('', {})), tw[0], SOFT), cell(p(t('그래프', { bold: true, color: BLUE, size: 20 })), tw[1], SOFT), cell(p(t('연습 데이터', { bold: true, color: BLUE, size: 20 })), tw[2], SOFT), cell(p(t('언제 쓰나', { bold: true, color: BLUE, size: 20 })), tw[3], SOFT)],
  ...G.map((g, i) => [p(t(String(i + 1), { bold: true, color: BLUE })), p(t(NAMES[g.key], { bold: true })), p(t(g.dsName, { color: GRAY })), p(t(WHY[g.key], { size: 19, color: GRAY }))]),
]));
body.push(p(t('연습 데이터 출처 : seaborn-data (iris, healthexp, tips, mpg, flights), 미국 지질조사국(USGS) 2023년 규모 6 이상 지진', { size: 16, color: '8B95A1' }), { spacing: { before: 300 } }));

// 사이트 사용 순서
body.push(h1('0. 사이트 사용 순서'));
body.push(...steps([
  '로그인 : 학번 5자리, 이름, 비밀번호 숫자 4자리 (처음 접속하면 비밀번호 한 번 더 입력)',
  '규칙 확인 → "전체 화면으로 시작" (평가 중 다른 화면 이동, 캡처는 기록됨)',
  '그래프 종류 알아보기 → 확인',
  '내 수행평가에서 시각화 1, 2, 3 중 하나 "시작하기" → 데이터 선택',
  '작업 화면 : 그래프 추가 → 그래프 종류 선택 → 만든 그래프 저장하기 → 해석 4칸 쓰기 → 저장하고 나가기',
  '3개를 모두 다른 그래프 종류로 만든 뒤 제출',
]));
const half = W / 2;
const fig = (name, cap) => cell([p(image(name, 300), { alignment: AlignmentType.CENTER, spacing: { after: 40 } }), caption(cap)], half);
body.push(table([half, half], [
  [fig('intro-login.png', '로그인'), fig('intro-guide.png', '그래프 종류 알아보기')],
  [fig('intro-data.png', '데이터 선택 (연습 데이터 6개)'), fig('intro-home.png', '내 수행평가 (3개 완성 후 제출)')],
]));
body.push(p(t(''), { spacing: { after: 120 } }));
body.push(table([W], [[cell([p([t('CODAP 기본 조작 : ', { bold: true, color: 'FF8A00', size: 20 }), t('표의 속성 이름(열 제목)을 그래프의 아래쪽(X축)이나 왼쪽(Y축)으로 끌어다 놓기. 그래프를 한 번 클릭하면 오른쪽에 메뉴(Rescale, View, Measure, Config 등)가 나옴', { size: 20, color: GRAY })])], W, 'FFF3E0')]]));

// 그래프 6종
G.forEach((g, i) => {
    body.push(h1(`${i + 1}. ${NAMES[g.key]}  (${g.dsName} 데이터)`));
  body.push(p(t(WHY[g.key], { bold: true, color: BLUE, size: 22 }), { spacing: { after: 160 } }));
  body.push(h2('만드는 순서'));
  body.push(...steps(g.steps));
  const shot = (g.key === 'map' || (!g.menu && !g.seq)) ? `${g.key}-graph.png` : `${g.key}-menu.png`;
  const cap = g.key === 'map' ? 'CODAP 지도 : 지진 위치가 점으로 표시됨'
    : g.seq ? 'CODAP 화면 : 범례에서 "일본" 클릭(일본 점이 선택됨) → View(눈 모양) → "선택하지 않은 케이스 숨기기"'
    : !g.menu ? 'CODAP 화면 : X축, Y축에 속성을 놓고 "나라"를 가운데로 끌어 색 구분'
    : `CODAP 화면 : 그래프 클릭 → ${g.menu === 'Config' ? 'Config(환경설정)' : 'Measure(측정)'} 메뉴에서 ${g.items.map(x => `"${x}"`).join(', ')}`;
  body.push(p(image(shot, g.steps.length > 5 ? 360 : 560), { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 20 } }));
  body.push(caption(cap));
  body.push(h2('저장된 그래프와 해석 예시'));
  // 왼쪽 : 저장된 그림, 오른쪽 : 해석 4칸 (한 쪽에 들어가게 나란히)
  const lw = [3000, W - 3000];
  const ans = [['질문', g.text.q], ['관찰', g.text.obs], ['근거', g.text.ev], ['결론', g.text.concl]].flatMap(([k, v]) => [
    p(t(k, { bold: true, color: BLUE, size: 18 }), { spacing: { before: 30, after: 0 } }),
    p(t(v, { size: 18 }), { spacing: { after: 30, line: 264 } }),
  ]);
  body.push(table(lw, [[
    cell([p(image(g.key + '-saved.jpg', 180), { alignment: AlignmentType.CENTER, spacing: { after: 40 } }), caption('답안에 저장된 그림')], lw[0], LIGHT),
    cell(ans, lw[1], null, { verticalAlign: VerticalAlign.TOP }),
  ]]));
});

// 마지막 : 해석 쓰기, 확인, 한눈에
body.push(h1('해석 쓰기와 제출 전 확인'));
body.push(h2('해석 4칸'));
const dw = [1300, W - 1300];
body.push(table(dw, [
  ['질문', '그래프로 알아보려는 것. "~할까?"로 끝나게'],
  ['관찰', '그래프에서 눈에 보이는 모양, 가장 큰 것과 작은 것, 모여 있는 곳'],
  ['근거', '관찰을 뒷받침하는 실제 값 (개수, 중앙값, 범위, 비율 등)'],
  ['결론', '질문에 대한 답 + 이 데이터로 알 수 없는 것이나 더 알아볼 것'],
].map(([k, v]) => [cell(pc(t(k, { bold: true })), dw[0], LIGHT), cell(pc(t(v, { size: 20, color: GRAY })), dw[1])])));
body.push(h2('제출 전 확인'));
['시각화 3개의 그래프 종류가 모두 다름', '그래프마다 "만든 그래프 저장하기"를 눌러 그림이 들어감', '그래프 종류 버튼이 실제 그래프와 같음',
  '해석 4칸이 모두 채워짐 (복사, 붙여넣기 불가, 직접 입력)', '근거에 실제 숫자가 들어감', '제출 후에는 수정 요청을 해야 다시 고칠 수 있음']
  .forEach(s => body.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 30, line: 264 }, children: [t(s, { size: 21 })] })));
body.push(h2('그래프 6종 한눈에'));
const sw = [1500, 1900, W - 3400];
body.push(table(sw, [
  ['그래프', '쓰는 데이터', 'CODAP에서'].map((x, i) => cell(pc(t(x, { bold: true, color: BLUE, size: 19 })), sw[i], SOFT)),
  ...[
    ['막대그래프', '범주 1개', '범주를 X축 → Config "점을 막대로 변환"'],
    ['히스토그램', '수치 1개', '수치를 X축 → Config "히스토그램으로 변환" + "점을 막대로 변환"'],
    ['상자그림', '수치 1개 (+ 범주)', '수치를 X축 (범주를 Y축) → Measure "그림 상자와 정규 곡선" → "Box Plot"'],
    ['산점도', '수치 2개', '수치를 X축, 다른 수치를 Y축 (범주를 가운데로 끌면 색 구분)'],
    ['선그래프', '시간 + 수치 (+ 범주)', '시간을 X축, 수치를 Y축, 범주를 가운데 → Measure "연결 선" → 범례에서 하나 클릭 후 View "선택하지 않은 케이스 숨기기"'],
    ['지도', '위치 (lat, long)', '"＋ 지도 추가" → 저장할 때 색 기준 속성 선택'],
  ].map(r => [pc(t(r[0], { bold: true, size: 19 })), pc(t(r[1], { size: 19, color: GRAY })), pc(t(r[2], { size: 19 }))]),
]));

const heading = (size, color, before, after) => ({ run: { font: FONT, size, bold: true, color }, paragraph: { spacing: { before, after }, keepNext: true } });
const doc = new Document({
  creator: '수행평가 수업 자료', title: 'CODAP으로 그래프 6종 만들기',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: '191F28' } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 60, bold: true, color: '191F28' }, paragraph: { spacing: { before: 0, after: 200 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(34, '191F28', 0, 120), paragraph: { spacing: { before: 0, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...heading(24, BLUE, 200, 100), paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering,
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: body }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('DOCX', OUT, buf.length); });
