// 사용자 시뮬레이터: 실제 AI 서버로 앱을 띄워 두고, HTTP로 말하고·누르고·화면을 읽는다 (서브에이전트가 사용자처럼 써 보는 용도)
// 사용법: node tools/sim.js 포트  →  curl "http://localhost:포트/state" 등
//   /state                 지금 화면 (단계, 최근 대화, 버튼, 색 슬라이더, 알림, 기록 상태)
//   /say?t=말              입력칸에 적고 보내기 → AI 대답까지 기다렸다가 화면을 돌려준다
//   /tap?label=글자        화면의 버튼·칩 중 그 글자가 들어간 것을 누른다
//   /slider?h=0~1&v=0~1    색 슬라이더를 움직인다 (h: 색 계열, v: 진하기)
//   /wait?sec=초           우림 타이머를 그만큼 앞당기고 앱이 반응할 때까지 기다린다
//   /canvas?x=0~1&y=0~1    캔버스 찍기 화면에서 그 자리를 누른다 (x 오른쪽=향 좋음, y 위=맛 좋음; y는 0이 위)
//   /screen                지금 화면 전체 글자 (비교 화면 등)
//   /shot                  스크린샷 저장 경로
const http = require('http'), path = require('path'), { chromium, devices } = require('playwright');
const PORT = +process.argv[2] || 9301, FILE = 'file://' + path.join(__dirname, '..', 'TEA_CANVAS_prototype_v6.html');
const EP = process.env.TC_EP || 'https://teacanvas-ai.sehoon3554.workers.dev/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(ep => { window.TC_AI_ENDPOINT = ep; }, EP);
  await p.goto(FILE); await p.waitForTimeout(800);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { PREF.chatAI = 'ai'; startRecord(); }); await p.waitForTimeout(600);
  const state = () => p.evaluate(() => {
    const d = S.draft, vis = el => el && el.offsetParent !== null;
    const btns = [...document.querySelectorAll('#msgs button, #chatEnd button, #askW button, #sheetWrap.open button, .page button.btn, .page .chip')].filter(vis).map(x => x.textContent.trim()).filter(Boolean);
    const sl = document.querySelector('#askW.tc');
    const t = document.querySelector('#toast');
    return {
      screen: cur(), stage: d && d.stage, badge: (document.querySelector('#aiBadge') || {}).textContent || '',
      tea: d ? { name: d.name, brand: d.brand, type: d.type } : null,
      recorded: d ? { color: d.feel && d.feel.color, colorHex: d.feel && d.feel.colorHex, aroma: d.feel && d.feel.aroma, taste: d.feel && d.feel.taste, after: d.afterText, talk: d.talk, memo: d.deep && d.deep.memo } : null,
      timer: S.timer ? { left: S.timer.left, running: S.timer.running } : null,
      thinking: !!S.typing,
      chat: d ? d.chat.slice(-10).map(m => ({ who: m.who, text: m.text || (m.guide ? '[우림 가이드 카드]' : m.img ? '[사진]' : ''), ...(m.ask ? { ask: m.ask } : {}) })) : [],
      buttons: [...new Set(btns)].slice(0, 20),
      colorSlider: vis(sl) ? (sl.querySelector('.tc-cup b') || {}).textContent : null,
      toast: t && t.classList.contains('show') ? t.textContent : '',
      inputPlaceholder: (document.querySelector('#chatIn') || {}).placeholder || null,
    };
  });
  const settle = async (ms = 25000) => { const t0 = Date.now(); await p.waitForTimeout(400); while (Date.now() - t0 < ms) { const busy = await p.evaluate(() => !!S.typing); if (!busy) break; await p.waitForTimeout(300); } await p.waitForTimeout(700); };
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), q = k => u.searchParams.get(k);
    const send = async (o) => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ ...o, ...(errs.length ? { pageErrors: errs.splice(0) } : {}) }, null, 1)); };
    try {
      if (u.pathname === '/state') return send(await state());
      if (u.pathname === '/say') { const inp = await p.$('#chatIn'); if (!inp) return send({ error: '입력칸이 없어요', ...(await state()) }); await p.fill('#chatIn', q('t') || ''); await p.evaluate(() => sendInput()); await settle(); return send(await state()); }
      if (u.pathname === '/tap') { const label = q('label') || ''; const ok = await p.evaluate(l => { const vis = el => el && el.offsetParent !== null; const all = [...document.querySelectorAll('button, .chip, [onclick]')].filter(vis); const el = all.reverse().find(x => x.textContent.trim().includes(l)); if (!el) return false; el.click(); return true; }, label); await settle(); return send({ tapped: ok, ...(await state()) }); }
      if (u.pathname === '/slider') { await p.evaluate(([h, v]) => { S.ask = S.ask || { sel: [] }; S.ask.hd = [h, v]; paintMsgs(); }, [+q('h'), +q('v')]); await p.waitForTimeout(300); return send(await state()); }
      if (u.pathname === '/wait') { await p.evaluate(s => { if (S.timer && S.timer.left > 0) S.timer.left = Math.max(1, S.timer.left - s); }, +q('sec') || 60); await p.waitForTimeout(2500); await settle(); return send(await state()); }
      if (u.pathname === '/canvas') { const ok = await p.evaluate(([x, y]) => { const c = document.querySelector('#sheetWrap.open canvas'); if (!c) return false; const r = c.getBoundingClientRect(); const ev = (t) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + x * r.width, clientY: r.top + y * r.height, pointerId: 1 })); ev('pointerdown'); setTimeout(() => ev('pointerup'), 600); return true; }, [+q('x'), +q('y')]); await p.waitForTimeout(1200); return send({ tapped: ok, ...(await state()) }); }
      if (u.pathname === '/screen') return send({ screen: await p.evaluate(() => cur()), text: (await p.evaluate(() => (document.querySelector('#view') || document.body).innerText)).slice(0, 3000) });
      if (u.pathname === '/shot') { const f = path.join(require('os').tmpdir(), `sim-${PORT}-${Date.now()}.png`); await p.screenshot({ path: f }); return send({ file: f }); }
      send({ error: 'unknown' });
    } catch (e) { send({ error: String(e && e.message || e) }); }
  });
  srv.listen(PORT, () => console.log('sim ready on', PORT));
})();
