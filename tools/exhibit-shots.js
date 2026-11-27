// 과제전 화면 미리보기: 스탠바이미(세로 1080×1920 CSS px)에서 주요 화면을 찍어 exhibit/shots/에 저장
// node tools/exhibit-shots.js
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const F='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), OUT=path.join(__dirname,'..','exhibit/shots');
(async()=>{ fs.mkdirSync(OUT,{recursive:true}); const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1,hasTouch:true});
  await ctx.addInitScript(()=>{ window.TC_AI_ENDPOINT=''; try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){} });   // AI 서버 없이 자동 대화로
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/workers\.dev/,r=>r.abort());   // AI 서버 없이(자동 대화) 찍는다
  await p.goto(F); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ homePaint('vegetal'); const bt=document.querySelector('.hp-belt'); bt.dispatchEvent(new TouchEvent('touchstart',{bubbles:true})); const bs=[...document.querySelectorAll('#hpPal button')].filter(x=>x.dataset.k==='vegetal'); const b=bs[1]||bs[0]; bt.scrollLeft=b.offsetLeft-bt.clientWidth/2+b.offsetWidth/2; }); await p.waitForTimeout(1500);   // 첫 화면: Grassy를 골라 물감 줄 가운데에, 물번짐이 한창일 때
  const shot=async n=>{ await p.screenshot({path:path.join(OUT,n+'.png')}); console.log('  '+n); };
  const reset=()=>p.evaluate(()=>{ try{ closeSheet(); S.draft=null; S.timer=null; S.stack=[{name:'home',params:{}}]; }catch(e){} });
  await shot('01-홈');
  const ph=await p.$('#phone'), bb=await ph.boundingBox();
  await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height*.5); await p.waitForTimeout(700); await shot('02-홈-번지는중');
  await p.waitForTimeout(2600); await p.waitForSelector('.sugb',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(400); await shot('03-대화-시작');
  const tap=async(n)=>{ for(let i=0;i<n;i++){ const s=await p.waitForSelector('.sugb',{timeout:8000}).catch(()=>null); if(!s) break; await p.waitForFunction(()=>!S.typing,null,{timeout:8000}).catch(()=>{}); await s.click(); await p.waitForTimeout(2200); } await p.waitForSelector('.sugb',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(400); };
  await tap(1); await shot('04-대화-차이름');
  await tap(2); await shot('05-대화-색');
  await tap(2); await shot('06-대화-향맛');
  await tap(2); await shot('07-대화-마무리');
  const jump=async(k,n,w=1800)=>{ await reset(); await p.evaluate(k=>jump(JUMPS.findIndex(j=>j[1]===k)),k); await p.waitForTimeout(w); await shot(n); };
  await jump('analyzing','08-찻방울-완성',4500);
  await jump('compare','09-설명과-비교');
  await jump('@canvas','10-캔버스에-찍기');
  await jump('@done','11-기록-완료');
  await jump('@cv','12-캔버스');
  await jump('@list','13-기록-목록');
  await jump('@detail','14-상세-기록');
  if(errs.length) console.log('화면 오류:',[...new Set(errs)].join(' / '));
  await b.close(); })();
