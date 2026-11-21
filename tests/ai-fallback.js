// AI 연결 확인: 가짜 서버로 (1) AI가 대답하면 그 대답을 쓰고 (2) 서버가 실패하면 정해진 대답으로 넘어가는지 본다
// 사용법: node tests/ai-fallback.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v5.html'); const EP='https://ai.test/chat';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
async function run(b,mode){
  const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; },EP);
  await p.route(EP,async route=>{ if(mode==='fail') return route.fulfill({status:500,body:'x'});
    const body=JSON.parse(route.request().postData()||'{}');
    if(body.mode==='question') return route.fulfill({contentType:'application/json',body:JSON.stringify({text:'(AI) 녹차는 조금 식힌 물이 좋아요.'})});
    return route.fulfill({contentType:'application/json',body:JSON.stringify({expert:'(AI) 전문가 설명',mine:'(AI) 나의 기록',common:['(AI) 풀향'],diff:['(AI) 차이'],ai:'(AI) 해석'})}); });
  await p.goto(FILE); await p.waitForTimeout(700);
  await p.evaluate(()=>{ startRecord(); }); await p.fill('#chatIn','제주 세작'); await p.evaluate(()=>sendInput()); await p.waitForTimeout(1200);
  await p.click('#msgs .chip >> text=맞아요'); await p.waitForTimeout(1200); await p.click('#msgs .chip >> text=바로 마실게요'); await p.waitForTimeout(1200);
  await p.fill('#chatIn','물 온도는 몇 도가 좋아요?'); await p.evaluate(()=>sendInput()); await p.waitForTimeout(1500);
  const reply=await p.evaluate(()=>S.draft.chat[S.draft.chat.length-1].text);
  if(mode==='ok') ok(reply.startsWith('(AI)'),'질문: AI 대답 사용'); else ok(/70/.test(reply),'질문: 서버 실패 → 정해진 대답');
  await p.evaluate(()=>{ const d=S.draft; d.feel.aroma='꽃향'; d.feel.taste='단맛'; d.stage='free'; d.flavors=null; go('compare'); }); await p.waitForTimeout(1500);
  const ex=await p.evaluate(()=>document.querySelector('#cmpExpert').textContent);
  if(mode==='ok') ok(ex.startsWith('(AI)'),'비교: AI 정리 사용'); else ok(!ex.startsWith('(AI)')&&ex.length>5,'비교: 서버 실패 → 정해진 내용');
  ok(!errs.length,'화면 오류 없음'+(errs.length?': '+errs.join(' / '):'')); await p.close(); }
(async()=>{ const b=await chromium.launch(); console.log('AI 연결됨'); await run(b,'ok'); console.log('AI 실패'); await run(b,'fail'); await b.close();
  console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
