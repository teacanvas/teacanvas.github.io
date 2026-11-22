// TEA CANVAS 1분 데모 영상: 핵심 기능만 (기록 → 말로 하기 → 찻방울 → 캔버스)
// 사용법: node tools/demo-1min.js  → exhibit/demo-1min.mp4 (자막 + 폰 화면만 820×1080으로 잘라 저장)
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'TEA_CANVAS_prototype_v5.html'), OUT=path.join(ROOT,'exhibit');
const W=1200,H=1080, TMP=path.join(require('os').tmpdir(),'tc-demo1-'+Date.now()); fs.mkdirSync(TMP,{recursive:true});
const SPEED=1.45;   // 영상 전체를 살짝 빠르게

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:W,height:H},recordVideo:{dir:TMP,size:{width:W,height:H}}});
  await ctx.addInitScript(()=>{
    try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){}
    addEventListener('DOMContentLoaded',()=>{
      const st=document.createElement('style'); st.textContent=`
        #demoCap{position:fixed;left:48px;top:50%;transform:translateY(-50%);width:320px;z-index:9999;font-family:Pretendard,sans-serif;pointer-events:none;transition:opacity .3s}
        #demoCap .n{font-size:15px;color:#A0A0A0;font-weight:700;letter-spacing:.06em}
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
  const cap=async(title,desc='')=>{ n++; await p.evaluate(([n,t,d])=>{ const c=document.getElementById('demoCap'); if(c) c.innerHTML=`<div class="n">${String(n).padStart(2,'0')}</div><h3>${t}</h3><p>${d}</p>`; },[n,title,desc]); };
  const wait=ms=>p.waitForTimeout(ms), ev=f=>p.evaluate(f);
  const tap=async sel=>{ const el=await p.waitForSelector(sel,{state:'visible',timeout:15000}); await el.scrollIntoViewIfNeeded(); await wait(200); const r=await el.boundingBox(); await p.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:10}); await wait(180); await p.mouse.down(); await wait(80); await p.mouse.up(); await wait(400); };
  const type=async t=>{ await tap('#chatIn'); await p.keyboard.type(t,{delay:40}); await wait(250); await p.keyboard.press('Enter'); await wait(1300); };

  await p.goto(APP); await ev(()=>{ try{ localStorage.clear(); }catch(e){} }); await p.reload(); await wait(700);
  await cap('TEA CANVAS','마신 차의 맛과 향을\n내 말로 기록하면, 색으로 물들어요.'); await wait(3000);

  await cap('채팅으로 기록','차 이름을 알려주면\n우림 가이드와 타이머가 나와요.'); await tap('.bigbtn'); await wait(900);
  await type('오설록 제주 세작'); await tap('#msgs .chip >> text=맞아요'); await wait(1600); await tap('#msgs .chip >> text=우림 시작'); await wait(1400);

  await cap('찻물 색','1분이 지나면 색을 물어요.\n슬라이드 두 개로 맞춰요.'); await ev(()=>{ S.timer.left=S.timer.total-60; }); await p.waitForSelector('#askW #tcD',{timeout:15000}); await wait(800);
  { const r=await (await p.$('#tcD')).boundingBox(); await p.mouse.move(r.x+r.width*.45,r.y+r.height/2,{steps:8}); await p.mouse.down(); await p.mouse.move(r.x+r.width*.62,r.y+r.height/2,{steps:10}); await p.mouse.up(); await wait(400); }
  await tap('#askSend'); await wait(900); await tap('#msgs .chip >> text=벌써 다 우렸어요'); await wait(2200);

  await cap('향과 맛은 내 말로','정해진 보기 대신 떠오르는 대로.\n모르겠을 때만 보기가 나와요.'); await type('비 온 뒤 숲길 같은 향이 은은해요');
  await tap('#msgs .chip >> text=잘 모르겠어요'); await wait(1300); await tap('#askW .chip >> text=고소함'); await tap('#askW .feelnext'); await wait(1800);

  await cap('표현이 색으로','말한 표현은 풍미로 담기고,\n‘살짝’은 작게 ‘엄청’은 크게 들어가요.'); await type('끝에 꿀 같은 단맛이 엄청 진하게 남아요'); await wait(1200);

  await cap('🎙 말로 하기','마이크를 누르면 말로 대화해요.\n말한 풍미 색이 아래에서 번져 올라요.'); await tap('#sendBtn'); await p.waitForFunction(()=>S.draft.chat.filter(m=>m.voice).length>=2,null,{timeout:40000}); await wait(1800); await ev(()=>{ if(VOICE.on) stopVoice(); }); await wait(700);

  await cap('찻방울 완성','남긴 표현이 하나씩\n찻방울에 스며들어요.'); if(await ev(()=>S.draft.stage==='free')){ await tap('.chatfoot .btn >> text=이제 충분해요'); await wait(1400); } await type('딱히 없어요'); await tap('#msgs .chip >> text=이제 정리할게요');
  await p.waitForFunction(()=>cur()==='compare',null,{timeout:30000}); await wait(1200);
  await cap('전문가 설명과 비교','내 표현과 전문가 설명을\n나란히 살펴봐요.'); await ev(()=>document.querySelector('#view').scrollBy({top:380,behavior:'smooth'})); await wait(2200);

  await cap('캔버스에 찍기','오른쪽일수록 향이, 위쪽일수록\n맛이 좋았던 차예요.'); await tap('text=캔버스에 찻방울 찍기'); await wait(900);
  { const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.move(r.x+r.width*.76,r.y+r.height*.24,{steps:12}); await p.mouse.down(); await wait(80); await p.mouse.up(); await wait(1700); }
  await tap('text=저장하고 완료하기'); await wait(1600);

  await cap('나의 캔버스','모든 찻방울이 물들고,\n좋았던 차로 취향 찻방울과 추천 차를 만들어요.'); await ev(()=>goTab('canvas')); await wait(4200); await ev(()=>document.querySelector('#view').scrollBy({top:640,behavior:'smooth'})); await wait(3000);

  await cap('기록 찾기','기간은 달력으로,\n풍미는 필터로 골라요.'); await ev(()=>go('canvas',{tab:'list'},{reset:true})); await wait(2200);
  await tap('.ficon[aria-label="풍미 필터"]'); await wait(500); await tap('#flSheet .fchip.flc >> text=Floral'); await wait(400); await tap('#sheet .btn'); await wait(1800);

  await cap('상세 기록','찻방울을 누르면 다시 번져요.\n위치도 끌어서 옮길 수 있어요.'); await ev(()=>openDetail('s2')); await wait(2200); await tap('#detCv1'); await wait(2400);
  await cap('TEA CANVAS','차를 마실수록,\n나의 취향이 선명해져요.'); await ev(()=>goTab('home')); await wait(3200);

  const vid=await p.video().path(); await ctx.close(); await b.close();
  const mp4=path.join(OUT,'demo-1min.mp4');
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-vf',`setpts=PTS/${SPEED},crop=820:1080:20:0`,'-an','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
  const dur=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',mp4]).toString().trim();
  console.log('완료:',mp4,(fs.statSync(mp4).size/1e6).toFixed(1)+'MB',(+dur).toFixed(1)+'초');
})();
