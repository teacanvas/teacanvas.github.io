// TEA CANVAS v5 데모 영상 만들기: 처음부터 끝까지 쓰는 모습 + 사용자가 만날 수 있는 여러 화면을 자막과 함께 녹화
// 사용법: node tools/demo-video.js  → exhibit/demo-v5.mp4
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const {execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'TEA_CANVAS_prototype_v5.html'), OUT=path.join(ROOT,'exhibit');
const W=1200,H=1080, TMP=path.join(require('os').tmpdir(),'tc-demo-'+Date.now()); fs.mkdirSync(TMP,{recursive:true});

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:W,height:H},recordVideo:{dir:TMP,size:{width:W,height:H}}});
  // 매 페이지마다: 자막 상자 + 누르는 위치를 보여주는 점
  await ctx.addInitScript(()=>{
    window.TC_VOICE_FAST=false; try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){}
    addEventListener('DOMContentLoaded',()=>{
      const st=document.createElement('style'); st.textContent=`
        #demoCap{position:fixed;left:44px;top:50%;transform:translateY(-50%);width:330px;z-index:9999;font-family:Pretendard,sans-serif;pointer-events:none}
        #demoCap .n{font-size:15px;color:#9A9A9A;font-weight:700;letter-spacing:.06em}
        #demoCap h3{font-size:30px;line-height:1.3;margin:8px 0 10px;color:#111;font-weight:800;letter-spacing:-.02em}
        #demoCap p{font-size:18px;line-height:1.6;color:#555;white-space:pre-line}
        #demoDot{position:fixed;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(214,69,61,.35);border:2px solid rgba(214,69,61,.85);z-index:10000;pointer-events:none;transition:transform .15s,opacity .4s;opacity:0}
        #demoDot.on{opacity:1}#demoDot.tap{transform:scale(.6)}`;
      document.head.appendChild(st);
      const c=document.createElement('div'); c.id='demoCap'; document.body.appendChild(c);
      const d=document.createElement('div'); d.id='demoDot'; document.body.appendChild(d);
      addEventListener('mousemove',e=>{ d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; d.classList.add('on'); clearTimeout(d._t); d._t=setTimeout(()=>d.classList.remove('on'),1600); },true);
      addEventListener('mousedown',()=>d.classList.add('tap'),true); addEventListener('mouseup',()=>d.classList.remove('tap'),true);
    });
  });
  const p=await ctx.newPage(); let n=0;
  const cap=async(title,desc='')=>{ n++; await p.evaluate(([n,t,d])=>{ const c=document.getElementById('demoCap'); if(c) c.innerHTML=`<div class="n">${String(n).padStart(2,'0')}</div><h3>${t}</h3><p>${d}</p>`; },[n,title,desc]); };
  const wait=ms=>p.waitForTimeout(ms);
  const tap=async sel=>{ const el=await p.waitForSelector(sel,{state:'visible',timeout:15000}); const r=await el.boundingBox(); await p.mouse.move(r.x+r.width/2,r.y+r.height/2,{steps:12}); await wait(250); await p.mouse.down(); await wait(90); await p.mouse.up(); await wait(500); };
  const type=async t=>{ await tap('#chatIn'); await p.keyboard.type(t,{delay:55}); await wait(300); await p.keyboard.press('Enter'); await wait(1400); };
  const ev=f=>p.evaluate(f);

  await p.goto(APP); await ev(()=>{ try{ localStorage.clear(); }catch(e){} }); await p.reload(); await wait(800);
  await cap('홈','풍미 색이 하나씩 수채로 번지며\n이름이 흐림에서 또렷하게 나타나요.'); await wait(6500);

  await cap('기록 시작','‘새로운 티 기록하기’를 누르면\n바로 채팅이 열려요.'); await tap('.bigbtn'); await wait(1800);
  await cap('처음 보는 차','사전에 없는 이름이면\n가까운 차 종류를 물어봐요.'); await type('할머니가 주신 차'); await wait(1200); await tap('#msgs .chip >> text=우롱차'); await wait(2200);
  await cap('우림 가이드','차에 맞는 온도 · 시간 · 양을 카드로 보여줘요.\n‘우림 시작’을 누르면 타이머가 위에 고정돼요.'); await wait(2500);
  await tap('#msgs .chip >> text=우림 시작'); await wait(1500);
  await cap('우리는 동안','손끝의 온기, 찻잎이 펴지는 모습처럼\n감각을 깨우는 말과 가벼운 이야기를 건네요.'); await p.waitForFunction(()=>S.draft.talkPending==='mood',null,{timeout:30000}); await wait(800);
  await type('조금 피곤했는데 차 냄새 맡으니 좋아요');
  await cap('궁금한 건 바로','마시다 궁금한 걸 물으면 대답해요.\n(AI가 연결되면 AI가, 아니면 준비된 대답)'); await type('물 온도는 몇 도가 좋아요?'); await wait(1500);
  await cap('건너뛰기','대답하기 싫은 질문은 넘겨도 돼요.'); await tap('#msgs .chip >> text=건너뛸게요'); await p.waitForFunction(()=>S.draft.talkPending==='why',null,{timeout:30000}); await wait(600);
  await type('비 오는 날이라 따뜻한 차가 생각났어요');
  await cap('1분 뒤, 찻물 색','차 종류에 맞는 색이 미리 골라져 있어요.\n색 계열 · 진하기 두 슬라이드로 맞춰요.'); await ev(()=>{ S.timer.left=S.timer.total-60; }); await p.waitForSelector('#askW #tcD',{timeout:15000}); await wait(1500);
  { const r=await (await p.$('#tcD')).boundingBox(); await p.mouse.move(r.x+r.width*.5,r.y+r.height/2,{steps:10}); await p.mouse.down(); await p.mouse.move(r.x+r.width*.66,r.y+r.height/2,{steps:14}); await p.mouse.up(); await wait(700); }
  await tap('#askSend'); await wait(1500);
  await cap('다 우렸어요','타이머를 기다리지 않아도 돼요.'); await tap('#msgs .chip >> text=벌써 다 우렸어요'); await wait(2600);
  await cap('첫 향은 내 말로','정해진 보기 대신 떠오르는 대로.\n비유도 맛 · 향으로 읽어요.'); await type('비 온 뒤 숲길 같은 향이 은은하게 나요');
  await cap('모르겠을 때만 보기','‘잘 모르겠어요’를 누르면\n그때 보기를 꺼내줘요.'); await tap('#msgs .chip >> text=잘 모르겠어요'); await wait(1800);
  await tap('#askW .chip >> text=단맛'); await tap('#askW .chip >> text=고소함'); await tap('#askW .feelnext'); await wait(2400);
  await cap('마시며 자유롭게','챗봇은 끼어들지 않고 담기만 해요.\n어떤 풍미로 담겼는지 작게 보여줘요.'); await type('팬케이크 맛이 살짝 나'); await wait(600);
  await cap('고쳐 말하기','“A가 아니라 B”라고 하면\n앞 표현의 풍미를 고쳐요.'); await type('팬케이크의 스윗함이 아니라 소프트함이야'); await wait(1200);
  await cap('직접 고르기','‘바꾸기’를 눌러 풍미를 직접 골라도 돼요.'); await tap('.kept-btn >> nth=0'); await wait(900); await tap('.fl-edit .chip >> text=Sweet'); await wait(600); await tap('.fl-edit .feelnext'); await wait(900);
  await type('끝에 꿀 같은 단맛이 엄청 진하게 남아요');
  await cap('끝낼 때는 내가','‘이제 충분해요’를 눌러야\n여운을 묻고 정리로 넘어가요.'); await tap('#msgs .chip >> text=이제 충분해요'); await wait(2000); await type('여운이 꽤 길어요'); await wait(800);
  await cap('조금 더 남기기','우림 변화 · 산지 · 온도 · 메모를\n채팅에서 하나씩 남겨요.'); await tap('#msgs .chip >> text=우림 변화'); await tap('#msgs .chip >> text=2차'); await tap('#msgs .chip >> text=단맛이 늘었어요'); await tap('#msgs .chip >> text=더 짧게'); await wait(800);
  await cap('정리 (로딩)','남긴 표현이 하나씩 찻방울에 스며들어요.'); await tap('#msgs .chip >> text=이제 정리할게요'); await wait(9500);
  await cap('비교','내 표현과 전문가 설명을 나란히.\n(AI가 연결되면 AI가 정리)'); await wait(1800); await ev(()=>document.querySelector('#view').scrollBy({top:420,behavior:'smooth'})); await wait(2500);
  await cap('캔버스에 찍기','향 · 맛이 좋았는지에 따라 위치를 찍어요.'); await tap('text=캔버스에 찻방울 찍기'); await wait(1000);
  { const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.move(r.x+r.width*.72,r.y+r.height*.28,{steps:14}); await wait(200); await p.mouse.down(); await wait(150); await p.mouse.up(); await wait(1800); }
  await tap('text=저장하고 완료하기'); await wait(2200);
  await cap('완료','대화 기록과 Tea Tag를 볼 수 있어요.'); await wait(1500); await tap('text=Tea Tag 확인하기'); await wait(2500);
  await cap('나의 캔버스','모든 찻방울이 한꺼번에 번지고,\n아래에 나의 취향 찻방울과 추천 차.'); await ev(()=>goTab('canvas')); await wait(4500); await ev(()=>document.querySelector('#view').scrollBy({top:640,behavior:'smooth'})); await wait(3500);
  await cap('기록 목록 · 풍미 필터','오늘 플로럴한 차가 당길 때\n풍미로 지난 기록을 찾아요.'); await ev(()=>go('canvas',{tab:'list'},{reset:true})); await wait(1500); await tap('.fchip.flc >> text=Floral'); await wait(2000);
  await cap('상세 기록','사진 · 나만의 표현 · 찻물 색 ·\n그날의 이야기 · 마신 시간까지.'); await ev(()=>openDetail('s3')); await wait(2500); await ev(()=>document.querySelector('#view').scrollBy({top:600,behavior:'smooth'})); await wait(2500);

  await cap('기록이 부족할 때','아무 맛 · 향도 남기지 않고 정리하면\n‘아직 담을 맛과 향이 없어요’.'); await ev(()=>startRecord()); await wait(600); await type('철관음'); await tap('#msgs .chip >> text=맞아요'); await tap('#msgs .chip >> text=바로 마실게요'); await wait(800); await tap('text=기록 마치고 정리하기'); await wait(3200);
  await cap('그만하기 · 이어하기','중간에 그만둘 때 저장해두면\n홈에서 이어할 수 있어요.'); await tap('text=채팅으로 돌아가 남기기'); await wait(800); await tap('.stepbar .quit'); await wait(800); await tap('text=저장하고 나가기'); await wait(2200); await tap('.resume>button:first-child'); await wait(2200);
  await cap('음성으로만','한 번 누르면 말로 계속 대화해요.\n(마이크가 없으면 시연용 목소리)'); await ev(()=>setMode('voice')); await wait(800); await tap('#vBtn'); await wait(14000); await tap('#vBtn'); await wait(800);
  await cap('오류 화면','문제가 생기면 다시 시도 · 홈으로.'); await ev(()=>{ setMode('chat'); go('detail',{id:'없는기록'}); }); await wait(3000);
  await cap('빈 캔버스','첫 기록 전에는 이렇게 보여요.'); await ev(()=>{ S.records=[]; goTab('canvas'); }); await wait(3500);
  await cap('찻방울이 많을 때','48잔이 쌓인 캔버스.'); await p.goto(APP+'?sample=many'); await wait(700); await ev(()=>goTab('canvas')); await wait(4500); await ev(()=>document.querySelector('#view').scrollBy({top:640,behavior:'smooth'})); await wait(3500);
  await cap('끝','TEA CANVAS v5'); await ev(()=>goTab('home')); await wait(3500);

  const vid=await p.video().path(); await ctx.close(); await b.close();
  const mp4=path.join(OUT,'demo-v5.mp4');
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-vf','scale=1200:-2','-c:v','libx264','-preset','medium','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
  console.log('완료:',mp4,(fs.statSync(mp4).size/1e6).toFixed(1)+'MB');
})();
