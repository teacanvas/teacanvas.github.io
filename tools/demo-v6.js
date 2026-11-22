// TEA CANVAS 최종 데모: 기록 흐름과 v6에서 새로 생긴 기능을 차례로 보여준다
// 사용법: node tools/demo-v6.js  → exhibit/demo-final.mp4 (자막 + 폰 화면, 820×1080)
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'TEA_CANVAS_prototype_v6.html'), OUT=path.join(ROOT,'exhibit');
const W=1200,H=1080, TMP=path.join(require('os').tmpdir(),'tc-demo6-'+Date.now()); fs.mkdirSync(TMP,{recursive:true});
const SPEED=1.25;   // 영상 전체를 살짝 빠르게

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

  await p.goto(APP); await wait(900);
  const slow=async(sel,a,b2,steps=14)=>{ const r=await (await p.$(sel)).boundingBox(); await p.mouse.move(r.x+r.width*a[0],r.y+r.height*a[1],{steps:8}); await p.mouse.down(); await p.mouse.move(r.x+r.width*b2[0],r.y+r.height*b2[1],{steps}); await p.mouse.up(); };
  await cap('TEA CANVAS','마신 차의 맛과 향을 내 말로 남기면\n색으로 물들어요. 예시 기록 13개로 시작해요.'); await wait(3500);
  await cap('홈 풍미는 매번 다른 순서','들어올 때마다 다른 풍미부터\n번지며 나타나요.'); await wait(3000);

  await cap('채팅으로 기록','차 이름을 알려주면 우림 가이드가 나오고,\n위에는 차 종류별 티백 그림이 놓여요.'); await tap('.bigbtn'); await wait(900); await type('오설록 제주 세작'); await tap('#msgs .chip >> text=맞아요'); await wait(1800);
  await cap('알기 쉬운 가이드 버튼','‘어떤 차든 쓰는 기본 가이드 보기’처럼\n누르기 전에 뜻을 알 수 있어요.'); await wait(2600); await tap('#msgs .chip >> text=우림 시작'); await wait(1500);
  await ev(()=>{ S.timer.left=S.timer.total-60; }); await p.waitForSelector('#askW #tcD',{timeout:15000}); await wait(600); await tap('#askSend'); await wait(900); await tap('#msgs .chip >> text=벌써 다 우렸어요'); await wait(2200);
  await type('비 온 뒤 숲길 같은 풀 향이에요'); await tap('#msgs .chip >> text=잘 모르겠어요'); await wait(1200); await tap('#askW .chip >> text=고소함'); await tap('#askW .feelnext'); await wait(1800);
  await cap('표현이 막히면?','마시는 동안 말이 떠오르지 않으면\n예시 표현을 볼 수 있어요.'); await tap('#msgs .chip >> text=표현이 막히면?'); await wait(2800);
  await type('끝에 살짝 떫고 꿀 같은 단맛이 남아요');

  await cap('앱이 닫혀도 자동 저장','기록 중에 앱이 꺼져도\n다시 열면 홈에서 이어할 수 있어요.'); await wait(1500); await p.reload(); await wait(2200); await tap('.resume>button:first-child'); await wait(1800);
  await cap('휴대폰 뒤로가기','앱 밖으로 나가지 않고\n기록 중이면 먼저 물어봐요.'); await p.goBack(); await wait(2000); await tap('text=계속 기록하기'); await wait(1000);

  await cap('🎙 말로 하기','마이크를 누르면 말로 대화해요.\n내 말에 같이 마시는 사람처럼 맞장구를 쳐요.'); await tap('#sendBtn'); await wait(6500); await ev(()=>{ if(VOICE.on) stopVoice(); }); await wait(500);
  await cap('말하는 중에도 바로 다음으로','챗봇이 말하는 중에 버튼을 누르면\n말을 끊고 바로 다음 대화로 넘어가요.'); await tap('.chatfoot .btn >> text=이제 충분해요'); await wait(2400);
  await type('목 뒤로 은은한 단맛이 오래 남아요'); await wait(600);

  await cap('찻방울 완성 3단계','처음엔 맑은 물만 번지고,\n풍미 이름과 그 색이 하나씩 스며들어요.'); await tap('#msgs .chip >> text=이제 정리할게요'); await p.waitForFunction(()=>cur()==='compare',null,{timeout:30000}); await wait(900);
  await cap('비교는 내가 한 말로','공통점·차이점이 실제 내 표현으로.\n카드 아이콘은 뺐어요.'); await ev(()=>document.querySelector('#view').scrollBy({top:360,behavior:'smooth'})); await wait(3000);

  await cap('캔버스에 찍기','자리를 찍기 전엔 저장 버튼이 흐리고,\n별점은 찻잎 3개, 한 줄과 사진을 함께.'); await tap('text=캔버스에 찻방울 찍기'); await wait(1500);
  { const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.move(r.x+r.width*.74,r.y+r.height*.26,{steps:12}); await p.mouse.down(); await wait(80); await p.mouse.up(); await wait(1500); }
  await tap('#starRow button >> nth=1'); await wait(400); await tap('#cmt'); await p.keyboard.type('비 오는 날 딱 좋았던 세작',{delay:40}); await wait(600);
  await cap('캔버스 읽는 법','제목 옆 ? 를 누르면 자리·색·크기의\n뜻을 한 번에 볼 수 있어요.'); await tap('.ht .help'); await wait(3500); await tap('text=알겠어요'); await wait(500);
  await ev(()=>openCanvasSheet()); await wait(600); { const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.click(r.x+r.width*.74,r.y+r.height*.26); } await wait(500); await tap('text=저장하고 완료하기'); await wait(1800);
  await cap('오늘의 Tea Tag','오늘 남긴 감각을 한 장에.\n한 줄은 여기서도 바로 고칠 수 있어요.'); await tap('text=Tea Tag 확인하기'); await wait(2000); await tap('.tagline'); await wait(700); await p.fill('#cmtEdit','비 오는 날, 숲길 같았던 세작'); await wait(600); await tap('#sheet .btn'); await wait(1800);

  await cap('기록 목록','스크롤하면 새로 보이는 찻방울이\n그때 번지고, 예시 기록엔 표시가 있어요.'); await ev(()=>go('canvas',{tab:'list'},{reset:true})); await wait(2200); await ev(()=>document.querySelector('#view').scrollBy({top:520,behavior:'smooth'})); await wait(2600); await ev(()=>document.querySelector('#view').scrollTo({top:0,behavior:'smooth'})); await wait(900);
  await cap('기간은 달력으로','하루 또는 며칠부터 며칠까지.\n기록한 날엔 점이 찍혀 있어요.'); await tap('.ficon[aria-label="기간"]'); await wait(2400); await ev(()=>closeSheet()); await wait(400);
  await cap('풍미 필터','고른 풍미가 모두 담긴 기록만.\n찻방울에 안 들어간 풍미도 찾을 수 있어요.'); await tap('.ficon[aria-label="풍미 필터"]'); await wait(600); await tap('#flSheet .fchip.flc >> text=Astringent'); await wait(500); await tap('#sheet .btn'); await wait(2400);

  await cap('상세 기록','말한 풍미는 모두 보이고,\n별점은 3점 만점, 찻방울을 누르면 다시 번져요.'); await tap('.ritem >> nth=0'); await wait(1800); await tap('#detCv1'); await wait(2200);
  await cap('저장한 뒤에도 고치기','연필 버튼으로 이름·별점·코멘트·\n사진·풍미·메모를 고칠 수 있어요.'); await tap('[aria-label="기록 수정"]'); await wait(1500); await ev(()=>document.querySelector('#sheet').scrollBy({top:420,behavior:'smooth'})); await wait(1500); await tap('#eFl .chip >> text=Fresh'); await wait(600); await tap('text=고친 내용 저장'); await wait(1800);
  await cap('위치 옮기기','옮길 때는 끌어서 움직일 수 있어요.'); await ev(()=>document.querySelector('[onclick^="openMoveSheet"]').scrollIntoView({block:'center'})); await wait(600); await tap('text=위치 옮기기'); await wait(1000); await slow('#pickCv',[.74,.26],[.4,.2],24); await wait(1000); await tap('#moveSave'); await wait(1600);

  await cap('My · 설정','알림 시간도 실제 기록 기준으로.\n대화 언어를 바꾸면 앱 전체가 영어로.'); await ev(()=>goTab('noti')); await wait(2000); await ev(()=>goTab('my')); await wait(1200); await tap('text=앱 설정'); await wait(800); await p.selectOption('#prefLang','en'); await wait(2800);
  await ev(()=>closeSheet()); await wait(600); await ev(()=>goTab('home')); await wait(2800); await ev(()=>goTab('canvas')); await wait(3500);
  await ev(()=>{ PREF.lang='ko'; savePref(); }); await p.reload(); await wait(1200);
  await cap('TEA CANVAS','차를 마실수록,\n나의 취향이 선명해져요.'); await wait(3000);

  const vid=await p.video().path(); await ctx.close(); await b.close();
  const mp4=path.join(OUT,'demo-final.mp4');
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-vf',`setpts=PTS/${SPEED},crop=820:1080:20:0`,'-an','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
  const dur=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',mp4]).toString().trim();
  console.log('완료:',mp4,(fs.statSync(mp4).size/1e6).toFixed(1)+'MB',(+dur).toFixed(1)+'초');
})();
