// 활동지 내용 (학생 화면, 관리 화면, 서버가 같이 사용)
// 칸을 바꾸면 시트 '답안' 탭 칸 제목도 자동으로 바뀜. key는 영문, 한 번 정하면 바꾸지 않기 (바꾸면 예전 답이 안 보임)
const ACTIVITY = {
  title: 'AI 사용 윤리 헌장 만들기',
  eyebrow: '창의적 체험활동 | AI 시대의 배움과 평가',
  heading: '우리 학교\nAI 사용 윤리 헌장 만들기',
  lead: '수능 AI 부정행위 기사를 읽고 수행평가, 과제, 시험에서 AI를 어떻게 써야 할지 헌장 조항 만들기',
  terms: [['헌장', '우리가 함께 지키기로 정한 규칙'], ['조항', '헌장 안의 규칙 하나하나']],
  modes: {
    solo: { name: '개별 활동', desc: '세 문항에 짧게 답하기', time: '10~15분' },
    group: { name: '모둠 활동', desc: '모둠이 함께 헌장을 만든 뒤 내가 맡은 조항 기록', time: '약 30분' },
  },
  // 활동 방식과 상관없이 받는 칸
  meta: [
    { key: 'group', label: '모둠 이름', only: 'group', type: 'in', hint: '예) 3모둠, 공정지킴이' },
    { key: 'career', label: '관심 진로 분야 (선택)', type: 'in', hint: '예) 교사, 소프트웨어 개발자, 간호사, 아직 고민 중' },
  ],
  steps: [
    {
      id: 'step1', name: '기사와 나의 질문', time: { solo: '약 5분', group: '약 5분' },
      q: '기사를 읽고 무엇이 문제인지 정리한 뒤 나만의 질문 만들기',
      fields: [
        { key: 's1_issue', label: '① 기사 제목과 핵심 쟁점', type: 'ta', rows: 3, need: true,
          hint: '예) 「기사 제목」(언론사) - 시험에서 AI를 몰래 쓰면 공정한 평가가 어렵다는 점이 문제' },
        { key: 's1_q', label: '② 나의 질문', type: 'in', need: true,
          hint: '\'~해야 할까?\'로 끝나는 한 문장. 예) 수행평가에서 AI 사용을 허용해야 할까?' },
      ],
    },
    {
      id: 'step2', name: '헌장 조항 만들기', time: { solo: '약 5분', group: '약 15분' },
      q: '수행평가, 과제, 시험에서 AI를 어떻게 써야 할지 헌장 조항을 만들고 왜 필요한지 쓰기',
      fields: [
        { key: 's2_area', label: '조항의 영역', type: 'pick', need: true, opts: ['수행평가', '과제', '지필 및 수능 시험', '수업 활동'], hint: '하나 고르기' },
        { key: 's2_rule', label: '③ 내가 제안하는 헌장 조항과 그 이유', type: 'ta', rows: 4, only: 'solo', need: true,
          hint: '예) 조항 : 보고서에 AI를 썼다면 어느 부분에 썼는지 밝힌다. 이유 : 내 생각과 AI의 생각을 구분해야 정직하게 평가받을 수 있기 때문' },
        { key: 's2_mine', label: '③ 우리 모둠 헌장에서 내가 맡은 조항과 그 이유', type: 'ta', rows: 4, only: 'group', need: true,
          hint: '예) 제2조 : 시험 중에는 어떤 AI 도구도 쓰지 않는다. 이 조항을 제안한 이유는 ~ 때문' },
      ],
    },
    {
      id: 'step3', name: '한 줄 소감 (선택)', time: { solo: '약 2분', group: '약 2분' },
      q: '쓰고 싶은 사람만 자유롭게, 비워 둬도 됨',
      fields: [
        { key: 's3_note', label: '오늘 활동에서 기억에 남는 점', type: 'in', hint: '예) 친구들마다 AI를 쓰는 기준이 달라서 놀랐다.' },
      ],
    },
  ],
};

// 모든 칸 목록 (meta 포함), 활동 방식에 맞는 칸만 고르기
const ALL_FIELDS = ACTIVITY.meta.concat(...ACTIVITY.steps.map(s => s.fields));
const fieldsFor = mode => ALL_FIELDS.filter(f => !f.only || f.only === mode);
// 필수 칸 중 몇 개 썼는지
function progressOf(a) {
  if (!a || !a.mode) return { done: 0, total: ACTIVITY.steps.reduce((n, s) => n + s.fields.filter(f => f.need && (!f.only || f.only === 'solo')).length, 0) };
  const need = fieldsFor(a.mode).filter(f => f.need);
  return { done: need.filter(f => String(a[f.key] || '').trim()).length, total: need.length };
}
