/* TEA CANVAS AI 중간 서버 (Cloudflare Worker)
   앱 → 이 서버 → Gemini API. API 키는 이 서버의 비밀값(GEMINI_API_KEY)에만 둔다.

   필요한 설정 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets)
   - GEMINI_API_KEY  (Secret)  Google AI Studio에서 만든 키
   - GEMINI_MODEL    (선택)    먼저 쓸 모델 (쉼표로 여러 개). 없으면 FALLBACK_MODELS 순서대로
   - ALLOWED_ORIGINS (선택)    쉼표로 구분. 기본값은 아래 DEFAULT_ORIGINS

   앱이 보내는 것 (POST JSON)
   - mode: 'question' | 'compare' | 'recommend'
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
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
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
  : '너는 차를 마시며 맛과 향을 기록하는 앱 TEA CANVAS의 안내자야. 말투는 차분하고 가볍고 다정한 해요체, 쉬운 일상어, 짧은 문장. 가르치려 하지 마. 마크다운·이모지·목록 금지.';

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
- ai: a warm 1–2 sentence reading (under 120 chars) of how the user's senses relate to the description.`
          : `JSON으로 답해:
- expert: ${L.generic ? '이 차(이름 기준)에 대한 전문가식 설명 1~2문장, 90자 이내. 이 차를 잘 모르면 빈 문자열.' : '빈 문자열 (지금 설명을 그대로 쓴다).'}
- common: 사용자와 전문가가 함께 짚은 풍미. 반드시 이 목록에서만 골라: ${labels.join(', ')}. 0~4개.
- diff: 사용자만 느낀 것 또는 전문가만 말한 것, 짧은 문장 1~2개 (각 45자 이내, '~했어요' 체).
- ai: 내 감각과 설명이 어떻게 닿아 있는지 다정한 해석 1~2문장, 100자 이내.`,
      ].join('\n');
    },
    schema: {
      type: 'OBJECT',
      properties: {
        expert: { type: 'STRING' },
        common: { type: 'ARRAY', items: { type: 'STRING' } },
        diff: { type: 'ARRAY', items: { type: 'STRING' } },
        ai: { type: 'STRING' },
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
