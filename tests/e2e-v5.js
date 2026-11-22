// TEA CANVAS v5 전체 흐름 자동 확인
// 사용법: node tests/e2e-v5.js [스크린샷 폴더]
// 홈 → 채팅(차 이름 · 가이드 · 우림 · 이야기 · 색 · 향 · 맛 · 질문 · 조금 더 남기기) → 분석 → 비교 → 캔버스에 찍기 → 저장
// → 캔버스 · 상세 · 기록 목록(풍미 필터) · 음성 탭 · 그만하기/이어하기 를 차례로 눌러 보고, 오류와 결과를 확인한다.
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v5.html');
const OUT=process.argv[2]||null; if(OUT) fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(cond,msg)=>{ console.log((cond?'  ✓ ':'  ✗ ')+msg); if(!cond) fails++; };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  let shot=0; const snap=async name=>{ if(OUT){ await p.waitForTimeout(400); await p.screenshot({path:path.join(OUT,`${String(++shot).padStart(2,'0')}_${name}.png`)}); } };
  const ev=f=>p.evaluate(f); const wait=ms=>p.waitForTimeout(ms);
  const say=async t=>{ await p.fill('#chatIn',t); await ev(()=>sendInput()); await wait(1300); };
  const chip=async t=>{ await p.click(`#msgs .chip >> text=${t}`); await wait(1200); };
  const drag=async(sel,t)=>{ const r=await (await p.$(sel)).boundingBox(); await p.mouse.move(r.x+r.width*.3,r.y+r.height/2); await p.mouse.down(); await p.mouse.move(r.x+r.width*t,r.y+r.height/2,{steps:5}); await p.mouse.up(); await wait(200); };

  await p.goto(FILE); await wait(800);
  await ev(()=>{ localStorage.clear(); }); await p.reload(); await wait(800);
  console.log('홈'); ok(await ev(()=>cur()==='home'),'홈 화면'); await snap('home');

  console.log('채팅: 차 정보 · 가이드');
  await p.click('.bigbtn'); await wait(500);
  ok(await ev(()=>cur()==='chat'&&S.draft.stage==='tea'),'새 기록 → 채팅에서 차 이름을 물음');
  await say('오설록 제주 세작');
  ok(await ev(()=>S.draft.name==='제주 세작'&&S.draft.brand==='오설록'&&S.draft.type==='green'),'이름·브랜드·종류를 나눠 읽음');
  await chip('맞아요'); ok(await ev(()=>S.draft.stage==='guide'),'우림 가이드 카드'); await snap('guide');
  await chip('우림 시작'); ok(await ev(()=>!!S.timer&&S.draft.stage==='wait'),'우림 시작 → 타이머');

  console.log('채팅: 우리는 동안 이야기 · 질문 · 색');
  await wait(2500); ok(await ev(()=>S.draft.chat.some(m=>m.sense)),'우리는 동안 감각을 깨우는 말');
  await p.waitForFunction(()=>S.draft.talkPending==='mood',null,{timeout:15000}).catch(()=>{}); ok(await ev(()=>S.draft.talkPending==='mood'),'기분을 물음');
  await say('조금 피곤했는데 차 마시니까 좋아요'); await wait(2000);
  await say('물 온도는 몇 도가 좋아요?');
  ok(await ev(()=>/70/.test(S.draft.chat[S.draft.chat.length-1].text)),'질문에는 차에 맞춘 대답(정해진 대답)');
  await chip('건너뛸게요'); await p.waitForFunction(()=>S.draft.talkPending==='why',null,{timeout:15000}).catch(()=>{});
  await say('비 오는 날이라 따뜻한 차가 생각났어요');
  ok(await ev(()=>S.draft.talk&&S.draft.talk.mood&&S.draft.talk.why&&!S.draft.talk.scene),'이야기 저장(건너뛴 건 비움)');
  await ev(()=>{ S.timer.left=S.timer.total-60; }); await wait(2300);
  ok(await ev(()=>S.draft.stage==='color'),'1분 뒤 찻물 색을 물음'); await snap('color');
  ok(await ev(()=>!document.querySelector('#askSend').hidden&&/초록/.test(document.querySelector('#askW .tc-cup b').textContent)),'녹차에 맞는 색이 미리 골라져 있음');
  await drag('#tcH',.32); await drag('#tcD',.5); await p.click('#askSend'); await wait(1300);
  ok(await ev(()=>!!S.draft.feel.color&&!!S.draft.feel.colorHex),'슬라이드로 색 대답');

  console.log('채팅: 향 · 맛 · 자유 대화 · 조금 더 남기기');
  await chip('벌써 다 우렸어요'); await wait(2500); ok(await ev(()=>S.draft.stage==='aroma'),'다 우리면 향을 물음');
  ok(await ev(()=>!!S.draft.drinkAt&&!!document.querySelector('[data-drink]')),'다 우린 뒤 마신 시간 표시');
  await ev(()=>{ S.draft.drinkAt-=7*60000; }); await wait(5500);
  ok(await ev(()=>document.querySelector('[data-drink]').textContent==='마신 지 7분째'),'마신 지 7분째');
  await say('비 온 뒤 숲길 같은 향이에요');
  await chip('잘 모르겠어요'); await p.click('#askW .chip >> text=단맛'); await p.click('#askW .chip >> text=고소함'); await p.click('#askW .feelnext'); await wait(1300);
  ok(await ev(()=>S.draft.feel.taste==='단맛, 고소함'),'모르겠을 때만 보기 → 여러 개 고르기');
  await say('끝에 꿀 같은 단맛이 남아요'); await say('목 넘김이 부드러워요');
  ok(await ev(()=>S.draft.stage==='free'&&S.draft.chat.slice(-2).every(m=>m.who==='me'&&m.kept)),'자유 대화 중엔 끼어들지 않고 담기만');
  await ev(()=>{ S.draft.drinkAt-=60000; S.draft.lastMeAt=Date.now()-76000; }); await wait(10500);
  ok(await ev(()=>S.draft.nudged&&S.draft.stage==='free'),'오래 조용하면 한 번만 부드럽게 말 걸기');
  await p.click('.chatfoot .btn >> text=이제 충분해요'); await wait(1300); ok(await ev(()=>S.draft.stage==='after'),'이제 충분해요 → 여운 질문');
  await say('식으니까 더 달아요');
  ok(await ev(()=>S.draft.stage==='more'),'조금 더 남겨볼까요? 메뉴'); await snap('more');
  await chip('우림 변화'); await chip('2차'); await chip('단맛이 늘었어요'); await chip('더 짧게');
  ok(await ev(()=>S.draft.deep.brews[2]&&S.draft.deep.brews[2].next==='더 짧게'),'우림 변화 저장');
  const ex=await ev(()=>collectExprs(S.draft).map(e=>e.text));
  ok(!ex.some(t=>/오설록|맞아요|피곤|온도는|비 오는 날이라|주황|노랑/.test(t)),'분석에는 맛·향 표현만 (차 이름·이야기·질문·찻물 색 제외)');

  console.log('분석 · 비교 · 캔버스에 찍기 · 저장');
  await chip('이제 정리할게요'); await wait(2500); await snap('analyzing'); await wait(8000);
  ok(await ev(()=>cur()==='compare'),'분석 → 비교 화면');
  await ev(()=>openCanvasSheet()); await wait(800);
  const r=await (await p.$('#pickCv')).boundingBox(); await p.mouse.move(r.x+r.width*.7,r.y+r.height*.3); await p.mouse.down(); await wait(800); await p.mouse.up(); await snap('pick');
  await ev(()=>saveRecord()); await wait(1500); ok(await ev(()=>cur()==='done'),'저장 → 완료 화면');
  const rec=await ev(()=>S.records[0]);
  ok(rec.flavors.length>=3&&rec.teaColor&&rec.talk&&rec.talk.mood,'기록에 풍미 · 찻물 색 · 이야기 저장');
  ok(rec.drinkMin>=7,'기록에 마신 시간 저장 ('+rec.drinkMin+'분)');
  ok(!(rec.memo||[]).some(m=>/맞아요|우림 시작/.test(m)),'MEMO에 버튼 대답이 섞이지 않음');

  console.log('캔버스 · 상세 · 기록 목록');
  await ev(()=>goTab('canvas')); await wait(6000); await snap('canvas');
  ok(await ev(()=>!!document.querySelector('#bigCv')&&!!document.querySelector('#favCv')),'캔버스 + 나의 취향 찻방울');
  await ev(()=>openDetail(S.records[0].id)); await wait(1500); await snap('detail');
  ok(await ev(()=>/그날의 이야기/.test(document.body.innerText)&&/찻물 색/.test(document.body.innerText)&&/마신 시간/.test(document.body.innerText)),'상세: 그날의 이야기 · 찻물 색 · 마신 시간');
  await ev(()=>go('canvas',{tab:'list'},{reset:true})); await wait(600);
  await p.click('.ficon[aria-label="풍미 필터"]'); await wait(400); await p.click('#flSheet .fchip.flc >> text=Floral'); await wait(300); await p.click('#sheet .btn'); await wait(500);
  ok(await ev(()=>!!document.querySelector('.achip')),'고른 풍미가 검색창 아래 칩으로');
  ok(await ev(()=>filtered().every(r=>(r.flavors||[]).some(f=>f.k==='floral'))),'풍미 필터(Floral)');
  await p.click('.ficon[aria-label="기간"]'); await wait(400); await ev(()=>{ S.cal.y=2020; S.cal.m=0; calPaint(); }); await p.click('.cal-g button >> text=/^1$/'); await p.click('.cal-g button >> text=/^2$/'); await p.click('#calGo'); await wait(500);
  ok(await ev(()=>S.filter.date==='range'&&!filtered().length),'달력으로 기간 정하기'); await ev(()=>{ S.filter.date='all'; rerender(); }); await wait(300);

  console.log('음성 · 그만하기/이어하기');
  await ev(()=>{ startRecord(); }); await say('철관음'); await chip('맞아요'); await chip('바로 마실게요');
  await p.click('#sendBtn'); await wait(1500); await snap('voice');
  ok(await ev(()=>!!document.querySelector('.chatfoot.voicing #vwash')),'마이크 → 음성 패널 수채 번짐');
  await p.click('.vstop'); await wait(400);
  await p.click('.stepbar .quit'); await wait(400); await p.click('text=저장하고 나가기'); await wait(800);
  ok(await ev(()=>cur()==='home'&&!!document.querySelector('.resume')),'저장하고 나가기 → 홈에 이어하기');
  await p.click('.resume>button:first-child'); await wait(800);
  ok(await ev(()=>cur()==='chat'&&S.draft.name==='철관음'),'이어하기 → 멈춘 곳으로');

  console.log(errs.length?'\n오류:\n'+errs.join('\n'):'\n화면 오류 없음');
  console.log(fails||errs.length?`\n실패 ${fails}개`:'\n모두 통과');
  await b.close(); process.exit(fails||errs.length?1:0);
})();
