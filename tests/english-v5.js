// 대화 언어 English 확인: 영어로 차 이름 · 대답 · 질문 · 풍미 → 비교까지, 챗봇 말에 한국어가 남지 않는지
// 사용법: node tests/english-v5.js
const {chromium}=require('playwright');const F='file://'+require('path').join(__dirname,'..','TEA_CANVAS_prototype_v6.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:393,height:852}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ window.TC_VOICE_FAST=true; delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
await p.goto(F);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('teacanvas.v6.fresh13','1');localStorage.setItem('teacanvas.v6.prefs',JSON.stringify({lang:'en'}))});await p.reload();await p.waitForTimeout(600);
const ev=(f,a)=>p.evaluate(f,a), wait=ms=>p.waitForTimeout(ms), say=async t=>{await p.fill('#chatIn',t);await ev(()=>sendInput());await wait(1400);};
console.log('lang',await ev(()=>PREF.lang));
await ev(()=>startRecord());await wait(500);
await say('Twinings Earl Grey');console.log('type',await ev(()=>[S.draft.type,S.draft.name,S.draft.brand]));
await say('yes');await wait(400);await say('start');console.log('stage',await ev(()=>[S.draft.stage,!!S.timer]));
await ev(()=>{S.timer.left=S.timer.total-60});await wait(2500);await say('a deep amber color');console.log('color',await ev(()=>[S.draft.feel.color,S.draft.feel.colorHex]));
await ev(()=>finishTimer());await wait(2500);await say('It smells like bergamot and slightly floral');await say('very sweet and smooth');
await say('what temperature is best?');console.log('faq',await ev(()=>L(S.draft.chat[S.draft.chat.length-1].text)));
await say('a hint of honey');await say("that's enough");await wait(800);await say('nothing');await say("let's wrap up");
await p.waitForFunction(()=>cur()==='compare',null,{timeout:25000}).catch(()=>{});
console.log('cur',await ev(()=>cur()),'flavors',await ev(()=>JSON.stringify((S.draft.flavors||[]).map(f=>f.k+':'+f.w))));
const bots=await ev(()=>S.draft.chat.filter(m=>m.who!=='me').map(m=>L(m.text)));const kor=bots.filter(t=>/[가-힣]/.test(t));console.log('bot lines',bots.length,'still korean:',kor);
await ev(()=>{clearLive();S.draft=null;S.stack=[{name:'home'}];startRecord();});await wait(400);await p.click('#sendBtn');await p.waitForFunction(()=>S.draft.stage==='free'||cur()!=='chat',null,{timeout:60000}).catch(()=>{});
console.log('voice demo stage',await ev(()=>[S.draft&&S.draft.stage,S.draft&&S.draft.name,S.draft&&S.draft.type]));
console.log('errs',errs);await b.close();})();
