// 자동 대화(AI 없음)에서 차 이름·종류 확인이 말을 알아듣는지: 사용자가 실제로 막혔던 대화를 그대로 다시 해 본다
// 사용법: node tests/auto-chat.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html');
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const fresh=async()=>{ await p.goto(FILE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.evaluate(()=>startRecord()); await p.waitForTimeout(300); };
  const say=async t=>{ await p.fill('#chatIn',t); await p.evaluate(()=>sendInput()); await p.waitForTimeout(900); return p.evaluate(()=>{ const c=S.draft.chat, x=c[c.length-1]; return {text:x.text,chips:x.chips||[],st:S.draft.stage,name:S.draft.name,type:S.draft.type}; }); };
  await fresh();
  let r=await say('어제 자스민차 사왔어'); ok(r.name==='자스민차'&&r.st==='guide'&&r.type==='green','"어제 자스민차 사왔어" → 이름은 자스민차, 종류가 분명하니 묻지 않고 바로 우림 가이드');
  await fresh(); r=await say('할머니가 주신 차'); ok(r.st==='teaType'&&r.chips.includes('기타'),'종류를 모르는 차 → 종류를 물음');
  r=await say('녹차 아니야'); ok(r.st==='teaType'&&r.chips.includes('기타'),'"녹차 아니야" → 이름으로 착각하지 않고 종류 고르기');
  r=await say('허브차야'); ok(r.st==='guide'&&r.type==='herb','"허브차야" → 허브차로 정하고 우림 가이드');
  await fresh(); r=await say('오설록 청귤차 마시려구'); ok(r.name==='청귤차','"오설록 청귤차 마시려구" → 이름은 청귤차');
  await fresh(); await say('우엉차'); r=await say('아니 기타로 해줘'); ok(r.st==='guide'&&r.type==='other','"아니 기타로 해줘" → 기타로 정함');
  await fresh(); await say('보리차'); r=await say('응 맞아'); ok(r.st==='guide'&&r.type==='other','"응 맞아" → 그대로 가이드');
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
