/* TEA CANVAS AI 중간 서버 (Cloudflare Worker)
   앱 → 이 서버 → Gemini API. API 키는 이 서버의 비밀값(GEMINI_API_KEY)에만 둔다.

   필요한 설정 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets)
   - GEMINI_API_KEY  (Secret)  Google AI Studio에서 만든 키
   - GEMINI_MODEL    (선택)    먼저 쓸 모델 (쉼표로 여러 개). 없으면 FALLBACK_MODELS 순서대로
   - ALLOWED_ORIGINS (선택)    쉼표로 구분. 기본값은 아래 DEFAULT_ORIGINS

   앱이 보내는 것 (POST JSON)
   - mode: 'flow' | 'chat' | 'identify' | 'question' | 'compare' | 'recommend' | 'speak'
   - lang: 'ko' | 'en'
   - tea: {name, brand, type} | null,  history: [{who:'me'|'bot', text}]
   - question 모드: question
   - compare 모드: expressions[], feel{}, flavors[], labels[], local{expert, mine, common[], diff[], generic}
   - recommend 모드: flavors[], recorded[]
   돌려주는 것
   - question:  {text}
   - compare:   {expert?, common[], diff[], ai}
   - recommend: {teas:[{name, type, flavors[], why}]}
   실패하면 {error}와 함께 4xx/5xx → 앱은 정해진 대답으로 넘어간다. */

const DEFAULT_ORIGINS = ['https://teacanvas.github.io', 'null', 'http://localhost', 'http://127.0.0.1'];
const MAX_BODY = 24000;            // 요청 크기 상한 (글자)
const TEA_TYPES = ['green', 'white', 'oolong', 'black', 'dark', 'herb', 'other'];   // other = 기타 (보리차·우엉차 같은 곡물·뿌리 차)
const FLAVOR_EN = ['Floral', 'Fruity', 'Citrus', 'Grassy', 'Fresh', 'Nutty', 'Sweet', 'Earthy', 'Spicy', 'Smooth', 'Astringent'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : DEFAULT_ORIGINS);
    const okOrigin = allowed.some(a => origin === a || (a.startsWith('http://localhost') && origin.startsWith('http://localhost')) || (a.startsWith('http://127.0.0.1') && origin.startsWith('http://127.0.0.1')));
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-TTS-Model, X-AI-Trace',
      'Vary': 'Origin',
    };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET') {   // 주소가 살아 있는지 확인용. ?models 를 붙이면 이 키로 쓸 수 있는 Flash 모델 이름을 보여준다
      if (new URL(req.url).searchParams.has('models') && env.GEMINI_API_KEY) {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
        const j = r.ok ? await r.json() : {};
        return out({ ok: r.ok, status: r.status, models: (j.models || []).map(m => m.name.replace('models/', '')).filter(n => /flash/.test(n)) });
      }
      return out({ ok: true, service: 'teacanvas-ai', key: !!env.GEMINI_API_KEY });
    }
    if (req.method !== 'POST') return out({ error: 'method' }, 405);
    if (!okOrigin) return out({ error: 'origin' }, 403);
    if (!env.GEMINI_API_KEY) return out({ error: 'no key' }, 500);

    let body;
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return out({ error: 'too large' }, 413);
      body = JSON.parse(raw);
    } catch (e) { return out({ error: 'bad json' }, 400); }

    if (body && body.mode === 'speak') {   // 글 → 목소리(wav). 실패하면 JSON 오류 → 앱은 휴대폰 목소리로
      try {
        const { wav, model } = await speakGemini(env, body);
        return new Response(wav, { headers: { ...cors, 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-TTS-Model': model } });
      } catch (e) { return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); }
    }
    const tspec = TEXT_SPECS[body && body.mode];   // 대화·차 찾기: 필요하면 Google 검색까지 하는 글 응답
    if (tspec) {
      const en = body.lang === 'en';
      try {
        const text = await geminiText(env, tspec.system(en, body), tspec.prompt(body, en), { search: true, maxTokens: tspec.maxTokens, budgetMs: tspec.budgetMs });
        const clean = tspec.clean(text, body);
        const res = clean ? out(clean) : out({ error: 'empty' }, 502); res.headers.set('X-AI-Trace', TRACE.join(' ')); return res;
      } catch (e) { const res = out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); res.headers.set('X-AI-Trace', TRACE.join(' ')); return res; }
    }
    const spec = SPECS[body && body.mode];
    if (!spec) return out({ error: 'mode' }, 400);
    const en = body.lang === 'en';

    try {
      const json = await gemini(env, spec.system(en), spec.prompt(body, en), spec.schema, spec.maxTokens, body.mode === 'question' ? 8000 : 14000);
      const clean = spec.clean(json, body);
      if (!clean) return out({ error: 'empty' }, 502);
      return out(clean);
    } catch (e) {
      return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502);
    }
  },
};

/* ---------- Gemini 호출 ---------- */
// 무료 플랜은 모델이 붐비면 503을 준다 → 다음 모델로 넘어간다. 앱이 기다리는 시간 안에서만 시도한다.
// 무료 한도는 모델마다 따로다 (예: 3.5·3.1 Flash Lite 하루 500번·분당 15번, Flash 하루 20번). 가벼운 모델부터 쓰고, 한도(429)·붐빔(503)이면 다음 모델로
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview'];
const NO_THINK_CFG = new Set();      // 생각 끄기 설정을 거절한 모델 (다음 요청부터 바로 설정 없이)
// 3.x 모델과 '최신' 별칭은 생각 끄기(thinkingBudget 0)를 거절(400)한다 → 대신 '생각 최소(thinkingLevel minimal)'로 빨리 답하게. 그것도 거절하면 설정 없이
const noThink = m => NO_THINK_CFG.has(m);
const thinkCfg = m => /^gemini-3|latest$/.test(m) ? { thinkingLevel: 'minimal' } : { thinkingBudget: 0 };
let SEARCH_OFF_UNTIL = 0;           // 검색 한도가 차면(429) 잠시 검색 없이 (매번 거절당하며 시간 쓰지 않게)
async function gemini(env, system, prompt, schema, maxTokens, budgetMs) {
  const deadline = Date.now() + budgetMs;
  const models = [...new Set([...(env.GEMINI_MODEL ? env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...FALLBACK_MODELS])];
  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: maxTokens, temperature: 0.6 },
  };
  let last = 'no model';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const tries = noThink(model) ? [base] : [{ ...base, generationConfig: { ...base.generationConfig, thinkingConfig: thinkCfg(model) } }, base];
    for (let i = 0; i < tries.length; i++) {
      const left = deadline - Date.now();
      if (left < 1200) throw new Error('timeout; last ' + last);
      let r;
      try {
        r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(tries[i]), signal: AbortSignal.timeout(Math.min(4500, left - 300)) });
      } catch (e) { last = `${model} timeout`; break; }
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!text) { last = `${model} empty`; break; }
        return JSON.parse(text);
      }
      last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`;
      if (r.status === 400 && i === 0 && tries.length > 1) { NO_THINK_CFG.add(model); continue; }   // 설정 문제 → 설정 빼고 같은 모델로
      if (r.status === 401 || r.status === 403) throw new Error(last);                             // 키 문제는 다른 모델로 가도 같다
      break;                                                                                        // 503·429·404 등 → 다음 모델
    }
  }
  throw new Error(last);
}

/* ---------- 글 응답 + Google 검색 (대화·차 찾기) ---------- */
// 검색 도구를 붙여 보내고, 그 모델이 검색을 못 쓰거나(400) 검색 한도가 차면(429) 검색 없이 다시 보낸다
let TRACE = [];   // 어느 모델에서 얼마나 걸렸는지 (응답 머리말 X-AI-Trace로 확인용)
async function geminiText(env, system, prompt, { search, maxTokens, budgetMs }) {
  // 붐빌 때를 위한 '겹쳐 묻기': 첫 모델이 2.5초 안에 답이 없으면 다음 모델에도 같이 묻고, 먼저 온 답을 쓴다 (동시에 최대 2개)
  const deadline = Date.now() + budgetMs; TRACE = [];
  const models = [...new Set([...(env.GEMINI_MODEL ? env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...FALLBACK_MODELS])];
  const queue = []; for (const m of models) { if (search) queue.push({ m, tools: true }); queue.push({ m, tools: false }); }
  const tag = (a, x) => `${a.m.replace('gemini-', '')}${a.tools ? '+s' : ''}:${x}`;
  const attempt = async (a, signal) => {
    for (const think of (noThink(a.m) ? [false] : [true, false])) {
      const gc = { maxOutputTokens: maxTokens, temperature: 0.7 };
      if (think) gc.thinkingConfig = thinkCfg(a.m);
      const payload = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc };
      if (a.tools) payload.tools = [{ google_search: {} }];
      const t0 = Date.now();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(a.m)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(payload), signal });
      TRACE.push(tag(a, `${r.status}:${Date.now() - t0}`));
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
        if (text) return text;
        throw new Error(`${a.m} empty`);
      }
      const body = (await r.text()).slice(0, 120);
      if (r.status === 400 && think) { NO_THINK_CFG.add(a.m); continue; }                       // 생각 설정을 모르는 모델 → 설정 없이 한 번 더
      if (r.status === 429 && a.tools) SEARCH_OFF_UNTIL = Date.now() + 15 * 60e3;              // 검색 한도 → 15분 동안 검색 없이
      const e = new Error(`${a.m} ${r.status} ${body}`); e.fatal = r.status === 401 || r.status === 403; throw e;
    }
    throw new Error(`${a.m} no variant`);
  };
  return new Promise((resolve, reject) => {
    let running = 0, done = false, last = 'no model'; const ctls = new Set();
    const finish = (ok, v) => { if (done) return; done = true; ctls.forEach(c => c.abort()); ok ? resolve(v) : reject(v); };
    const launch = () => {
      if (done) return;
      let a; while ((a = queue.shift()) && a.tools && Date.now() < SEARCH_OFF_UNTIL);   // 검색이 쉬는 중이면 검색 시도는 건너뛴다
      const left = deadline - Date.now();
      if (!a || left < 1200) { if (!running) finish(false, new Error((a ? 'timeout; last ' : '') + last)); return; }
      running++; const ctl = new AbortController(); ctls.add(ctl);
      const cap = setTimeout(() => ctl.abort(), Math.min(6000, left - 300));
      let hedge = setTimeout(() => { hedge = null; if (!done && running < 2) launch(); }, 2500);
      attempt(a, ctl.signal).then(t => finish(true, t)).catch(e => {
        if (e && e.name === 'AbortError') { if (!done) TRACE.push(tag(a, 'timeout')); last = `${a.m} timeout`; }
        else last = String(e && e.message || e);
        if (e && e.fatal) finish(false, e);
      }).finally(() => { running--; ctls.delete(ctl); clearTimeout(cap); if (hedge) clearTimeout(hedge); if (!done && running < 2) launch(); });
    };
    launch();
  });
}
const plain = t => String(t || '').replace(/\*\*|__|[#*`>]/g, '').replace(/\[(\d+(,\s*\d+)*)\]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const STAGE_KO = { tea: '차 이름을 정하는 중', teaOK: '차 종류를 확인하는 중', teaType: '차 종류를 고르는 중', guide: '우림 가이드를 보는 중', wait: '차가 우러나기를 기다리는 중', color: '찻물 색을 보는 중', wait2: '다 우러나기를 기다리는 중', aroma: '향을 맡아보는 중', taste: '맛을 보는 중', free: '차를 마시며 자유롭게 이야기하는 중', after: '다 마시고 여운을 보는 중', more: '기록을 마무리하는 중', deep: '기록을 마무리하는 중' };
const TEXT_SPECS = {
  chat: {
    maxTokens: 400, budgetMs: 9500,
    system: en => (en
      ? `You are a friend sitting with the user over a cup of tea, inside TEA CANVAS (an app that records how tea tastes and smells and turns it into a watercolor drop).
How to talk:
- Listen first. Respond to exactly what the user just said: pick up their words, their mood, their story. Never ignore it to follow a script.
- Calm, light, warm, everyday words. 1–3 short sentences (under 220 characters) — your reply may be read aloud.
- Ask at most one light question, and not every time. Small talk can go anywhere natural (their day, the place, the tea, memories), no fixed topics.
- If they ask about the tea (origin, how it's made, why it tastes a certain way, caffeine, brewing), answer accurately and simply. Search the web when you are not sure. If you still don't know, say so briefly.
- Don't lecture, don't list, no markdown, no emoji, no links. Don't put words in their mouth about how the tea tastes.
- If the user says they've finished drinking or want to wrap up, reply with one warm closing sentence and then write [[FINISH]] at the very end.`
      : `너는 TEA CANVAS(차의 맛과 향을 기록해 수채화 찻방울로 남기는 앱) 안에서, 사용자와 마주 앉아 차를 함께 마시는 친구야.
말하는 법:
- 먼저 들어. 사용자가 방금 한 말에 정확히 반응해. 그 말·기분·이야기를 받아서 이어가고, 정해진 순서대로 묻느라 흘려듣지 마.
- 말투는 처음부터 끝까지 늘 다정한 존댓말(해요체)이야. 사용자가 반말을 해도 반말로 바꾸지 마. ('~해요', '~네요', '~할까요?' 등. '~해', '~야', '~지?' 같은 반말 금지)
- 차분하고 가볍고 쉬운 일상어. 1~3문장, 160자 이내 (소리 내 읽을 수 있어).
- 질문은 한 번에 하나만, 매번 하지 않아도 돼. 가벼운 이야기는 정해진 주제 없이 자연스럽게 (오늘 하루, 있는 곳, 이 차, 추억 등).
- 차에 대해 물으면 (산지, 만드는 법, 왜 이런 맛이 나는지, 카페인, 우리는 법) 정확하고 쉽게 답해. 확실하지 않으면 웹에서 찾아봐. 그래도 모르면 짧게 모른다고 해.
- 가르치려 하지 말고, 목록·마크다운·이모지·링크 금지. 사용자가 느끼지 않은 맛을 느꼈다고 단정하지 마.
- 너는 차를 직접 맛보거나 냄새 맡을 수 없어. '향이 나네요'처럼 네가 느낀 듯 말하지 말고, 사용자의 느낌을 받아서 말해 ('그런 향이 느껴지셨군요').
- 타이머 숫자(몇 초 남음 등)는 말하지 마. 시간은 앱이 알려줘.
- 사용자가 다 마셨다거나 이제 마무리하고 싶다고 하면, 다정한 마무리 한 문장을 말하고 맨 끝에 [[FINISH]] 라고 붙여.`),
    prompt: (b, en) => {
      const ev = str(b.event, 30), t = b.timer;
      const timer = t && t.total ? (en ? `Brew timer: ${Math.max(0, t.left | 0)}s left of ${t.total | 0}s` : `우림 타이머: ${t.total | 0}초 중 ${Math.max(0, t.left | 0)}초 남음`) : '';
      const what = ev === 'idle'
        ? (en ? 'The user has been quiet for a while. Say one gentle thing that fits this moment (a small sensory nudge or a light question). Do not repeat earlier lines.' : '사용자가 한동안 조용해. 지금 이 순간에 어울리는 말을 한 번 건네 줘 (감각을 깨우는 짧은 말이나 가벼운 질문). 앞에서 한 말은 반복하지 마.')
        : ev === 'brew_start'
        ? (en ? 'They just started brewing. Open the conversation in one or two short sentences, fitting this tea.' : '방금 우림을 시작했어. 이 차에 어울리게 한두 문장으로 대화를 열어 줘.')
        : ev.startsWith('answered:')
        ? (en ? `The app asked about the tea's ${ev.slice(9)} and the user answered: "${str(b.message, 300)}". React warmly in ONE short sentence to what they said. Do not ask anything; the app asks the next question.` : `앱이 차의 ${({ color: '색', aroma: '향', taste: '맛' })[ev.slice(9)] || ev.slice(9)}을 물었고 사용자가 이렇게 답했어: "${str(b.message, 300)}". 그 말에 짧게 한 문장으로만 반응해. 질문은 하지 마 (다음 질문은 앱이 해).`)
        : (en ? `The user just said: "${str(b.message, 400)}"` : `사용자가 방금 한 말: "${str(b.message, 400)}"`);
      return [teaLine(b, en), b.about ? (en ? 'About this tea: ' : '이 차 정보: ') + str(b.about, 200) : '',
        (en ? 'Now: ' : '지금: ') + (STAGE_KO[b.stage] || str(b.stage, 20)), timer,
        (en ? 'Conversation so far:\n' : '지금까지 대화:\n') + (historyText(b, en) || '-'), '', what].filter(Boolean).join('\n');
    },
    clean: (text, b) => {
      let t = plain(text), finish = /\[\[\s*FINISH\s*\]\]/i.test(t);
      t = t.replace(/\[\[\s*FINISH\s*\]\]/ig, '').trim().slice(0, 400);
      return t ? { reply: t, finish } : null;
    },
  },
  /* 대화 전체를 AI가 이끈다: 앱은 큰 단계와 '지금 채울 것(want)·그다음(next)'만 알려주고, AI가 듣고 말하고 기록할 것을 뽑는다 */
  flow: {
    maxTokens: 600, budgetMs: 9500,
    system: en => (en
      ? `You are a friend sitting with the user over a cup of tea, inside TEA CANVAS (an app that records how a tea looks, smells and tastes and turns it into a watercolor drop). You lead the whole conversation; the app only tells you what still needs recording.
How to talk:
- Listen first and respond to exactly what the user just said (their words, mood, story). Answer questions about the tea accurately and simply; search the web when unsure.
- Always polite, warm and calm. 1–3 short sentences (under 220 characters), it may be read aloud. At most one question per reply.
- You cannot taste or smell the tea yourself; reflect the user's senses. Never say timer numbers. No markdown, lists, emoji or links.
What to record (the app gives "want" and "next"):
- want = the thing to record now (color = the tea's color in the cup, aroma, taste, after = aftertaste/how it changed as it cooled, extra = one optional detail). If the user's message gives it, put their own words in fill.<want> (short, as they said it).
- When want gets filled (or when want is none and the user says they've finished drinking), react, then move on according to next:
  wait = don't ask anything new, just keep chatting (the app will tell you when the tea is ready) · aroma = naturally invite them to smell it · taste = invite them to take a sip and describe the taste · free = invite them to drink slowly and talk freely; mention they can tell you when they're done · after = ask about the aftertaste or how it changed as it cooled · extra = ask ONE light optional thing worth keeping (how many infusions, origin, a note about today) only if not already known; otherwise close · done = one warm closing sentence.
- If the message does not give want, just respond naturally; you may gently bring it back at the end, but don't nag.
- If want is tea: we don't know the tea yet. If the user mentions one, fill name (tea name only, no brand), brand (if any), type (one of the six types below) and about (one sentence on its base and main flavor notes), and in reply introduce it briefly and ask whether to record it as that type. If no tea is mentioned, respond and ask what tea they'll have.
- If want is teatype: the app proposed the type shown on the "Tea:" line. If the user confirms or names a type, set fill.type to one of green|white|oolong|black|dark|herb|other (blends: by the base tea leaf; herbs, flowers or fruit with no tea leaf = herb; grain or root teas like barley, burdock or corn tea = other). If they ask (e.g. "it's a blend, is herbal right?"), explain accurately what the base is and ask which type to record. If they correct the name, set fill.name.
  next = guide: once the type is settled, say briefly that you'll show how to brew it (the app shows the guide).
- If next is brew (they're looking at the brewing guide): answer brewing questions and tell them to tap or say "start brewing" when ready.
- Also pick up details mentioned anywhere: mood, scene (where/with whom), why (why this tea), origin, temp (water temperature), time (steeping time), memo (anything worth remembering).
Reply with ONLY a JSON object:
{"reply": "...", "fill": {only keys you found}, "sense": true if the user's message describes how the tea looks/smells/tastes/feels, "finish": true if the user says they've finished drinking or want to wrap up, "end": true if want is extra and the record can now be closed}`
      : `너는 TEA CANVAS(차의 색·향·맛을 기록해 수채화 찻방울로 남기는 앱) 안에서 사용자와 마주 앉아 차를 함께 마시는 친구야. 대화는 처음부터 끝까지 네가 이끌어. 앱은 아직 기록할 것만 알려줘.
말하는 법:
- 먼저 들어. 사용자가 방금 한 말(말·기분·이야기)에 정확히 반응해. 차에 대해 물으면 정확하고 쉽게 답하고, 확실하지 않으면 웹에서 찾아봐.
- 늘 다정한 존댓말(해요체). 사용자가 반말해도 바꾸지 마. 1~3문장, 160자 이내(소리 내 읽을 수 있어). 질문은 한 번에 하나만.
- 너는 차를 맛보거나 냄새 맡을 수 없어. 사용자의 감각을 받아서 말해. 타이머 숫자는 말하지 마. 마크다운·목록·이모지·링크 금지.
기록할 것 (앱이 want와 next를 줘):
- want = 지금 기록할 것 (color = 찻잔 속 찻물 색, aroma = 향, taste = 맛, after = 끝에 남는 여운이나 식으면서 달라진 점, extra = 덧붙일 한 가지). 사용자 말에 그게 있으면 fill.<want>에 사용자의 말 그대로 짧게 넣어.
- want가 채워지면 (또는 want가 없고 사용자가 다 마셨다고 하면) 반응한 뒤 next에 따라 자연스럽게 이어가:
  wait = 새로 묻지 말고 이야기만 이어가 (차가 다 우러나면 앱이 알려줘) · aroma = 향을 맡아보자고 권해 · taste = 한 모금 마셔보고 맛을 말해달라고 권해 · free = 천천히 마시며 편하게 이야기하자고 하고, 다 마시면 말해달라고 알려줘 · after = 끝에 남는 여운이나 식으면서 달라진 점을 물어 · extra = 기록에 남길 만한 가벼운 것 하나 (몇 번 우렸는지, 산지, 오늘 남기고 싶은 말)를, 아직 모르는 것만 물어. 없으면 마무리해 · done = 다정한 마무리 한 문장.
- 사용자 말에 want가 없으면 그 말에 자연스럽게 반응해. 끝에 살짝 다시 물어볼 수는 있지만 재촉하지 마.
- want가 tea면: 아직 무슨 차를 마실지 몰라. 사용자 말에 차가 나오면 fill.name(차 이름만, 브랜드 빼고), fill.brand(브랜드, 없으면 빼), fill.type(아래 teatype과 같은 6가지 중 하나), fill.about(이 차의 바탕 찻잎과 주된 향·맛을 한 문장, 60자 이내)을 넣고, reply에서 그 차를 짧게 소개한 뒤 그 종류로 기록할지 물어봐 (예: '…녹차로 기록할게요. 맞나요?'). 차가 안 나오면 그 말에 반응하고 어떤 차를 마실지 물어봐.
- want가 teatype이면: 앱이 이 차의 종류를 '차:' 줄에 적힌 종류로 제안했어. 사용자가 맞다고 하거나 다른 종류를 말하면 fill.type에 green(녹차)·white(백차)·oolong(우롱차)·black(홍차)·dark(보이차·흑차)·herb(허브·꽃·과일 차)·other(기타: 보리차·우엉차·옥수수차 같은 곡물·뿌리 차) 중 하나를 넣어. 블렌디드 차는 바탕 찻잎으로 정해 (녹차 바탕이면 green, 찻잎 없이 허브·꽃·과일이면 herb, 곡물·뿌리면 other). 사용자가 물어보면 (예: '블렌디드인데 허브차가 맞아?') 그 차의 바탕이 무엇인지 정확히 설명하고 어떤 종류로 기록할지 물어봐. 이름을 고쳐 말하면 fill.name에 넣어.
  next가 guide면: 종류가 정해졌을 때 '이 차에 맞는 우림 방법을 보여드릴게요'처럼 짧게 이어가 (앱이 가이드를 보여줘).
- 지금이 우림 가이드를 보는 중이면 (next가 brew): 우리는 법에 대한 질문에 답하고, 준비되면 '우림 시작'을 누르거나 말해 달라고 해.
- 대화 어디서든 나온 것도 챙겨: mood(기분), scene(어디서·누구와), why(이 차를 고른 이유), origin(산지), temp(물 온도), time(우린 시간), memo(남길 만한 이야기).
답은 JSON 하나만:
{"reply": "...", "fill": {찾은 것만}, "sense": 사용자 말이 차의 색·향·맛·느낌을 표현하면 true, "finish": 사용자가 다 마셨다거나 마무리하자고 하면 true, "end": want가 extra이고 이제 기록을 닫아도 되면 true}`),
    prompt: (b, en) => {
      const t = b.timer, f = b.filled && typeof b.filled === 'object' ? b.filled : {};
      const timer = t && t.total ? (t.left > 0 ? (en ? 'The tea is still steeping.' : '차가 아직 우러나는 중이야.') : (en ? 'The tea is ready.' : '차가 다 우러났어.')) : '';
      const ev = str(b.event, 30);
      const evText = {
        brew_start: en ? 'They just started steeping. Open the conversation in one or two short sentences.' : '방금 우리기 시작했어. 한두 문장으로 대화를 열어 줘.',
        color_ready: en ? 'The color is coming out now. Invite them to look at the tea\'s color (want is color).' : '이제 찻물에 색이 우러나고 있어. 찻물 색을 보자고 자연스럽게 권해 줘 (want는 color).',
        brew_done: en ? 'The tea has finished steeping. Tell them it\'s ready and invite them to smell it (want is aroma).' : '차가 다 우러났어. 다 됐다고 알려주고 향을 맡아보자고 권해 줘 (want는 aroma).',
        wrap: en ? 'The user says they have had enough. React warmly, then ask about the aftertaste (want is after).' : '사용자가 이제 충분히 마셨대. 다정하게 반응하고 끝에 남는 여운을 물어 줘 (want는 after).',
        idle: en ? 'The user has been quiet for a while. Say one gentle thing that fits this moment.' : '사용자가 한동안 조용해. 지금에 어울리는 말을 한 번 건네 줘.',
      }[ev];
      return [teaLine(b, en), b.about ? (en ? 'About this tea: ' : '이 차 정보: ') + str(b.about, 200) : '', timer,
        `want: ${str(b.want, 10) || 'none'} / next: ${str(b.next, 10) || 'none'}`,
        (en ? 'Already recorded: ' : '이미 기록한 것: ') + (Object.entries(f).filter(([k, v]) => v).map(([k, v]) => `${k}=${str(v, 60)}`).join(', ') || '-'),
        (en ? 'Conversation so far:\n' : '지금까지 대화:\n') + (historyText(b, en) || '-'), '',
        evText || ((en ? 'The user just said: ' : '사용자가 방금 한 말: ') + `"${str(b.message, 400)}"`)].filter(Boolean).join('\n');
    },
    clean: (text) => {
      const raw = String(text || ''), m = raw.match(/\{[\s\S]*\}/);
      let j = null; if (m) { try { j = JSON.parse(m[0]); } catch (e) { j = null; } }
      if (!j) { const t = plain(raw.replace(/```[a-z]*|```/g, '')).slice(0, 400); return t && !/^\{/.test(t) ? { reply: t, fill: {}, sense: false, finish: false, end: false } : null; }   // JSON이 깨지면 글만이라도
      const reply = plain(str(j.reply, 500)).slice(0, 400); if (!reply) return null;
      const KEYS = ['color', 'aroma', 'taste', 'after', 'extra', 'mood', 'scene', 'why', 'origin', 'temp', 'time', 'memo', 'name', 'brand', 'about'], fill = {};
      if (j.fill && typeof j.fill === 'object') for (const k of KEYS) { const v = str(j.fill[k], 120); if (v) fill[k] = v; }
      if (j.fill && TEA_TYPES.includes(j.fill.type)) fill.type = j.fill.type;
      return { reply, fill, sense: !!j.sense, finish: !!j.finish, end: !!j.end };
    },
  },
  identify: {
    maxTokens: 500, budgetMs: 10000,
    system: en => 'You identify teas from what the user typed. For a specific product, search the web to find it. Reply with ONLY a JSON object, no other text.',
    prompt: (b, en) => `Tea the user typed: "${str(b.text, 80)}"${b.brand ? ` (brand: ${str(b.brand, 40)})` : ''}
Return JSON: {"found": true/false, "name": product name as commonly written${en ? '' : ' in Korean'}, "brand": brand or "", "type": one of ${TEA_TYPES.join('|')} (blends: by the base tea leaf; herbs/flowers/fruit with no tea leaf = herb; grain or root teas like barley or burdock = other), "about": ${en ? 'one short sentence (under 80 chars) on its base and main flavor notes' : '이 차의 바탕 찻잎과 주된 향·맛을 한 문장으로 (60자 이내, 해요체)'}}
The user may type a whole sentence (e.g. "I don't know the brand but it's rooibos") — take only the tea. A general tea (green tea, rooibos, chamomile, Earl Grey…) also counts as found: use its common name and describe it in general. Set found to false only if you cannot tell what tea it is.`,
    clean: (text) => {
      const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return null;
      let j; try { j = JSON.parse(m[0]); } catch (e) { return null; }
      if (!j || !j.found || !TEA_TYPES.includes(j.type)) return { found: false };
      return { found: true, name: str(j.name, 30), brand: str(j.brand, 30), type: j.type, about: plain(str(j.about, 160)) };
    },
  },
};

/* ---------- 목소리 (Gemini TTS) ---------- */
// 보내는 것: {mode:'speak', text, lang, voice?, style?}  받는 것: audio/wav
// 목소리 모델은 무료 한도가 아주 작다 (하루 10번 안팎). 모델마다 따로라 여러 개를 차례로 쓴다
// 고른 목소리(Zephyr·Umbriel) 샘플을 만든 3.8 Flash TTS를 먼저 쓴다
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
async function speakGemini(env, b) {
  const text = str(b.text, 400);
  if (!text) throw new Error('no text');
  const voice = /^[A-Za-z]{2,20}$/.test(b.voice || '') ? b.voice : 'Zephyr';
  // 말투 지시문을 앞에 붙이면 가벼운 목소리 모델은 그 지시문까지 소리 내 읽는다 → 읽을 글만 보낸다
  // pin: 같은 대화에서는 처음 쓴 모델만 쓴다(모델마다 목소리 결이 달라 말할 때마다 바뀌지 않게). 그 모델이 안 되면 오류 → 앱은 휴대폰 목소리로
  const pin = /^gemini-[a-z0-9.\-]+-tts$/.test(b.pin || '') ? b.pin : '';
  const deadline = Date.now() + 12000;
  const models = pin ? [pin] : [...new Set([...(env.GEMINI_TTS_MODEL ? env.GEMINI_TTS_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...TTS_MODELS])];
  let last = 'no model';
  for (const model of models) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(left - 300),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
      });
    } catch (e) { last = `${model} timeout`; continue; }
    if (!r.ok) { last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`; if (r.status === 401 || r.status === 403) break; continue; }
    const j = await r.json();
    const parts = (j.candidates?.[0]?.content?.parts || []).filter(p => p.inlineData && p.inlineData.data);
    if (!parts.length) { last = `${model} no audio`; continue; }
    const rate = +((parts[0].inlineData.mimeType || '').match(/rate=(\d+)/) || [])[1] || 24000;
    const pcm = concat(parts.map(p => b64ToBytes(p.inlineData.data)));
    return { wav: pcmToWav(cleanTail(pcm, rate), rate), model };
  }
  throw new Error(last);
}
function concat(arrs) { const n = arrs.reduce((a, x) => a + x.length, 0), out = new Uint8Array(n); let o = 0; for (const x of arrs) { out.set(x, o); o += x.length; } return out; }
/* 목소리 끝의 '치직' 소리 없애기: 말이 끝나고 0.1초 넘게 조용하다가, 맨 끝에 짧고(0.4초 이하) 아주 큰 소리가 붙어 있으면 그 앞에서 자른다.
   말소리(보통 크기)나 문장 사이 쉼은 건드리지 않는다. 끝은 0.03초 동안 살짝 줄여 툭 끊기지 않게 */
function cleanTail(pcm, rate) {
  const n = pcm.length >> 1, win = Math.round(rate * 0.02), W = Math.floor(n / win); if (W < 20) return pcm;
  const v = new DataView(pcm.buffer, pcm.byteOffset, n * 2), R = [];
  for (let w = 0; w < W; w++) { let s = 0; for (let k = w * win; k < (w + 1) * win; k++) { const x = v.getInt16(k * 2, true); s += x * x; } R.push(Math.sqrt(s / win)); }
  let end = n;
  for (let w = W - 1, run = 0; w >= Math.max(0, W - 50); w--) {   // 끝에서 1초 안: 0.1초 넘게 조용한 구간을 찾고, 그 뒤가 짧고 아주 크면 자른다
    if (R[w] < 150) { run++; continue; }
    if (run >= 5) { const tail = R.slice(w + run + 1); if (tail.length <= 20 && Math.max(...tail) > 8000) end = (w + run + 1) * win; break; }
    run = 0;
  }
  const fade = Math.min(Math.round(rate * 0.03), end), out = new Uint8Array(pcm.slice(0, end * 2)), ov = new DataView(out.buffer);
  for (let k = 0; k < fade; k++) { const i = end - fade + k; ov.setInt16(i * 2, Math.round(ov.getInt16(i * 2, true) * (1 - k / fade)), true); }
  return out;
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function pcmToWav(pcm, rate) {   // 16비트 모노 PCM 앞에 WAV 머리말(44바이트)을 붙인다
  const h = new DataView(new ArrayBuffer(44)), w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}

/* ---------- 공통 ---------- */
const str = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const list = (v, n, len) => (Array.isArray(v) ? v.map(x => str(x, len)).filter(Boolean).slice(0, n) : []);
const teaLine = (b, en) => {
  const t = b.tea;
  if (!t || !t.name) return en ? 'Tea: unknown' : '차: 아직 모름';
  return (en ? 'Tea: ' : '차: ') + [t.brand, t.name].filter(Boolean).join(' ') + (t.type ? ` (${t.type})` : '');
};
const historyText = (b, en) => list((b.history || []).map(m => m && `${m.who === 'me' ? (en ? 'User' : '사용자') : (en ? 'Guide' : '안내')}: ${m.text}`), 30, 300).join('\n');
const VOICE = en => en
  ? 'You are the gentle guide of TEA CANVAS, an app where people record how a tea tastes and smells and turn it into a watercolor drop. Tone: calm, light, warm, everyday words, short sentences. Never lecture. No markdown, no emoji, no lists.'
  : '너는 차를 마시며 맛과 향을 기록하는 앱 TEA CANVAS의 안내자야. 말투는 늘 차분하고 다정한 존댓말(해요체)이고, 사용자가 반말을 해도 반말로 바꾸지 마. 쉬운 일상어, 짧은 문장. 가르치려 하지 마. 마크다운·이모지·목록 금지.';

/* ---------- 모드별 설정 ---------- */
const SPECS = {
  question: {
    maxTokens: 300,
    system: en => VOICE(en) + (en
      ? ' The user asks a question while brewing or drinking. Answer in 1–3 short sentences (under 220 characters) that can be read aloud. If unsure, say so briefly. If the question is unrelated to tea, answer briefly and gently guide back to the tea.'
      : ' 사용자가 차를 우리거나 마시다가 질문해. 소리 내 읽어도 자연스럽게 1~3문장, 180자 이내로 답해. 확실하지 않으면 짧게 그렇다고 말해. 차와 상관없는 질문이면 짧게 답하고 차 이야기로 부드럽게 돌아와.'),
    prompt: (b, en) => `${teaLine(b, en)}\n${en ? 'Recent conversation' : '최근 대화'}:\n${historyText(b, en) || '-'}\n\n${en ? 'Question' : '질문'}: ${str(b.question, 400)}`,
    schema: { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] },
    clean: j => { const text = str(j && j.text, 400); return text ? { text } : null; },
  },

  compare: {
    maxTokens: 700,
    system: en => VOICE(en) + (en
      ? ' Compare the user\'s own tasting notes with a general expert description of this tea. Respect the user\'s words as they are; never say they are wrong. Use the user\'s exact phrases in ‘ ’ quotes when pointing out their own expressions. Address the user as "you" / "your notes"; never say "we".'
      : ' 사용자가 남긴 표현과 이 차의 일반적인 전문가 설명을 비교해. 사용자의 표현을 그대로 존중하고, 틀렸다고 하지 마. 사용자의 표현을 짚을 때는 그 말을 ‘ ’(작은따옴표 모양의 둥근 따옴표) 안에 그대로 인용해. 사용자를 가리킬 때는 앱 문구처럼 "내가 느낀", "내 기록", "나는"을 써. "우리", "당신", "적어주신"은 쓰지 마. 전문가는 "전문가 설명"이라고 불러.'),
    prompt: (b, en) => {
      const L = b.local || {};
      const labels = list(b.labels, 11, 20);
      return [
        teaLine(b, en),
        (en ? 'User expressions: ' : '사용자 표현: ') + (list(b.expressions, 20, 120).join(' / ') || '-'),
        (en ? 'First impressions: ' : '첫인상: ') + JSON.stringify(b.feel || {}),
        (en ? 'Flavors in the drop: ' : '찻방울에 담긴 풍미: ') + (list(b.flavors, 11, 20).join(', ') || '-'),
        (en ? 'Current expert text: ' : '지금 전문가 설명: ') + (str(L.expert, 300) || '-') + (L.generic ? (en ? ' (generic for the tea type)' : ' (차 종류 일반 설명)') : ''),
        (en ? 'Current common points: ' : '지금 공통점: ') + (list(L.common, 6, 20).join(', ') || '-'),
        '',
        en ? `Return JSON:
- expert: ${L.generic ? 'a 1–2 sentence expert-style description of THIS specific tea (under 110 chars). If you do not know this tea, return an empty string.' : 'return an empty string (keep the current one).'}
- common: flavors both the user and the expert mention. Choose ONLY from this list: ${labels.join(', ')}. 0–4 items.
- diff: 1–2 short sentences (under 60 chars each) about what only the user noticed or only the expert mentions.
- ai: a warm 1–2 sentence reading (under 120 chars) of how the user's senses relate to the description.
- mine: one tidy line (under 90 chars) of the user's notes about how the tea looks, smells and tastes, joined with commas in their own words. Drop fillers (uh, um, like…), small talk and words the speech recognition obviously misheard. Never add impressions they didn't give. e.g. "nutty, gentle aroma, a little sweet and bitter".
- own: 0–3 of the user's most personal, vivid phrases (images, memories, scenes — e.g. "like a forest path after rain"), taken from their expressions above; you may drop fillers but keep their words. Skip plain flavor words like "grassy" or "sweet".`
          : `JSON으로 답해:
- expert: ${L.generic ? '이 차(이름 기준)에 대한 전문가식 설명 1~2문장, 90자 이내. 이 차를 잘 모르면 빈 문자열.' : '빈 문자열 (지금 설명을 그대로 쓴다).'}
- common: 사용자와 전문가가 함께 짚은 풍미. 반드시 이 목록에서만 골라: ${labels.join(', ')}. 0~4개.
- diff: 사용자만 느낀 것 또는 전문가만 말한 것, 짧은 문장 1~2개 (각 45자 이내, '~했어요' 체).
- ai: 내 감각과 설명이 어떻게 닿아 있는지 다정한 해석 1~2문장, 100자 이내.
- mine: 사용자가 남긴 차의 색·향·맛·느낌 표현을 정리한 한 줄 (70자 이내). 추임새(어, 음, 아, 그, 막, 그냥, 이제…), 잡담, 음성 인식이 잘못 들은 말(뜻이 안 통하는 말)은 빼고, 사용자의 말을 살려 쉼표로 이어. 말끝('~가 나', '~이 있고', '~해')은 '은은한 냄새', '달큰한 맛'처럼 짧은 표현으로 다듬고, 차와 상관없는 말(뜨거워, 맛있어 같은 단순 반응은 하나만 남겨도 돼)은 줄여. 사용자가 하지 않은 표현은 절대 지어내지 마. 예: '고소하고 은은한 냄새, 살짝 달큰한 맛, 비 오는 날 같은 느낌'.
- own: 사용자 표현 중 가장 그 사람다운 생생한 표현 0~3개 (장면·기억·비유, 예: '비 온 뒤 숲길 같은 향'). 위 사용자 표현에서 가져오되 추임새는 빼도 돼. 말 자체는 바꾸지 마. '풀향', '단맛'처럼 흔한 풍미 단어만 있는 건 빼.`,
      ].join('\n');
    },
    schema: {
      type: 'OBJECT',
      properties: {
        expert: { type: 'STRING' },
        common: { type: 'ARRAY', items: { type: 'STRING' } },
        diff: { type: 'ARRAY', items: { type: 'STRING' } },
        ai: { type: 'STRING' },
        own: { type: 'ARRAY', items: { type: 'STRING' } },
        mine: { type: 'STRING' },
      },
      required: ['common', 'diff', 'ai'],
    },
    clean: (j, b) => {
      if (!j) return null;
      const labels = new Set(list(b.labels, 11, 20));
      const outp = {
        common: list(j.common, 4, 20).filter(x => !labels.size || labels.has(x)),
        diff: list(j.diff, 2, 80),
        ai: str(j.ai, 200),
      };
      const ex = str(j.expert, 200);
      if (ex && b.local && b.local.generic) outp.expert = ex;
      // 사용자가 실제로 한 말에서 온 것만 남긴다: 추임새를 뺀 정도는 괜찮지만, 두 글자 묶음 대부분이 사용자 말에 있어야 한다 (지어낸 표현은 버림)
      const said = list(b.expressions, 20, 120).join(' / ').replace(/\s+/g, '');
      const bg = new Set(); for (let i = 0; i < said.length - 1; i++) bg.add(said.slice(i, i + 2));
      const fromUser = (x, need) => { const n = x.replace(/[\s,.·'"‘’“”]/g, ''); if (n.length < 2) return false; let hit = 0; for (let i = 0; i < n.length - 1; i++) if (bg.has(n.slice(i, i + 2))) hit++; return hit / Math.max(1, n.length - 1) >= need; };
      outp.own = list(j.own, 3, 40).map(x => x.replace(/^[‘'"“]+|[’'"”.!?]+$/g, '').trim()).filter(x => x.length >= 3 && fromUser(x, 0.8));
      const mine = str(j.mine, 160).replace(/^[‘'"“]+|[’'"”]+$/g, '');
      if (mine && fromUser(mine, 0.6)) outp.mine = mine;
      if (!outp.ai) return null;
      if (!outp.diff.length) delete outp.diff;
      return outp;
    },
  },

  recommend: {
    maxTokens: 600,
    system: en => VOICE(en) + (en
      ? ' Recommend real, widely available teas the user has not recorded yet, based on the flavors they liked.'
      : ' 사용자가 좋아한 풍미를 바탕으로, 아직 기록하지 않은 실제로 구하기 쉬운 차를 추천해.'),
    prompt: (b, en) => [
      (en ? 'Liked flavors: ' : '좋아한 풍미: ') + (list(b.flavors, 11, 20).join(', ') || '-'),
      (en ? 'Already recorded: ' : '이미 기록한 차: ') + (list(b.recorded, 40, 40).join(', ') || '-'),
      en ? `Return 3 teas. name: common tea name in English. type: one of ${TEA_TYPES.join(', ')}. flavors: 1–3 from ${FLAVOR_EN.join(', ')}. why: one short sentence (under 40 chars).`
         : `차 3개를 골라. name: 한국어로 흔히 부르는 차 이름. type: ${TEA_TYPES.join(', ')} 중 하나. flavors: ${FLAVOR_EN.join(', ')} 중 1~3개 (영어 그대로). why: 짧은 한 문장 (25자 이내).`,
    ].join('\n'),
    schema: {
      type: 'OBJECT',
      properties: {
        teas: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' }, type: { type: 'STRING' }, flavors: { type: 'ARRAY', items: { type: 'STRING' } }, why: { type: 'STRING' } },
            required: ['name', 'type', 'flavors', 'why'],
          },
        },
      },
      required: ['teas'],
    },
    clean: (j, b) => {
      const had = new Set(list(b.recorded, 40, 40).map(s => s.replace(/\s/g, '')));
      const teas = (Array.isArray(j && j.teas) ? j.teas : []).map(t => ({
        name: str(t && t.name, 30),
        type: TEA_TYPES.includes(t && t.type) ? t.type : 'green',
        flavors: list(t && t.flavors, 3, 20).filter(f => FLAVOR_EN.includes(f)),
        why: str(t && t.why, 60),
      })).filter(t => t.name && t.flavors.length && !had.has(t.name.replace(/\s/g, ''))).slice(0, 3);
      return teas.length ? { teas } : null;
    },
  },
};
