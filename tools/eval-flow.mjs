// 대화 판단 정답지 시험: 실제 AI 서버(Gemini)에 사용자 테스트에서 나온 상황들을 보내고, 판단이 맞는지 채점한다.
// 프롬프트·틀을 바꿀 때마다 돌려서 점수로 비교한다 (하나 고치다 다른 게 망가지는지 확인).
// 사용법: node tools/eval-flow.mjs [반복 횟수=1]   ※ 한 번에 약 3분. 실제로 쓰는 중에는 돌리지 말 것 (같은 무료 한도를 쓴다)   (TC_EP로 서버 주소를 바꿀 수 있음)
const EP = process.env.TC_EP || 'https://teacanvas-ai.sehoon3554.workers.dev/';
const REPEAT = +process.argv[2] || 1;
const GREEN = { name: '달빛 걷기', brand: '오설록', type: '녹차' };
const H = (...xs) => xs.map((t, i) => ({ who: i % 2 ? 'me' : 'bot', text: t }));
const filled = (o = {}) => o;

// 결과를 한 모양으로: {reply, set:{칸:값}, ui, finish, end}
const norm = j => j ? ({ reply: j.reply || '', set: j.fill || j.set || {}, ui: j.action || j.ui || 'none', step: j.step || '', finish: !!j.finish, end: !!j.end }) : null;
const has = (r, k) => !!(r.set[k] && String(r.set[k]).trim());

const CASES = [
  // 차 이름
  { id: '티백+ㅇㅇ', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '녹차티백 ㅇㅇ' }, ok: r => /녹차/.test(r.set.name || '') && !/ㅇ/.test(r.set.brand || '') && r.set.type === 'green' },
  { id: '브랜드+이름', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '오설록 제주 세작' }, ok: r => /세작/.test(r.set.name || '') && /오설록/.test(r.set.brand || '') && r.set.type === 'green' },
  { id: '인사는 차 아님', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '안녕 오늘 좀 피곤하네' }, ok: r => !has(r, 'name') },
  { id: '청귤차=기타', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '청귤차 마실 거야' }, ok: r => r.set.type === 'other' },
  { id: '캐모마일=허브', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '캐모마일' }, ok: r => r.set.type === 'herb' },
  { id: '가향녹차=녹차', b: { stage: 'tea', want: 'tea', next: 'teatype', message: '오설록 달빛걷기' }, ok: r => r.set.type === 'green' },
  // 종류 확인
  { id: '확인+이미 우림', tea: GREEN, b: { stage: 'teaOK', want: 'teatype', next: 'guide', message: '응 맞아 근데 이미 우려놨어' }, ok: r => r.ui === 'drink_now' },
  { id: '종류 고침', tea: GREEN, b: { stage: 'teaOK', want: 'teatype', next: 'guide', message: '아니 홍차야' }, ok: r => r.set.type === 'black' },
  { id: '종류 질문은 확정 아님', tea: GREEN, b: { stage: 'teaOK', want: 'teatype', next: 'guide', message: '블렌디드인데 허브차가 맞아?' }, ok: r => !r.set.type && /[?？]/.test(r.reply) },
  // 가이드
  { id: '말로 우림 시작', tea: GREEN, b: { stage: 'guide', want: '', next: 'brew', message: '응 이제 시작하자', guide: { temp: '70 – 80°C', time: '2분' } }, ok: r => r.ui === 'start_brew' },
  { id: '가이드 질문', tea: GREEN, b: { stage: 'guide', want: '', next: 'brew', message: '물은 몇 도로 해?', guide: { temp: '70 – 80°C', time: '2분' } }, ok: r => r.ui !== 'start_brew' && /7\d|80/.test(r.reply) },
  { id: '개완 질문은 설명만', tea: GREEN, b: { stage: 'guide', want: '', next: 'brew', message: '개완이 뭐야?', guide: { temp: '70 – 80°C', time: '2분' } }, ok: r => r.ui === 'none' || r.ui === 'stay' },
  { id: '개완 없음 → 기본 가이드', tea: GREEN, b: { stage: 'guide', want: '', next: 'brew', message: '그런 찻잔 없는데. 머그컵에 할게', guide: { temp: '80°C', time: '15 – 25초', gongfu: true } }, ok: r => r.step === 'guide_basic' },
  { id: '개완으로 할게', tea: GREEN, b: { stage: 'guide', want: '', next: 'brew', message: '나 개완 있어 개완으로 우릴래', guide: { temp: '70 – 80°C', time: '2분' } }, ok: r => r.step === 'guide_gongfu' },
  // 우리는 중
  { id: '치즈냥이는 색 아님', tea: GREEN, b: { stage: 'wait', want: '', next: 'wait', message: '우리 집 노란 치즈냥이가 옆에 있어', timer: { left: 60, total: 120 } }, ok: r => !has(r, 'color') },
  { id: '다 우렸어', tea: GREEN, b: { stage: 'wait', want: '', next: 'wait', message: '벌써 다 우렸어', timer: { left: 60, total: 120 } }, ok: r => r.ui === 'brew_done' },
  { id: '우리는 중 색 말함', tea: GREEN, b: { stage: 'wait', want: '', next: 'wait', message: '찻물이 연한 연두색이 됐네', timer: { left: 60, total: 120 } }, ok: r => has(r, 'color') },
  // 색
  { id: '색 모르겠어', tea: GREEN, b: { stage: 'color', want: 'color', next: 'aroma', message: '음 잘 모르겠어' }, ok: r => !has(r, 'color') },
  { id: '슬라이더 동의', tea: GREEN, b: { stage: 'color', want: 'color', next: 'aroma', message: '비슷해 이대로', screen: { color: '연한 연두' } }, ok: r => /연두/.test(r.set.color || '') },
  { id: '색 표현', tea: GREEN, b: { stage: 'color', want: 'color', next: 'aroma', message: '노란빛 도는 연두색' }, ok: r => /연두/.test(r.set.color || '') },
  // 향
  { id: '향 모르겠어', tea: GREEN, b: { stage: 'aroma', want: 'aroma', next: 'taste', message: '향은 잘 모르겠어', filled: { color: '연두색' } }, ok: r => !has(r, 'aroma') && /[?？]/.test(r.reply) },
  { id: '비유도 향', tea: GREEN, b: { stage: 'aroma', want: 'aroma', next: 'taste', message: '할머니 집 냄새 같아', filled: { color: '연두색' } }, ok: r => /할머니/.test(r.set.aroma || '') },
  { id: '향+맛 한 번에', tea: GREEN, b: { stage: 'aroma', want: 'aroma', next: 'taste', message: '고소한 향이 나고 맛은 달달해', filled: { color: '연두색' } }, ok: r => /고소/.test(r.set.aroma || '') && /달/.test(r.set.taste || '') },
  { id: '질문은 향 아님', tea: GREEN, b: { stage: 'aroma', want: 'aroma', next: 'taste', message: '이거 어디서 만든 차야?', filled: { color: '연두색' } }, ok: r => !has(r, 'aroma') && r.reply.length > 5 },
  { id: '향 보충은 합치기', tea: GREEN, b: { stage: 'taste', want: 'taste', next: 'free', message: '아 그리고 향에서 끝에 꿀 향도 나', filled: { color: '연두색', aroma: '은은한 꽃향' } }, ok: r => /꽃/.test(r.set.aroma || '') && /꿀/.test(r.set.aroma || '') },
  { id: '슬라이더 다시', tea: GREEN, b: { stage: 'aroma', want: 'aroma', next: 'taste', message: '색 슬라이더 다시 보내줘', filled: { color: '연두색' } }, ok: r => r.ui === 'ask_color' },
  // 맛
  { id: '맛', tea: GREEN, b: { stage: 'taste', want: 'taste', next: 'free', message: '쌉싸름한데 끝에 단맛이 있어', filled: { color: '연두색', aroma: '꽃향' } }, ok: r => /쌉/.test(r.set.taste || '') },
  { id: '달콤하게 나요=맛·향', tea: GREEN, b: { stage: 'taste', want: 'taste', next: 'free', message: '배 향이 달콤하게 나요', filled: { color: '연두색', aroma: '꽃향' } }, ok: r => !/좋은 질문/.test(r.reply) },
  // 자유 대화 · 여운 · 마무리
  { id: '다 마셨어', tea: GREEN, b: { stage: 'free', want: '', next: 'after', message: '다 마셨어', filled: { color: '연두색', aroma: '꽃향', taste: '단맛' } }, ok: r => r.finish },
  { id: '잡담은 마무리 아님', tea: GREEN, b: { stage: 'free', want: '', next: 'after', message: '비가 와서 그런지 더 맛있네', filled: { color: '연두색', aroma: '꽃향', taste: '단맛' } }, ok: r => !r.finish && !has(r, 'after') },
  { id: '여운', tea: GREEN, b: { stage: 'after', want: 'after', next: 'extra', message: '꿀 같은 단맛이 오래 남아', filled: { color: '연두색', aroma: '꽃향', taste: '단맛' } }, ok: r => /꿀/.test(r.set.after || '') },
  { id: '여운 없음', tea: GREEN, b: { stage: 'after', want: 'after', next: 'extra', message: '딱히 없어', filled: { color: '연두색', aroma: '꽃향', taste: '단맛' } }, ok: r => !has(r, 'after') || /없/.test(r.set.after) },
  { id: '이제 끝낼게', tea: GREEN, b: { stage: 'more', want: 'extra', next: 'done', message: '아니 없어 이제 끝낼게', filled: { color: '연두색', aroma: '꽃향', taste: '단맛', after: '단맛이 남음' } }, ok: r => r.end || r.finish },
];

async function call(c) {
  const body = { mode: 'flow', lang: 'ko', event: 'message', tea: c.tea || null, history: H('반가워요. 오늘은 어떤 차를 마셔볼까요?'), about: '', filled: filled(c.b.filled), timer: null, screen: null, ...c.b };
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(body) });
      if (r.ok) return { j: await r.json(), ms: Date.now() - t0 };
      const e = await r.text(); if (!/429|RESOURCE|503|overload/i.test(e) || i === 3) return { err: `${r.status} ${e.slice(0, 120)}` };
    } catch (e) { if (i === 3) return { err: String(e) }; }
    await new Promise(s => setTimeout(s, 4000 * (i + 1)));
  }
}

const rows = []; let pass = 0, total = 0, ms = [];
// 무료 한도(모델별 분당 약 15번)를 넘지 않게 하나씩, 5초 간격으로 보낸다. 시험이 한도를 다 쓰면 실제 사용자의 대화가 자동 대화로 떨어진다
const GAP = +process.env.TC_GAP || 5000;
for (let k = 0; k < REPEAT; k++) for (let i = 0; i < CASES.length; i += 1) {
  if (i || k) await new Promise(s => setTimeout(s, GAP));
  const batch = CASES.slice(i, i + 1);
  const res = await Promise.all(batch.map(call));
  batch.forEach((c, n) => { const x = res[n]; total++;
    if (x.err) { rows.push(`  ! ${c.id}: 서버 오류 ${x.err}`); return; }
    const r = norm(x.j), good = !!(r && c.ok(r)); if (good) pass++; ms.push(x.ms);
    rows.push(`  ${good ? '✓' : '✗'} ${c.id}${good ? '' : `  → ${JSON.stringify({ reply: r && r.reply, set: r && r.set, ui: r && r.ui, finish: r && r.finish, end: r && r.end })}`}`); });
}
console.log(rows.join('\n'));
ms.sort((a, b) => a - b);
console.log(`\n점수 ${pass}/${total} (${Math.round(pass / total * 100)}%) · 응답 시간 중앙값 ${ms[ms.length >> 1] || '-'}ms`);
