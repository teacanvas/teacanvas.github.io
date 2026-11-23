// AI 대화 확인: 처음 보는 차 찾기 → 우림 시작 인사 → 색·향·맛 대답에 반응 → 자유 대화에 대답 → '다 마셨어요'로 마무리
// AI가 실패하면 예전 정해진 대화로 돌아가는지도 본다.  사용법: node tests/ai-chat.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let down=false; const seen=[];
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; },EP);
  await p.route(EP,async r=>{ const q=JSON.parse(r.request().postData()||'{}'); seen.push(q.mode+(q.event?':'+q.event:'')); if(down) return r.fulfill({status:502,body:'{}'});
    if(q.mode==='identify') return r.fulfill({contentType:'application/json',body:JSON.stringify(/달빛/.test(q.text)?{found:true,name:'달빛 걷기',brand:'오설록',type:'green',about:'녹차에 배와 별사탕 향을 더한 블렌드예요.'}:{found:false})});
    if(q.mode==='chat'){ const fin=/다 마셨/.test(q.message||''); return r.fulfill({contentType:'application/json',body:JSON.stringify({reply:`(AI:${q.event}) ${q.message||''}`.slice(0,80),finish:fin})}); }
    return r.fulfill({status:404,body:'{}'}); });
  await p.goto(FILE); await p.waitForTimeout(600);
  const say=async t=>{ await p.fill('#chatIn',t); await p.evaluate(()=>sendInput()); await p.waitForTimeout(1300); };
  const last=()=>p.evaluate(()=>S.draft.chat[S.draft.chat.length-1]);
  await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); let m=await last();
  ok(/찾아봤어요/.test(m.text)&&/배와 별사탕/.test(m.text)&&await p.evaluate(()=>S.draft.type==='green'&&S.draft.stage==='teaOK'),'처음 보는 차 → AI가 찾아 종류·설명까지');
  await p.click('#msgs .chip >> text=맞아요'); await p.waitForTimeout(1200);
  await p.click('#msgs .chip >> text=우림 시작'); await p.waitForTimeout(2600);
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.ai&&/brew_start/.test(m.text))),'우림 시작 → AI가 대화를 연다');
  await say('오늘 회사에서 너무 피곤했어'); m=await last(); ok(m.ai&&/피곤/.test(m.text),'우리는 동안 내 이야기에 대답');
  await say('이 차는 왜 달콤한 향이 나?'); m=await last(); ok(m.ai&&/달콤/.test(m.text),'차에 대한 질문에 AI가 대답');
  await p.evaluate(()=>finishTimer()); await p.waitForTimeout(2500);
  const st=await p.evaluate(()=>S.draft.stage); if(st==='color') { await p.evaluate(()=>answerColor('연한 연두색')); await p.waitForTimeout(1500); }
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.ai&&/answered:color/.test(m.text))),'색 대답에 AI가 한마디 반응 → 다음 질문');
  for(let i=0;i<4&&await p.evaluate(()=>['wait2','aroma','taste'].includes(S.draft.stage));i++){ const s2=await p.evaluate(()=>S.draft.stage); if(s2==='wait2'){ await p.evaluate(()=>finishTimer()); await p.waitForTimeout(2200); continue; } await say(s2==='aroma'?'비 온 뒤 숲길 같은 풀 향':'끝에 꿀 같은 단맛'); }
  ok(await p.evaluate(()=>S.draft.stage==='free'),'향·맛까지 지나 자유 대화로');
  await say('마실수록 고소해지네'); m=await last(); ok(m.ai&&await p.evaluate(()=>S.draft.chat.some(x=>x.who==='me'&&x.kept&&/고소/.test(x.text))),'자유 대화: AI 대답 + 내 표현은 찻방울에 담김');
  await say('다 마셨어요'); await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>['after','more'].includes(S.draft.stage)&&!S.draft.chat.some(m=>m.text==='이제 충분해요')),'다 마셨다고 하면 AI가 마무리 → 기록 정리로');
  // AI 실패 → 정해진 대화
  down=true; await p.evaluate(()=>{ localStorage.clear(); }); await p.goto(FILE); await p.waitForTimeout(600); await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); await p.waitForTimeout(800); m=await last(); ok(/처음 보는 차/.test(m.text),'AI 실패 → 예전처럼 종류를 물어봄');
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
