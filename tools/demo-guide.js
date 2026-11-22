// TEA CANVAS 사용법 안내 영상: 처음 보는 사람에게 핵심 기능을 순서대로 알려준다
// 사용법: node tools/demo-guide.js  → exhibit/demo-guide.mp4 (자막 + 폰 화면, 820×1080)
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'TEA_CANVAS_prototype_v6.html'), OUT=path.join(ROOT,'exhibit');
const W=1200,H=1080, TMP=path.join(require('os').tmpdir(),'tc-guide-'+Date.now()); fs.mkdirSync(TMP,{recursive:true});
const SPEED=1.3;   // 영상 전체를 살짝 빠르게

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:W,height:H},recordVideo:{dir:TMP,size:{width:W,height:H}}});
  await ctx.addInitScript(()=>{
    try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){}
    addEventListener('DOMContentLoaded',()=>{
      const st=document.createElement('style'); st.textContent=`
        #demoCap{position:fixed;left:48px;top:50%;transform:translateY(-50%);width:320px;z-index:9999;font-family:Pretendard,sans-serif;pointer-events:none;transition:opacity .3s}
        #demoCap .n{font-size:15px;color:#A0A0A0;font-weight:700;letter-spacing:.06em}#demoCap .n:empty{display:none}
        #demoCap h3{font-size:32px;line-height:1.3;margin:8px 0 10px;color:#111;font-weight:800;letter-spacing:-.02em}
        #demoCap p{font-size:18px;line-height:1.6;color:#555;white-space:pre-line}
        #demoDot{position:fixed;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(214,69,61,.3);border:2px solid rgba(214,69,61,.85);z-index:10000;pointer-events:none;transition:transform .15s,opacity .4s;opacity:0}
        #demoDot.on{opacity:1}#demoDot.tap{transform:scale(.6)}`;
      document.head.appendChild(st);
      const c=document.createElement('div'); c.id='demoCap'; document.body.appendChild(c);
      const d=document.createElement('div'); d.id='demoDot'; document.body.appendChild(d);
      addEventListener('mousemove',e=>{ d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; d.classList.add('on'); clearTimeout(d._t); d._t=setTimeout(()=>d.classList.remove('on'),1400); },true);
      addEventListener('mousedown',()=>d.classList.add('tap'),true); addEventListener('mouseup',()=>d.classList.remove('tap'),true);
    });
  });
  const p=await ctx.newPage(); let n=0;
  const cap=async(title,desc='')=>{ const first=/사용법$/.test(title)||!title; if(!first) n++; await p.evaluate(([n,t,d])=>{ const c=document.getElementById('demoCap'); if(c) c.innerHTML=`<div class="n">${n?'STEP '+n:''}</div><h3>${t||'TEA CANVAS'}</h3><p>${d}</p>`; },[first?0:n,title,desc]); };
  const wait=ms=>p.waitForTimeout(ms), ev=f=>p.evaluate(f);
  const tap=async sel=>{ const el=await p.waitForSelector(sel,{state:'visible',timeout:15000}); await el.scrollIntoViewIfNeeded(); await wait(200); const r=await el.boundingBox(); await p.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:10}); await wait(180); await p.mouse.down(); await wait(80); await p.mouse.up(); await wait(400); };
  const type=async t=>{ await tap('#chatIn'); await p.keyboard.type(t,{delay:40}); await wait(250); await p.keyboard.press('Enter'); await wait(1300); };

  await p.goto(APP); await wait(900);
  const slow=async(sel,a,b2,steps=14)=>{ const r=await (await p.$(sel)).boundingBox(); await p.mouse.move(r.x+r.width*a[0],r.y+r.height*a[1],{steps:8}); await p.mouse.down(); await p.mouse.move(r.x+r.width*b2[0],r.y+r.height*b2[1],{steps}); await p.mouse.up(); };
  await cap('TEA CANVAS 사용법','마신 차의 맛과 향을 내 말로 남기면\n색이 되어 캔버스에 물드는 차 기록장이에요.'); await wait(4200);

  await cap('새로운 차 기록하기','차를 우리기 전에\n아래 버튼을 눌러 시작해요.'); await wait(1500); await tap('.bigbtn'); await wait(1200);
  await cap('차 이름 알려주기','이름과 브랜드를 적거나 말해요.\n사진으로 찍어 남겨도 돼요.'); await type('오설록 제주 세작'); await wait(600); await tap('#msgs .chip >> text=맞아요'); await wait(1800);
  await cap('우림 가이드대로 우리기','온도·시간·양을 보고 ‘우림 시작’.\n위에 타이머가 돌아가요.'); await wait(2400); await tap('#msgs .chip >> text=우림 시작'); await wait(2200);
  await cap('찻물 색 고르기','1분쯤 지나면 색을 물어봐요.\n두 슬라이드로 가장 가까운 색을 맞춰요.'); await ev(()=>{ S.timer.left=S.timer.total-60; }); await p.waitForSelector('#askW #tcD',{timeout:15000}); await wait(900);
  await slow('#tcD',[.4,.5],[.62,.5]); await wait(600); await tap('#askSend'); await wait(1100);
  await cap('다 우렸다면','타이머를 기다리지 않아도 돼요.\n‘벌써 다 우렸어요’를 눌러요.'); await tap('#msgs .chip >> text=벌써 다 우렸어요'); await wait(2400);

  await cap('향과 맛은 내 말로','떠오르는 대로 말해요.\n“비 온 뒤 숲길 같아요”처럼 비유도 좋아요.'); await type('비 온 뒤 숲길 같은 풀 향이에요'); await wait(500);
  await cap('잘 모르겠다면','‘잘 모르겠어요’를 누르면\n고를 수 있는 보기가 나와요.'); await tap('#msgs .chip >> text=잘 모르겠어요'); await wait(1400); await tap('#askW .chip >> text=고소함'); await wait(400); await tap('#askW .feelnext'); await wait(1800);
  await cap('마시면서 자유롭게','‘살짝’, ‘엄청’ 같은 말은 색의 크기가 돼요.\n🎙를 누르면 말로 해도 돼요.'); await type('끝에 꿀 같은 단맛이 엄청 진하게 남아요'); await wait(1600);
  await cap('다 마셨다면','‘이제 충분해요’를 누르고\n여운을 한마디 남겨요.'); await tap('.chatfoot .btn >> text=이제 충분해요'); await wait(1600); await type('식으니까 더 달아요'); await wait(800);
  await cap('정리하기','더 남기고 싶은 게 없다면\n‘이제 정리할게요’.'); await tap('#msgs .chip >> text=이제 정리할게요');

  await cap('찻방울 완성','내가 남긴 말이 하나씩\n색이 되어 스며들어요.'); await p.waitForFunction(()=>cur()==='compare',null,{timeout:30000}); await wait(900);
  await cap('전문가 설명과 비교','내 표현과 전문가 설명의\n같은 점·다른 점을 봐요.'); await ev(()=>document.querySelector('#view').scrollBy({top:340,behavior:'smooth'})); await wait(2800);
  await cap('캔버스에 찍기','오른쪽일수록 향이, 위쪽일수록 맛이\n좋았던 차. 마음에 드는 자리를 눌러요.'); await tap('text=캔버스에 찻방울 찍기'); await wait(1500);
  { const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.move(r.x+r.width*.76,r.y+r.height*.24,{steps:12}); await p.mouse.down(); await wait(80); await p.mouse.up(); await wait(1600); }
  await cap('별점과 한 줄','찻잎 별점과 한 줄, 사진을 남기고\n‘저장하고 완료하기’.'); await tap('#starRow button >> nth=2'); await wait(400); await tap('#cmt'); await p.keyboard.type('비 오는 날 딱 좋았던 세작',{delay:40}); await wait(700); await tap('text=저장하고 완료하기'); await wait(1800);

  await cap('나의 캔버스','기록할수록 찻방울이 쌓이고,\n좋았던 차로 나의 취향 찻방울을 만들어요.'); await tap('text=캔버스에서 보기'); await wait(4200); await ev(()=>document.querySelector('#view').scrollBy({top:640,behavior:'smooth'})); await wait(3200);
  await cap('기록 다시 보기','‘기록’에서 이름·표현으로 찾고\n달력과 풍미로 걸러볼 수 있어요.'); await ev(()=>go('canvas',{tab:'list'},{reset:true})); await wait(2200); await tap('.ficon[aria-label="풍미 필터"]'); await wait(600); await tap('#flSheet .fchip.flc >> text=Sweet'); await wait(500); await tap('#sheet .btn'); await wait(1600);
  await cap('상세 기록','찻방울을 누르면 다시 번지고,\n연필 버튼으로 언제든 고칠 수 있어요.'); await tap('.ritem >> nth=0'); await wait(1800); await tap('#detCv1'); await wait(2400);
  await cap('','차를 마실수록,\n나의 취향이 선명해져요.'); await ev(()=>goTab('home')); await wait(3400);

  const vid=await p.video().path(); await ctx.close(); await b.close();
  const mp4=path.join(OUT,'demo-guide.mp4');
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-vf',`setpts=PTS/${SPEED},crop=820:1080:20:0`,'-an','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
  const dur=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',mp4]).toString().trim();
  console.log('완료:',mp4,(fs.statSync(mp4).size/1e6).toFixed(1)+'MB',(+dur).toFixed(1)+'초');
})();
