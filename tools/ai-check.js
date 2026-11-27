// 예시 4종 AI 대화 점검: 실제 AI 서버에 연결해, 예시 말풍선만 눌러 기록을 끝까지 진행하고 풍미가 몇 개 나오는지 표로 정리한다
// node tools/ai-check.js            AI 대화로 4종 (실제 서버 호출, 1종에 1분 안팎)
// node tools/ai-check.js --auto     자동 대화(AI 없이)로 4종 — 비교용
// node tools/ai-check.js --only 현미  이름에 '현미'가 든 예시만
// node tools/ai-check.js --times 3  각 예시를 3번씩 (AI 답이 매번 달라 풍미가 흔들리는지 보기)
// 결과: 화면에 표 + tests/out/ai-check.md
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html');
const EP='https://teacanvas-ai.sehoon3554.workers.dev/';
const ONLY=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1]:'', AUTO=process.argv.includes('--auto'), TIMES=+(process.argv[process.argv.indexOf('--times')+1])||1;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ const b=await chromium.launch(), rows=[], errs=[];
  const names=await (async()=>{ const p=await b.newPage(); await p.goto(FILE); const n=await p.evaluate(()=>SUG.sets.map(x=>x.name)); await p.close(); return n; })();
  for(let set=0;set<names.length;set++) for(let run=1;run<=TIMES;run++){ if(ONLY&&!names[set].includes(ONLY)) continue;
    const c=await b.newContext({viewport:{width:1080,height:1920}});
    await c.addInitScript(([ep,auto])=>{ window.TC_AI_ENDPOINT=auto?'':ep; },[EP,AUTO]);
    if(AUTO) await c.route(/workers\.dev/,r=>r.abort());
    const p=await c.newPage(); p.on('pageerror',x=>errs.push(x.message));
    await p.goto(FILE); await wait(800);
    await p.evaluate(([s,auto])=>{ PREF.chatAI=auto?'auto':'ai'; startRecord(true); S.draft.sugSet=s; },[set,AUTO]); await wait(2500);
    const steps=[]; const t0=Date.now(); let stuck=0, name='';
    for(let k=0;k<80&&Date.now()-t0<180000;k++){
      const st=await p.evaluate(()=>({cur:cur(),stage:S.draft&&S.draft.stage,typing:S.typing||!!document.querySelector('.ai-busy,.typing'),sug:[...document.querySelectorAll('.sugb')].map(x=>x.textContent),end:document.querySelector('#chatEnd .btn:not(.off)')?.textContent||'',name:S.draft&&S.draft.name}));
      if(st.name) name=st.name;
      if(st.cur!=='chat') break;
      if(st.typing){ await wait(500); continue; }
      if(/기록 마치고/.test(st.end)){ await p.click('#chatEnd .btn'); steps.push('[정리]'); await wait(1500); continue; }
      if(st.sug.length){ stuck=0; await p.click('.sugb'); steps.push(st.sug[0]); await wait(1500); continue; }
      if(++stuck>12){ steps.push('!!막힘('+st.stage+')'); break; } await wait(700); }
    const r=await p.evaluate(()=>{ const d=S.draft; if(!d) return {said:[],fl:[],by:'-',ai:0,last:''}; ensureFlavors(d);
      const lab=a=>(a||[]).map(k=>FLAVORS[k]?FLAVORS[k].label:k).join('·')||'-';
      const said=(d.chat||[]).filter(m=>m.who==='me').map(m=>`${m.text} [${lab(Array.isArray(m.fl)?m.fl:(d.flMap||{})[m.text])}]`);
      return {said, fl:d.flavors.map(f=>FLAVORS[f.k].label), by:d.by||'-', ai:(d.chat||[]).filter(m=>m.ai).length, lost:!!d.aiLost, brand:d.brand||''}; });
    const row={tea:name, brand:r.brand, run, n:r.fl.length, fl:r.fl.join('·')||'(없음)', mode:AUTO?'자동':(r.ai?`AI(${r.ai}번 답)`:'AI 실패→자동')+(r.lost?' · 중간에 끊김':''), taps:steps.length, done:steps.includes('[정리]'), steps:steps.join(' → '), said:r.said};
    rows.push(row); console.log(`${row.brand} ${row.tea}${TIMES>1?' #'+run:''}: 풍미 ${row.n}개 (${row.fl}) · ${row.mode} · ${row.taps}번 누름${row.done?'':' · 끝까지 못 감'}`);
    await c.close(); }
  await b.close();
  const md=[`# 예시 ${AUTO?'자동':'AI'} 대화 점검 (${new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})})`,'',
    '| 예시 | 풍미 수 | 풍미 | 대화 | 누른 횟수 | 끝까지 |','|---|---|---|---|---|---|',
    ...rows.map(x=>`| ${x.brand} ${x.tea}${TIMES>1?' #'+x.run:''} | ${x.n} | ${x.fl} | ${x.mode} | ${x.taps} | ${x.done?'✅':'❌'} |`),'',
    '## 말마다 잡힌 풍미','',...rows.map(x=>`- **${x.brand} ${x.tea}${TIMES>1?' #'+x.run:''}**\n${x.said.map(t=>'  - '+t).join('\n')}`),
    ...(errs.length?['','## 화면 오류','',...[...new Set(errs)].map(e=>'- '+e)]:[])].join('\n');
  fs.mkdirSync(path.join(__dirname,'..','tests/out'),{recursive:true}); fs.writeFileSync(path.join(__dirname,'..','tests/out/ai-check.md'),md);
  console.log('\n'+md.split('\n## 말마다')[0]+'\n→ tests/out/ai-check.md'); })();
