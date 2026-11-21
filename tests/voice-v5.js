// 음성 대화 확인: 한 번 누르면 처음(차 이름)부터 정리까지 말로만 이어지는지 (마이크가 없는 환경 → 시연용 목소리)
// 사용법: node tests/voice-v5.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v5.html');
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window.TC_VOICE_FAST=true; delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  await p.goto(FILE); await p.waitForTimeout(700);
  await p.evaluate(()=>{ startRecord(); setMode('voice'); }); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>/대화 시작/.test(document.querySelector('#vBtn').textContent)),'음성 탭: 눌러서 대화 시작');
  await p.click('#vBtn');
  const reach=async(cond,ms,msg)=>{ const r=await p.waitForFunction(cond,null,{timeout:ms}).then(()=>true).catch(()=>false); ok(r,msg); };
  await reach(()=>S.draft.name==='제주 세작',20000,'말로 차 이름 → 알아들음');
  await reach(()=>!!S.timer,20000,'"네 맞아요" → "우림 시작할게요" → 타이머');
  await reach(()=>S.draft.talk&&S.draft.talk.mood,40000,'우리는 동안 이야기에 말로 대답');
  await reach(()=>S.draft.feel.color&&S.draft.feel.colorHex,40000,'찻물 색도 말로 → 색 점까지');
  await reach(()=>S.draft.feel.aroma&&S.draft.feel.taste,40000,'첫 향 · 첫 맛도 말로');
  await reach(()=>['more','deep','after'].includes(S.draft.stage)||cur()!=='chat',40000,'"이제 충분해요" → 정리 메뉴');
  await reach(()=>cur()==='organizing'||cur()==='analyzing'||cur()==='compare',40000,'"이제 정리할게요" → 분석으로');
  ok(await p.evaluate(()=>!VOICE.on),'화면을 떠나면 음성 대화가 멈춤');
  const ex=await p.evaluate(()=>collectExprs(S.draft).map(e=>e.text+'>'+e.fl.join('/')).join(' | ')); console.log('  분석된 표현:',ex);
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
