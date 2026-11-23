/* TEA CANVAS AI 중간 서버 (Cloudflare Worker)
   앱 → 이 서버 → Gemini API. API 키는 이 서버의 비밀값(GEMINI_API_KEY)에만 둔다.

   필요한 설정 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets)
   - GEMINI_API_KEY  (Secret)  Google AI Studio에서 만든 키
   - GEMINI_MODEL    (선택)    먼저 쓸 모델 (쉼표로 여러 개). 없으면 FALLBACK_MODELS 순서대로
   - ALLOWED_ORIGINS (선택)    쉼표로 구분. 기본값은 아래 DEFAULT_ORIGINS

   앱이 보내는 것 (POST JSON)
   - mode: 'chat' | 'identify' | 'question' | 'compare' | 'recommend' | 'speak'
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
const TEA_TYPES = ['green', 'white', 'oolong', 'black', 'dark', 'herb'];
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
        const wav = await speakGemini(env, body);
        return new Response(wav, { headers: { ...cors, 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' } });
      } catch (e) { return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); }
    }
    const tspec = TEXT_SPECS[body && body.mode];   // 대화·차 찾기: 필요하면 Google 검색까지 하는 글 응답
    if (tspec) {
      const en = body.lang === 'en';
      try {
        const text = await geminiText(env, tspec.system(en, body), tspec.prompt(body, en), { search: true, maxTokens: tspec.maxTokens, budgetMs: tspec.budgetMs });
        const clean = tspec.clean(text, body);
        return clean ? out(clean) : out({ error: 'empty' }, 502);
      } catch (e) { return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); }
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
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3-flash-preview'];
const NO_THINK_CFG = new Set();      // 생각 끄기 설정을 거절한 모델 (다음 요청부터 바로 설정 없이)
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
    const tries = NO_THINK_CFG.has(model) ? [base] : [{ ...base, generationConfig: { ...base.generationConfig, thinkingConfig: { thinkingBudget: 0 } } }, base];
    for (let i = 0; i < tries.length; i++) {
      const left = deadline - Date.now();
      if (left < 1200) throw new Error('timeout; last ' + last);
      let r;
      try {
        r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(tries[i]), signal: AbortSignal.timeout(left - 300) });
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
async function geminiText(env, system, prompt, { search, maxTokens, budgetMs }) {
  const deadline = Date.now() + budgetMs;
  const models = [...new Set([...(env.GEMINI_MODEL ? env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...FALLBACK_MODELS])];
  let last = 'no model';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const variants = [];
    for (const tools of (search ? [true, false] : [false])) for (const think of (NO_THINK_CFG.has(model) ? [false] : [true, false])) variants.push({ tools, think });
    let tried = 0;
    for (const v of variants) {
      const left = deadline - Date.now();
      if (left < 1200) throw new Error('timeout; last ' + last);
      const gc = { maxOutputTokens: maxTokens, temperature: 0.7 };
      if (v.think) gc.thinkingConfig = { thinkingBudget: 0 };
      const payload = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc };
      if (v.tools) payload.tools = [{ google_search: {} }];
      let r;
      try {
        r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(payload), signal: AbortSignal.timeout(left - 300) });
      } catch (e) { last = `${model} timeout`; break; }
      tried++;
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
        if (text) return text;
        last = `${model} empty`; break;
      }
      last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`;
      if (r.status === 400 && v.think) { NO_THINK_CFG.add(model); continue; }   // 생각 끄기 설정 문제 → 설정 빼고
      if ((r.status === 400 || r.status === 429) && v.tools) continue;          // 검색 문제·검색 한도 → 검색 없이
      if (r.status === 401 || r.status === 403) throw new Error(last);
      break;                                                                    // 붐빔(503) 등 → 다음 모델
    }
  }
  throw new Error(last);
}
const plain = t => String(t || '').replace(/\*\*|__|[#*`>]/g, '').replace(/\[(\d+(,\s*\d+)*)\]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const STAGE_KO = { tea: '차 이름을 정하는 중', teaOK: '차 종류를 확인하는 중', teaType: '차 종류를 고르는 중', guide: '우림 가이드를 보는 중', wait: '차가 우러나기를 기다리는 중', color: '찻물 색을 보는 중', wait2: '다 우러나기를 기다리는 중', aroma: '향을 맡아보는 중', taste: '맛을 보는 중', free: '차를 마시며 자유롭게 이야기하는 중', after: '다 마시고 여운을 보는 중', more: '기록을 마무리하는 중', deep: '기록을 마무리하는 중' };
const TEXT_SPECS = {
  chat: {
    maxTokens: 400, budgetMs: 11000,
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
  identify: {
    maxTokens: 500, budgetMs: 12000,
    system: en => 'You identify teas from what the user typed. For a specific product, search the web to find it. Reply with ONLY a JSON object, no other text.',
    prompt: (b, en) => `Tea the user typed: "${str(b.text, 80)}"${b.brand ? ` (brand: ${str(b.brand, 40)})` : ''}
Return JSON: {"found": true/false, "name": product name as commonly written${en ? '' : ' in Korean'}, "brand": brand or "", "type": one of ${TEA_TYPES.join('|')} (blends: by the base tea leaf; no tea leaf at all = herb), "about": ${en ? 'one short sentence (under 80 chars) on its base and main flavor notes' : '이 차의 바탕 찻잎과 주된 향·맛을 한 문장으로 (60자 이내, 해요체)'}}
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
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
async function speakGemini(env, b) {
  const text = str(b.text, 400);
  if (!text) throw new Error('no text');
  const voice = /^[A-Za-z]{2,20}$/.test(b.voice || '') ? b.voice : 'Sulafat';
  const en = b.lang === 'en';
  const style = str(b.style, 120) || (en ? 'Read this in a calm, gentle, warm voice, at a relaxed pace, like a friend sitting with you over tea' : '차 한 잔 앞에 함께 앉은 친구처럼, 차분하고 다정한 목소리로 천천히 읽어줘');
  const deadline = Date.now() + 12000;
  const models = [...new Set([...(env.GEMINI_TTS_MODEL ? env.GEMINI_TTS_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...TTS_MODELS])];
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
          contents: [{ role: 'user', parts: [{ text: `${style}:\n${text}` }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
      });
    } catch (e) { last = `${model} timeout`; continue; }
    if (!r.ok) { last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`; if (r.status === 401 || r.status === 403) break; continue; }
    const j = await r.json();
    const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData && p.inlineData.data);
    if (!part) { last = `${model} no audio`; continue; }
    const rate = +((part.inlineData.mimeType || '').match(/rate=(\d+)/) || [])[1] || 24000;
    return pcmToWav(b64ToBytes(part.inlineData.data), rate);
  }
  throw new Error(last);
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
- own: 0–3 of the user's most personal, vivid phrases (images, memories, scenes — e.g. "like a forest path after rain"), copied EXACTLY as a contiguous part of their expressions above. Skip plain flavor words like "grassy" or "sweet".`
          : `JSON으로 답해:
- expert: ${L.generic ? '이 차(이름 기준)에 대한 전문가식 설명 1~2문장, 90자 이내. 이 차를 잘 모르면 빈 문자열.' : '빈 문자열 (지금 설명을 그대로 쓴다).'}
- common: 사용자와 전문가가 함께 짚은 풍미. 반드시 이 목록에서만 골라: ${labels.join(', ')}. 0~4개.
- diff: 사용자만 느낀 것 또는 전문가만 말한 것, 짧은 문장 1~2개 (각 45자 이내, '~했어요' 체).
- ai: 내 감각과 설명이 어떻게 닿아 있는지 다정한 해석 1~2문장, 100자 이내.
- own: 사용자 표현 중 가장 그 사람다운 생생한 표현 0~3개 (장면·기억·비유, 예: '비 온 뒤 숲길 같은 향'). 위 사용자 표현의 일부를 글자 그대로 잘라서 써. '풀향', '단맛'처럼 흔한 풍미 단어만 있는 건 빼.`,
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
      const said = list(b.expressions, 20, 120).join(' / ').replace(/\s+/g, '');   // 사용자가 실제로 한 말 안에 있는 것만
      outp.own = list(j.own, 3, 40).map(x => x.replace(/^[‘'"“]+|[’'"”.!?]+$/g, '').trim()).filter(x => x.length >= 3 && said.includes(x.replace(/\s+/g, '')));
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
