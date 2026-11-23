// AI가 이끄는 대화 확인 (가짜 AI): 차 찾기 → 우림 → 잡담 → 색(위젯)·향·맛을 대화로 → 자유 대화 → 다 마심 → 여운 → 한 가지 더 → 기록 정리
// AI가 실패하면 예전 정해진 흐름으로 이어가고 위에 알리는지도 본다.  사용법: node tests/ai-chat.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
const KW={color:/색/,aroma:/향/,taste:/맛/,after:/여운|남아/};
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let down=false; const seen=[];
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; },EP);
  await p.route(EP,async r=>{ const q=JSON.parse(r.request().postData()||'{}'); seen.push(q); const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});
    if(down) return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'upstream',detail:'gemini-3.5-flash-lite 429 RESOURCE_EXHAUSTED'})});
    if(q.mode==='identify') return J(/달빛/.test(q.text)?{found:true,name:'달빛 걷기',brand:'오설록',type:'green',about:'녹차에 배와 별사탕 향을 더한 블렌드예요.'}:{found:false});
    if(q.mode==='chat') return J({reply:`(AI:${q.event}) 반가워요`,finish:false});
    if(q.mode==='flow'){ if(q.event!=='message') return J({reply:`(AI:${q.event}) want=${q.want}`,fill:{}});
      const m=q.message||'', w=q.want, fill={}; let sense=/향|맛|색|고소/.test(m);
      if(w==='extra') fill.extra=m; else if(w&&KW[w]&&KW[w].test(m)) fill[w]=m;
      if(/피곤/.test(m)) fill.mood='피곤함';
      return J({reply:`(AI:${w||'-'}→${q.next}) ${m}`.slice(0,90),fill,sense,finish:/다 마셨/.test(m),end:w==='extra'}); }
    return r.fulfill({status:404,body:'{}'}); });
  await p.goto(FILE); await p.waitForTimeout(600);
  const say=async t=>{ await p.fill('#chatIn',t); await p.evaluate(()=>sendInput()); await p.waitForTimeout(1100); };
  const st=()=>p.evaluate(()=>S.draft&&S.draft.stage), last=()=>p.evaluate(()=>S.draft.chat[S.draft.chat.length-1]);
  await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); let m=await last();
  ok(/찾아봤어요/.test(m.text)&&await p.evaluate(()=>S.draft.type==='green'&&S.draft.aiFlow),'차 찾기 → AI가 찾고, 대화는 AI가 이끄는 방식으로 시작');
  await p.click('#msgs .chip >> text=맞아요'); await p.waitForTimeout(1200); await p.click('#msgs .chip >> text=우림 시작'); await p.waitForTimeout(2400);
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.ai&&/brew_start/.test(m.text))),'우림 시작 → AI가 대화를 연다');
  await say('오늘 회사에서 너무 피곤했어'); m=await last();
  ok(m.ai&&/피곤/.test(m.text)&&await p.evaluate(()=>S.draft.talk&&S.draft.talk.mood==='피곤함'&&S.draft.chat.find(x=>/피곤했어/.test(x.text)).ans==='talk'),'잡담에 대답 + 기분은 그날의 이야기로, 찻방울 표현에선 뺌');
  await p.evaluate(()=>finishTimer()); await p.waitForTimeout(2600);
  m=await last(); ok((await st())==='color'&&/color_ready/.test(m.text)&&m.ask==='color','다 우러남 → AI가 색을 묻고 색 위젯이 뜸');
  ok(await p.evaluate(()=>!!document.querySelector('#askW')),'색 위젯 보임');
  await p.evaluate(()=>answerColor()); await p.waitForTimeout(1200);
  m=await last(); ok((await st())==='aroma'&&m.ask==='aroma'&&/color→aroma/.test(m.text)&&await p.evaluate(()=>!!S.draft.feel.colorHex),'위젯으로 고른 색 → AI가 반응하고 향으로');
  await say('음 근데 이 차 어디서 만들어?'); m=await last(); ok((await st())==='aroma'&&m.ask==='aroma'&&/어디서/.test(m.text),'다른 이야기를 하면 그 말에 대답하고 향은 그대로 기다림');
  await say('비 온 뒤 숲길 같은 풀 향'); ok((await st())==='taste'&&await p.evaluate(()=>S.draft.feel.aroma==='비 온 뒤 숲길 같은 풀 향'),'말로 한 향 → 기록되고 맛으로');
  await say('끝에 꿀 같은 단맛'); ok((await st())==='free'&&await p.evaluate(()=>S.draft.feel.taste==='끝에 꿀 같은 단맛'&&!!S.draft.drinkAt),'맛 → 기록되고 자유롭게 마시기로');
  await say('마실수록 고소해지네'); ok(await p.evaluate(()=>S.draft.chat.some(x=>x.who==='me'&&!x.ans&&/고소/.test(x.text))),'자유 대화의 맛 표현은 찻방울에 담김');
  await say('다 마셨어요'); await p.waitForTimeout(400); m=await last(); ok((await st())==='after'&&/wrap/.test(m.text),'다 마셨다고 하면 AI가 마무리하며 여운을 물음');
  await say('끝에 단맛이 오래 남아요'); m=await last(); ok((await st())==='more'&&/after→extra/.test(m.text),'여운 → AI가 덧붙일 것 하나를 물음');
  await say('두 번 우렸어요'); await p.waitForTimeout(3200);
  ok(await p.evaluate(()=>cur()!=='chat'&&/두 번/.test(S.draft.deep.memo||'')),'대답하면 AI가 인사하고 기록 정리로 (덧붙인 말은 메모에)');
  ok(seen.filter(q=>q.mode==='flow'&&q.event==='message').every(q=>'want' in q&&'next' in q&&'filled' in q),'AI에게 매번 단계·기록할 것·이미 기록한 것을 보냄');
  // 대화 도중 AI가 멈추면 → 그 자리부터 예전 흐름
  await p.evaluate(()=>localStorage.clear()); await p.goto(FILE); await p.waitForTimeout(600); await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); await p.click('#msgs .chip >> text=맞아요'); await p.waitForTimeout(1200); await p.click('#msgs .chip >> text=바로 마실게요'); await p.waitForTimeout(2600);
  ok((await st())==='color','바로 마시기 → AI가 색부터 물음');
  down=true; await say('연한 연두색'); await p.waitForTimeout(800);
  m=await last(); ok(['aroma','wait2'].includes(await st())&&!m.ai&&await p.evaluate(()=>S.draft.feel.color==='연한 연두색'&&!S.draft.aiFlow),'도중에 AI 실패 → 내 대답은 그대로 기록되고 정해진 다음 질문으로');
  down=false;
  // AI 실패 → 예전 흐름
  down=true; await p.evaluate(()=>localStorage.clear()); await p.goto(FILE); await p.waitForTimeout(600); await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); await p.waitForTimeout(800); m=await last(); ok(/처음 보는 차/.test(m.text),'AI 실패 → 예전처럼 종류를 물어봄');
  const tt=await p.evaluate(()=>{ const e=document.querySelector('#toast'); return e.classList.contains('show')?e.textContent:''; });
  ok(/AI 대화를 다 써서/.test(tt),'위에 이유 알림: '+tt.replace(/\n/,' '));
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
