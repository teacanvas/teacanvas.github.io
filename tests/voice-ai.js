// 음성 모드 + AI 확인 (가짜 마이크): ① 잘못 들린 말을 AI가 고쳐 채팅에 보여주는지 ② 봇이 생각하는 동안 이어서 말하면 앞말과 합쳐 다시 묻는지
// 사용법: node tests/voice-ai.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const seen=[];
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; window.TC_VOICE_FAST=1;
    class FakeSR{ constructor(){ this.lang='ko-KR'; } start(){ window.__active=this; setTimeout(()=>this.onaudiostart&&this.onaudiostart(),0); } stop(){ this._end(); } abort(){ this._end(); }
      _end(){ if(this.ended) return; this.ended=true; if(window.__active===this) window.__active=null; setTimeout(()=>this.onend&&this.onend(),0); } }
    window.__say=t=>{ const r=window.__active; if(!r) return false; const x=[{transcript:t},{transcript:t+'요'}]; x.isFinal=true; r.onresult&&r.onresult({results:[x]}); r._end(); return true; };
    window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR; },EP);
  await p.route(EP,async r=>{ const q=JSON.parse(r.request().postData()||'{}'); seen.push(q); const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)}).catch(()=>{});
    if(q.mode!=='flow') return J({reply:'(AI) 네',finish:false});
    const m=q.message||''; if(/첫말/.test(m)&&!/둘째말/.test(m)) await new Promise(x=>setTimeout(x,2500));
    const heard=q.voice?m.replace('재주','제주'):undefined;
    if(q.want==='tea') return J({reply:'(AI) 제주 세작을 찾아봤어요. 녹차로 기록할게요. 맞나요?',fill:{name:'제주 세작',brand:'오설록',type:'green'},heard});
    return J({reply:`(AI) ${m}`,fill:{},heard}); });
  await p.goto(FILE); await p.waitForTimeout(600); await p.evaluate(()=>{ startRecord(); }); await p.waitForTimeout(300); await p.evaluate(()=>toggleVoice());
  const waitListen=()=>p.waitForFunction(()=>!!window.__active,null,{timeout:6000});
  await waitListen(); await p.evaluate(()=>__say('오설록 재주 세작 마실게')); await p.waitForTimeout(1200);
  const me1=await p.evaluate(()=>S.draft.chat.find(m=>m.who==='me'));
  ok(me1&&me1.text==='오설록 제주 세작 마실게'&&me1.raw==='오설록 재주 세작 마실게','잘못 들린 "재주"를 AI가 "제주"로 고쳐 채팅에 보여줌 (원래 들린 말은 따로 보관)');
  ok(seen.some(q=>q.mode==='flow'&&q.voice&&Array.isArray(q.voice.alts)&&q.voice.alts.length),'AI에게 음성이라는 것과 다른 인식 후보도 함께 보냄');
  await waitListen(); await p.evaluate(()=>__say('첫말'));
  const busy=await p.waitForFunction(()=>S.typing&&!!window.__active&&VOICE.phase==='thinking',null,{timeout:2000}).then(()=>true).catch(()=>false);
  ok(busy,'봇이 생각하는 동안에도 마이크가 켜져 있음');
  await p.evaluate(()=>__say('둘째말')); await p.waitForTimeout(1200);
  const mine=await p.evaluate(()=>S.draft.chat.filter(m=>m.who==='me').map(m=>m.text));
  ok(mine.includes('첫말 둘째말')&&!mine.includes('첫말'),'이어서 한 말은 앞말과 합쳐 한 번에 다시 물음: '+JSON.stringify(mine.slice(-2)));
  ok(await p.evaluate(()=>S.draft.chat.some(m=>m.who==='bot'&&m.text==='(AI) 첫말 둘째말')&&!S.draft.chat.some(m=>m.who==='bot'&&m.text==='(AI) 첫말')),'버린 요청의 대답은 나오지 않음');
  ok(await p.evaluate(()=>!S.draft.aiLost),'합쳐 다시 물은 건 AI 실패로 치지 않음');
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
