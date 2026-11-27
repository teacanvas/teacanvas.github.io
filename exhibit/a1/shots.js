const {chromium}=require('playwright'); const D=__dirname+'/';
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,hasTouch:true,isMobile:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{ window.TC_AI_ENDPOINT='https://teacanvas-ai-test.sehoon3554.workers.dev/'; Object.defineProperty(navigator,'webdriver',{get:()=>false}); try{ localStorage.clear(); }catch(e){} });
 await p.goto('file:///home/user/teacanvas.github.io/TEA_CANVAS_prototype_v6.html'); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ homePaint('vegetal'); const bt=document.querySelector('.hp-belt'); bt.dispatchEvent(new TouchEvent('touchstart',{bubbles:true})); const bs=[...document.querySelectorAll('#hpPal button')].filter(x=>x.dataset.k==='vegetal'); const b=bs[1]||bs[0]; bt.scrollLeft=b.offsetLeft-bt.clientWidth/2+b.offsetWidth/2; }); await p.waitForTimeout(1500);
 await p.screenshot({path:D+'s1-home.png'});
 // 2 대화: AI와 이야기하며 찻물 색을 고르는 순간
 await p.evaluate(()=>{ startRecord(); const d=S.draft; Object.assign(d,{name:'제주 세작',brand:'오설록',type:'green',aiFlow:true,by:'ai',about:'어린 찻잎의 산뜻한 풀향과 은은한 단맛',stage:'color',drinkAt:Date.now()-60000});
  d.chat=[{who:'bot',text:'반가워요. 오늘은 어떤 차를 마셔볼까요?',ai:true},{who:'me',text:'오설록 제주 세작이야',ans:'tea'},
   {who:'bot',text:'오설록의 제주 세작이군요. 어린 찻잎의 산뜻한 풀향과 은은한 단맛이 좋은 녹차예요. 녹차로 기록할까요?',ai:true},{who:'me',text:'응 맞아, 근데 이미 우려놨어',ans:'tea'},
   {who:'bot',text:'좋아요, 그럼 찻물 색부터 볼까요? 아래에서 가장 비슷한 색을 골라 주세요.',ai:true,ask:'color'}];
  S.ask={hd:[.43,.30],sel:[]}; rerender(); });
 await p.waitForTimeout(1200); await p.screenshot({path:D+'s2-chat.png'});
 // 3 비교: 내 감각과 전문가 설명 (AI가 정리)
 await p.evaluate(()=>{ const d=S.draft; Object.assign(d,{stage:'done'}); d.feel={color:'연한 연두색',colorHD:[.40,.26],colorHex:tcColor(.40,.26),aroma:'갓 벤 풀처럼 싱그러운 향',taste:'달큰하고 고소한 맛'}; d.afterText='끝에 단맛이 오래 남음';
  d.flMap={'갓 벤 풀처럼 싱그러운 향':['vegetal','fresh'],'달큰하고 고소한 맛':['sweet','nutty'],'끝에 단맛이 오래 남음':['sweet']};
  d.chat.push({who:'me',text:'연한 연두색이야',ans:'color'},{who:'bot',text:'맑은 연두색이군요. 향은 어떤가요?',ai:true,ask:'aroma'},{who:'me',text:'갓 벤 풀처럼 싱그러운 향이 나',ans:'aroma'},{who:'bot',text:'싱그러운 풀향이네요. 한 모금 마셔 보면 어때요?',ai:true},{who:'me',text:'달큰하고 고소해. 비 온 뒤 숲길에 있는 것 같아',fl:['vegetal','earthy','fresh']},{who:'bot',text:'숲길 같은 차분함까지 담아둘게요.',ai:true});
  d.flavors=null; go('compare'); });
 await p.waitForTimeout(12000); await p.evaluate(()=>{ document.querySelector('#view').scrollTop=0; }); await p.screenshot({path:D+'s3-compare.png'});
 // 4 캔버스에 찍기
 await p.evaluate(()=>{ openCanvasSheet(); }); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ const c=document.querySelector('#sheetWrap.open canvas'); const r=c.getBoundingClientRect(); const ev=t=>c.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+.74*r.width,clientY:r.top+.24*r.height,pointerId:1})); ev('pointerdown'); setTimeout(()=>ev('pointerup'),900); });
 await p.waitForTimeout(3000); await p.screenshot({path:D+'s4-stamp.png'});
 // 5 나의 캔버스
 await p.evaluate(()=>{ const d=S.draft; d.stars=3; d.comment='비 온 뒤 숲길 같은 첫 잔'; if(!d.canvas) d.canvas={x:.74,y:.24,i:.8}; closeSheet(); saveRecord(); S.justSaved=null; go('canvas',{tab:'canvas'},{reset:true}); });
 await p.waitForTimeout(5000); await p.screenshot({path:D+'s5-canvas.png'});
 console.log(errs); await b.close(); })();
