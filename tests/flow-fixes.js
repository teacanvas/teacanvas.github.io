// 사용자 테스트 10명에게서 나온 문제 회귀 확인 (가짜 AI): 한 번에 여러 칸 → 건너뛰기, 우리는 중 잡담은 색이 아님,
// 슬라이더 요청, AI가 종류를 안 줘도 알아듣기, 확인하며 '이미 우려놨어', 여운 뒤 작별 인사 → 정리, '잘 모르겠어요' 버튼 없음,
// '달콤하게 나요'는 질문 아님, 연한 갈색.  사용법: node tests/flow-fixes.js
const {chromium}=require('playwright'); const path=require('path');
const FILE='file://'+path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'), EP='https://ai.test/';
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const R={};   // 말 → 가짜 AI 응답
  await p.addInitScript(ep=>{ window.TC_AI_ENDPOINT=ep; },EP);
  await p.route(EP,async r=>{ const q=JSON.parse(r.request().postData()||'{}'); const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});
    if(q.mode==='flow'){ if(q.event!=='message') return J({reply:`(AI:${q.event})`,fill:{}}); const k=Object.keys(R).find(k=>q.message.includes(k)); return J(Object.assign({reply:'음, 그렇군요.',fill:{}},k?R[k](q):{})); }
    if(q.mode==='chat') return J({reply:'네',finish:false});
    return r.fulfill({status:404,body:'{}'}); });
  await p.goto(FILE); await p.waitForTimeout(600);
  const say=async t=>{ await p.fill('#chatIn',t); await p.evaluate(()=>sendInput()); await p.waitForTimeout(1100); };
  const st=()=>p.evaluate(()=>S.draft&&S.draft.stage), E=f=>p.evaluate(f);
  await E(()=>startRecord()); await p.waitForTimeout(300);

  R['달빛']=()=>({reply:'‘달빛 걷기’는 녹차 블렌드예요. 녹차로 기록할까요?',fill:{name:'달빛 걷기',brand:'오설록',type:'green'}});
  await say('오설록 달빛 걷기'); ok((await st())==='teaOK','차 찾기 → 종류 확인');
  R['우려놨어']=()=>({reply:'좋아요, 그럼 찻물 색부터 볼까요?',fill:{type:'green'},action:'drink_now'});
  await say('응 맞아. 근데 이미 우려놨어'); ok((await st())==='color'&&await E(()=>S.draft.type==='green'&&!S.timer&&!!document.querySelector('#askW.tc')),'"응 맞아, 근데 이미 우려놨어" → 종류 확인 + 바로 색(슬라이더)');
  ok(await E(()=>!/잘 모르겠어요/.test(document.querySelector('#askW').textContent)),'AI 대화의 색 슬라이더에 "잘 모르겠어요" 버튼 없음');
  R['연두색']=()=>({reply:'맑은 연두색이군요. 향은 어때요?',fill:{color:'맑은 연두색',tone:'연한 연두',aroma:'풀향',taste:'단맛'},sense:true});
  await say('맑은 연두색이고 풀향에 단맛이 나'); ok((await st())==='free'&&await E(()=>!!S.draft.feel.colorHex&&S.draft.feel.aroma==='풀향'&&S.draft.feel.taste==='단맛'),'한 번에 색·향·맛을 말하면 다 기록하고 자유 대화로 (중간에 멈추지 않음)');
  ok(await E(()=>!looksQuestion('배 향이 달콤하게 나요')&&looksQuestion('이거 몇 번 우려도 되나요')),'"달콤하게 나요"는 질문이 아님, "되나요"는 질문');
  ok(await E(()=>{ const a=colorFromWords('연한 갈색'), c=colorFromWords('진한 갈색'); return a&&c&&a[1]<c[1]; }),'"연한 갈색"은 "진한 갈색"보다 연하게');
  R['다 마셨']=()=>({reply:'잘 마셨어요. 끝에 남는 여운은 어땠어요?',fill:{},finish:true});
  await say('다 마셨어'); ok((await st())==='after','다 마셨다 → 여운 묻기');
  R['꿀 같은']=()=>({reply:'꿀 같은 여운까지 담았어요. 오늘 함께해서 즐거웠어요.',fill:{after:'꿀 같은 단맛이 남아'},end:true});
  await say('꿀 같은 단맛이 오래 남아'); ok(await E(()=>S.draft.afterText==='꿀 같은 단맛이 남아'),'여운 기록');
  await p.waitForTimeout(3000); ok(await E(()=>S.draft&&S.draft.stage==='done'||cur()!=='chat'),'여운 뒤 AI가 마무리(close)하면 기록 정리로 (멈추지 않음)');

  // 우리는 중: 잡담 속 색 단어는 찻물 색이 아님 / 슬라이더 요청
  await E(()=>{ try{ localStorage.clear(); }catch(e){} }); await p.reload(); await p.waitForTimeout(600); await E(()=>startRecord()); await p.waitForTimeout(300);
  await say('오설록 달빛 걷기'); R['녹차야']=()=>({reply:'녹차로 기록할게요.',fill:{type:'green'},step:'confirm_tea'}); await say('녹차야');
  ok((await st())==='guide','"녹차야" → AI가 종류를 정하면 가이드로');
  await E(()=>beginBrew(true)); await p.waitForTimeout(300);
  R['치즈냥']=()=>({reply:'귀여운 고양이네요!',fill:{scene:'고양이와 함께'}});
  await say('우리 집 노란 치즈냥이가 옆에 있어'); ok(await E(()=>!S.draft.feel.color&&S.draft.stage==='wait'),'우리는 중 "노란 치즈냥이"는 찻물 색으로 기록하지 않음');
  R['슬라이더']=()=>({reply:'좋아요, 슬라이더로 골라 주세요.',fill:{},action:'ask_color'}); await say('색 슬라이더로 고를래'); ok((await st())==='color'&&await E(()=>!!document.querySelector('#askW.tc')),'"슬라이더로 고를래" → 색 슬라이더');
  // 개완: 글자가 아니라 Gemini의 step으로 / 향 단계에서도 슬라이더 다시
  await E(()=>{ try{ localStorage.clear(); }catch(e){} }); await p.reload(); await p.waitForTimeout(600); await E(()=>startRecord()); await p.waitForTimeout(300);
  R['달빛']=()=>({reply:'녹차로 기록할게요.',fill:{name:'달빛 걷기',type:'green'},step:'confirm_tea'}); await say('오설록 달빛 걷기');
  R['개완이 뭐']=()=>({reply:'개완은 뚜껑 있는 찻잔이에요.',fill:{},step:'stay'}); await say('개완이 뭐야?');
  ok(await E(()=>S.draft.stage==='guide'&&!S.draft.gongfu),'"개완이 뭐야?"는 설명만 (개완 가이드로 바꾸지 않음)');
  R['개완으로']=()=>({reply:'개완 가이드를 보여드릴게요.',fill:{},step:'guide_gongfu'}); await say('개완으로 우릴래');
  ok(await E(()=>S.draft.gongfu===true),'step guide_gongfu → 개완 가이드');
  R['머그컵']=()=>({reply:'그럼 기본 방법으로 보여드릴게요.',fill:{},step:'guide_basic'}); await say('그런 찻잔 없어 머그컵에 할게');
  ok(await E(()=>S.draft.gongfu===false&&S.draft.stage==='guide'),'step guide_basic → 기본 가이드');
  await E(()=>{ beginBrew(true); S.timer.left=0; S.draft.stage='aroma'; S.draft.feel.color='연두'; }); await p.waitForTimeout(200);
  R['슬라이더 다시']=()=>({reply:'슬라이더를 다시 보여드릴게요.',fill:{},step:'show_color',action:'ask_color'}); await say('색 슬라이더 다시 보내줘');
  ok(await E(()=>S.draft.stage==='color'&&!!document.querySelector('#askW.tc')),'향 단계에서도 "슬라이더 다시" → 색 슬라이더');
  // AI가 안 될 때(정해진 대화): 색이 아닌 말을 색으로 저장하지 않음
  ok(await E(()=>{ S.draft.feel.color=''; sendMsg('아니 개완 말고 그냥 티백으로 우릴거야',false,true); return S.draft.stage==='color'&&!S.draft.feel.color; }),'정해진 대화: 색이 아닌 말은 색으로 저장하지 않고 다시 물음');
  await p.waitForTimeout(800);
  // Gemini가 앱에 요청: 가이드 다시 / 기록 지우고 다시
  await E(()=>{ const d=S.draft; d.stage='free'; d.feel.color='연두'; d.feel.aroma='꽃향'; d.feel.taste='단맛'; S.timer={total:120,left:0,running:false}; });
  R['가이드 다시']=()=>({reply:'우림 가이드를 다시 보여드릴게요.',fill:{},step:'stay',requests:['show_guide']}); await say('가이드 다시 보여줘');
  ok(await E(()=>S.draft.stage==='free'&&S.draft.chat[S.draft.chat.length-1].guide===true),'requests show_guide → 가이드 카드를 다시 (단계는 그대로)');
  R['맛 표현 지워']=()=>({reply:'맛 기록을 지웠어요. 다시 맛을 말해 주세요.',fill:{},step:'stay',clear:['taste']}); await say('아까 맛 표현 지워줘');
  ok(await E(()=>S.draft.stage==='taste'&&!S.draft.feel.taste&&S.draft.feel.aroma==='꽃향'),'clear taste → 맛만 지우고 맛 단계로 돌아가 다시 물음');
  R['쌉싸름']=()=>({reply:'쌉싸름한 맛으로 담았어요.',fill:{taste:'쌉싸름한 맛'},step:'stay'}); await say('쌉싸름한 맛이야');
  ok(await E(()=>S.draft.stage==='free'&&S.draft.feel.taste==='쌉싸름한 맛'),'다시 말하면 기록하고 원래 자리(자유 대화)로');
  ok(await E(()=>{ liveTool({requests:['show_color']}); return S.draft.stage==='color'; }),'음성도 requests show_color → 색 슬라이더');
  // 실시간 음성: 같은 판단(update_record의 record·unknown·step)이 같은 함수로 적용되는지
  await E(()=>{ S.draft.stage='wait'; S.draft.feel={}; S.timer={total:120,left:60,running:true}; });
  ok(await E(()=>{ liveTool({step:'show_color'}); return S.draft.stage==='color'; }),'음성: step show_color → 색 단계(슬라이더)');
  ok(await E(()=>{ liveTool({aroma:'잘 모르겠어',unknown:['aroma']}); return !S.draft.feel.aroma; }),'음성: 모른다고 한 칸(unknown)은 기록하지 않음');
  ok(await E(()=>{ S.timer.left=0; liveTool({color:'연한 연두',tone:'연한 연두',aroma:'꽃향',taste:'단맛'}); return S.draft.stage==='free'&&S.draft.feel.taste==='단맛'; }),'음성: 한 번에 색·향·맛 → 자유 대화로');
  ok(await E(()=>{ liveTool({step:'finished_drinking'}); return S.draft.stage==='after'; }),'음성: step finished_drinking → 여운');
  ok(await E(()=>{ liveTool({after:'꿀 같은 여운',step:'close'}); return S.draft.stage==='done'&&S.draft.afterText==='꿀 같은 여운'; }),'음성: 여운 + step close → 기록 정리');
  ok(!errs.length,'페이지 오류 없음'+(errs.length?': '+errs.join(' | '):''));
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
