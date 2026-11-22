// 음성 대화 확인: 한 번 누르면 처음(차 이름)부터 정리까지 말로만 이어지는지 (마이크가 없는 환경 → 시연용 목소리)
// 사용법: node tests/voice-v5.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v5.html');
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window.TC_VOICE_FAST=true; delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  await p.goto(FILE); await p.waitForTimeout(700);
  await p.evaluate(()=>{ startRecord(); }); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!document.querySelector('.seg')&&/말로 하기/.test(document.querySelector('#sendBtn').getAttribute('aria-label'))),'채팅·음성 탭 없이, 입력창이 비면 마이크 버튼');
  await p.fill('#chatIn','가'); await p.evaluate(()=>syncSend()); ok(await p.evaluate(()=>document.querySelector('#sendBtn').getAttribute('aria-label')==='보내기'),'글을 쓰면 보내기 버튼'); await p.fill('#chatIn',''); await p.evaluate(()=>syncSend());
  await p.click('#sendBtn'); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!document.querySelector('.chatfoot.voicing #vwash')),'마이크 → 아래에서 번지는 음성 패널');
  const reach=async(cond,ms,msg)=>{ const r=await p.waitForFunction(cond,null,{timeout:ms}).then(()=>true).catch(()=>false); ok(r,msg); };
  await reach(()=>S.draft.name==='제주 세작',20000,'말로 차 이름 → 알아들음');
  await reach(()=>!!S.timer,20000,'"네 맞아요" → "우림 시작할게요" → 타이머');
  await reach(()=>S.draft.talk&&S.draft.talk.mood,40000,'우리는 동안 이야기에 말로 대답');
  await reach(()=>S.draft.feel.color&&S.draft.feel.colorHex,40000,'찻물 색도 말로 → 색 점까지');
  await reach(()=>S.draft.feel.aroma&&S.draft.feel.taste,40000,'첫 향 · 첫 맛도 말로');
  await reach(()=>['more','deep','after'].includes(S.draft.stage)||cur()!=='chat',40000,'"이제 충분해요" → 정리 메뉴');
  await reach(()=>cur()==='organizing'||cur()==='analyzing'||cur()==='compare',40000,'"이제 정리할게요" → 분석으로');
  ok(await p.evaluate(()=>!VOICE.on),'화면을 떠나면 음성 대화가 멈춤');
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.who==='me'&&m.voice)),'말로 한 대답에 음성 표시');
  ok(await p.evaluate(()=>VW.T>3),'대화 중엔 번짐이 움직임');
  ok(await p.evaluate(()=>S.draft.chat.filter(m=>m.who==='bot').length>=8&&S.draft.chat.filter(m=>m.voice).length>=4),'음성 중에도 채팅에 대화가 쌓임');
  const ex=await p.evaluate(()=>collectExprs(S.draft).map(e=>e.text+'>'+e.fl.join('/')).join(' | ')); console.log('  분석된 표현:',ex);
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
