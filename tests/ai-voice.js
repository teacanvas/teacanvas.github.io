// AI 목소리 확인: 가짜 서버가 wav를 주면 그걸 틀고, 실패하면 휴대폰 목소리로, 기다리는 중에 끊으면 바로 멈추는지 본다
// 사용법: node tests/ai-voice.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
function wav(ms){ const rate=8000, n=Math.round(rate*ms/1000), b=Buffer.alloc(44+n*2); b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(rate,24); b.writeUInt32LE(rate*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++) b.writeInt16LE(Math.round(3000*Math.sin(i/5)),44+i*2); return b; }
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); let mode='ok', calls=0, last=null;
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; },EP);
  await p.route(EP,async r=>{ calls++; last=JSON.parse(r.request().postData()||'{}'); if(mode==='fail') return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'upstream',detail:'gemini-3.8-flash-lite-tts 429 RESOURCE_EXHAUSTED'})});
    if(mode==='slow') await new Promise(x=>setTimeout(x,3000)); return r.fulfill({status:200,headers:{'Content-Type':'audio/wav','X-TTS-Model':'gemini-3.8-flash-tts','Access-Control-Expose-Headers':'X-TTS-Model'},body:wav(600)}); });
  await p.goto(FILE); await p.waitForTimeout(600);
  let t=await p.evaluate(async()=>{ const t0=Date.now(); await speak('안녕하세요. 오늘은 어떤 차를 마셔볼까요?'); return {ms:Date.now()-t0,src:AUDIO&&AUDIO.src}; });
  ok(calls===1&&last.mode==='speak'&&last.voice==='Zephyr','AI 목소리 요청 (기본: 여성 Zephyr)'); ok(/^blob:/.test(t.src)&&t.ms>=500&&t.ms<4000,`받은 소리를 끝까지 틀고 끝남 (${t.ms}ms)`);
  await p.evaluate(()=>speak('안녕하세요. 오늘은 어떤 차를 마셔볼까요?')); ok(calls===1,'같은 문장은 다시 요청하지 않음');
  await p.evaluate(()=>speak('두 번째 문장이에요.')); ok(last.pin==='gemini-3.8-flash-tts','목소리는 늘 같은 모델로만 만듦 (목소리 결이 바뀌지 않게)');
  await p.evaluate(()=>{ PREF.aiVoice='device'; }); const c0=calls; await p.evaluate(()=>speak('기본 목소리로.')); ok(calls===c0,'설정에서 휴대폰 목소리를 고르면 AI 목소리를 부르지 않음'); await p.evaluate(()=>{ PREF.aiVoice='Zephyr'; });
  mode='slow'; t=await p.evaluate(async()=>{ const t0=Date.now(); const pr=speak('조금 기다려야 하는 문장이에요.'); setTimeout(hush,400); await pr; return Date.now()-t0; });
  ok(t<1500,`기다리는 중에 끊으면 바로 멈춤 (${t}ms)`);
  await p.evaluate(()=>{ VOICE.ttsUsed=true; }); mode='fail'; calls=0; t=await p.evaluate(async()=>{ const t0=Date.now(); await speak('실패하면 휴대폰 목소리로.'); return Date.now()-t0; });
  ok(calls===1,'실패 → 휴대폰 목소리로 넘어감');
  const tt=await p.evaluate(()=>{ const e=document.querySelector('#toast'); return e.classList.contains('show')?e.textContent:''; });
  ok(/AI 목소리를 다 써서/.test(tt),'듣던 AI 목소리가 바뀌면 위에 이유를 알림: '+tt); await p.evaluate(()=>speak('두 번째 실패.')); calls=0;
  await p.evaluate(()=>speak('세 번째 문장.')); ok(calls===0,'연달아 실패하면 잠시 AI 목소리를 쉬고 바로 휴대폰 목소리');
  await p.evaluate(()=>{ localStorage.setItem('teacanvas.v6.aiOff',JSON.stringify({tts:Date.now()+6e5,why:'quota'})); }); await p.reload(); await p.waitForTimeout(600);
  await p.evaluate(()=>{ startRecord(); }); await p.waitForTimeout(400); calls=0; await p.evaluate(()=>{ window.TC_VOICE_FAST=0; toggleVoice(); }); await p.waitForTimeout(900);
  const vt=await p.evaluate(()=>{ const e=document.querySelector('#toast'); return e.classList.contains('show')?e.textContent:''; });
  ok(/이번에는 기본 목소리로/.test(vt),'음성 모드를 누르자마자 AI 목소리 한도를 알림: '+vt.replace(/\n/,' '));
  ok(await p.evaluate(()=>/기본 목소리/.test(document.querySelector('#aiBadge').textContent)),'위 표시에 "기본 목소리"'); await p.evaluate(()=>stopVoice());
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
