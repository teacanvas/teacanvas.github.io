// 실시간 음성(Gemini Live) 확인: 가짜 Live 서버 + 가짜 마이크로
// 연결 → AI가 먼저 말함(소리·글자) → 내 말(글자) → AI가 기록 도구를 불러 차 이름·종류 → 맞다고 하면 가이드 → 우림 시작 → 타이머 끝나면 앱이 AI에게 알림 → 색·향 기록
// 연결이 안 되면 기본 음성 대화로. 사용법: node tests/live-voice.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
const pcm=ms=>{ const n=Math.round(24000*ms/1000), b=Buffer.alloc(n*2); for(let i=0;i<n;i++) b.writeInt16LE(Math.round(2000*Math.sin(i/7)),i*2); return b.toString('base64'); };
async function run(b,mode){
  const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const got=[]; let sock=null, audioIn=0;
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; window.TC_VOICE_FAST=1; },EP);
  await p.route(EP,r=>r.fulfill({status:502,contentType:'application/json',body:'{}'}));
  await p.routeWebSocket(/ai\.test\/live/,ws=>{ sock=ws; if(mode==='down'){ ws.send(JSON.stringify({appError:'upstream'})); ws.close(); return; }
    ws.onMessage(m=>{ const j=JSON.parse(m); if(j.realtimeInput) audioIn++; else got.push(j); });
    setTimeout(()=>{ ws.send(JSON.stringify({appInfo:{model:'fake',voice:'Zephyr'}})); ws.send(JSON.stringify({setupComplete:{}})); },100); });
  const say=o=>sock.send(JSON.stringify(o));
  await p.goto(FILE); await p.waitForTimeout(500); await p.evaluate(()=>startRecord()); await p.waitForTimeout(300);
  await p.evaluate(()=>toggleVoice()); await p.waitForTimeout(1200);
  if(mode==='down'){ ok(await p.evaluate(()=>VOICE.on&&!VOICE.live&&!LIVE.on),'실시간 음성이 안 되면 기본 음성 대화로'); ok(await p.evaluate(()=>S.draft.chat.some(m=>m.teaAsk)),'지웠던 첫인사는 되살림'); const t=await p.evaluate(()=>document.querySelector('#toast').textContent); ok(/연결이 안 돼서\n기본 음성 대화로/.test(t),'위에 알림: '+t.replace(/\n/,' ')); ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):'')); await p.close(); return; }
  ok(await p.evaluate(()=>LIVE.on&&VOICE.live),'실시간 음성 연결됨');
  ok(got.some(j=>j.clientContent&&/지금 단계: 차 이름 묻기/.test(j.clientContent.turns[0].parts[0].text)),'연결되면 지금까지의 상태를 알려주고 먼저 말을 걸게 함');
  ok(audioIn>0,`마이크 소리를 실시간으로 보냄 (${audioIn}조각)`);
  say({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:pcm(300)}}]},outputTranscription:{text:'반가워요. 오늘은 어떤 차를 마셔볼까요?'}}}); await p.waitForTimeout(150);
  ok(await p.evaluate(()=>VOICE.phase==='speaking'&&LIVE.sources.length>0),'AI 목소리를 바로 틈');
  say({serverContent:{turnComplete:true}}); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.live&&m.text==='반가워요. 오늘은 어떤 차를 마셔볼까요?')),'AI가 한 말이 채팅에 글자로 남음');
  ok(await p.evaluate(()=>S.draft.chat.filter(m=>/반가워요/.test(m.text||'')).length===1),'첫인사가 두 번 나오지 않음 (화면 인사 대신 AI가 소리로 인사)');
  say({serverContent:{inputTranscription:{text:'오설록 제주 세작 마실게요'}}}); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>VOICE.interim==='오설록 제주 세작 마실게요'),'내 말이 들리는 대로 화면에 보임');
  say({toolCall:{functionCalls:[{id:'1',name:'update_record',args:{name:'제주 세작',brand:'오설록',type:'green',about:'싱그러운 녹차'}}]}}); await p.waitForTimeout(200);
  let tr=got.filter(j=>j.toolResponse).pop(); ok(tr&&tr.toolResponse.functionResponses[0].response.want==='teatype'&&await p.evaluate(()=>S.draft.name==='제주 세작'&&S.draft.stage==='teaOK'),'AI가 기록 도구로 차 이름·종류를 채우고, 앱이 다음 할 일을 알려줌');
  say({serverContent:{outputTranscription:{text:'녹차로 기록할까요?'},turnComplete:true}}); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.who==='me'&&m.text==='오설록 제주 세작 마실게요'&&m.voice)),'내 말도 채팅에 남음');
  say({serverContent:{inputTranscription:{text:'응 맞아'}}}); say({toolCall:{functionCalls:[{id:'2',name:'update_record',args:{action:'confirm_tea'}}]}}); await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>S.draft.stage==='guide'&&S.draft.chat.some(m=>m.guide)),'맞다고 하면 우림 가이드가 화면에');
  say({toolCall:{functionCalls:[{id:'3',name:'update_record',args:{action:'start_brew'}}]}}); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>S.draft.stage==='wait'&&S.timer&&S.timer.running),'"시작하자" → 우림 타이머 시작');
  await p.evaluate(()=>finishTimer()); await p.waitForTimeout(2500);
  ok(await p.evaluate(()=>S.draft.stage==='color')&&got.some(j=>j.clientContent&&/\[앱\].*찻물 색/.test(j.clientContent.turns[0].parts[0].text)),'다 우러나면 앱이 AI에게 알려 AI가 색을 묻게 함');
  say({serverContent:{outputTranscription:{text:'찻물 색은 어때요?'},turnComplete:true}}); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>{ const c=S.draft.chat; return c[c.length-1].ask==='color'&&!!document.querySelector('#askW'); }),'색을 물으면 색 슬라이더가 뜸');
  say({toolCall:{functionCalls:[{id:'4',name:'update_record',args:{color:'비슷해요'}}]}}); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>S.draft.stage==='aroma'&&!!S.draft.feel.colorHex&&!/비슷/.test(S.draft.feel.color)),'"비슷해요" → 슬라이더 색으로 저장하고 향으로');
  say({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:pcm(800)}}]}}}); await p.waitForTimeout(100); say({serverContent:{interrupted:true}}); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>LIVE.sources.length===0&&VOICE.phase==='listening'),'내가 끼어들면(interrupted) 바로 목소리를 멈춤');
  ok(await p.evaluate(()=>/실시간 음성/.test(document.querySelector('#aiBadge').textContent)),'위 표시에 "실시간 음성"');
  const n0=audioIn; await p.evaluate(()=>{ LIVE.sources=[{stop(){}}]; LIVE.echo=0; const h=LIVE.node.port.onmessage, mk=r=>({data:{b:new Int16Array(1600).buffer,r}}); for(let i=0;i<5;i++) h(mk(.04)); h(mk(.05)); }); await p.waitForTimeout(200);
  ok(audioIn===n0,'AI가 말하는 동안 스피커에서 다시 들어온 작은 소리(메아리)는 보내지 않음');
  await p.evaluate(()=>{ const h=LIVE.node.port.onmessage; h({data:{b:new Int16Array(1600).buffer,r:.4}}); LIVE.sources=[]; }); await p.waitForTimeout(200);
  ok(audioIn>n0,'AI가 말하는 중에도 내가 크게 말하면 보냄 (끼어들기)');
  await p.evaluate(()=>stopVoice()); await p.waitForTimeout(200); ok(await p.evaluate(()=>!LIVE.on&&!LIVE.mic),'음성 끝내기 → 연결과 마이크를 닫음');
  ok(await p.evaluate(()=>{ PREF.voiceGender='male'; const m=/voice=Umbriel/.test(liveURL()); PREF.voiceGender='female'; return m&&/voice=Zephyr/.test(liveURL()); }),'설정한 성별대로 목소리 (남성 Umbriel · 여성 Zephyr)');
  ok(await p.evaluate(()=>{ PREF.voiceGender='male'; const a=voiceScore({name:'ko-kr-x-jun-network'})>voiceScore({name:'ko-kr-x-ism-network'}); PREF.voiceGender='female'; const b=voiceScore({name:'Google 한국의 SunHi'})>voiceScore({name:'Microsoft InJoon'}); return a&&b; }),'기본 음성 대화도 휴대폰 목소리 중 그 성별을 먼저 고름');
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):'')); await p.close(); }
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  console.log('실시간 음성 연결됨'); await run(b,'ok'); console.log('실시간 음성 안 됨'); await run(b,'down');
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
