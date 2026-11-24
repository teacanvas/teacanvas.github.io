// 사파리(WebKit) 화면 점검: 큰 화면(맥북·전시)과 아이폰 크기에서 모든 화면을 열어 보고
// 오류가 없는지, 아래에 붙어야 할 것(채팅 입력칸·버튼)이 제자리에 있는지 확인한다. 스크린샷은 tests/out/safari/
// 사용법: node tests/safari-check.js   (WebKit이 없으면: node <playwright>/cli.js install webkit && install-deps webkit)
const {webkit,devices}=require('playwright'); const path=require('path'), fs=require('fs');
const FILE='file://'+path.join(__dirname,'..',process.env.TC_FILE||'TEA_CANVAS_prototype_v6.html'), OUT=path.join(__dirname,'out','safari'); fs.mkdirSync(OUT,{recursive:true});
let fails=0; const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fails++; };
(async()=>{ const b=await webkit.launch();
  for(const [tag,opt] of [['맥북 1440×860',{viewport:{width:1440,height:860}}],['전시 1080×1920',{viewport:{width:1080,height:1920}}],['아이폰',{...devices['iPhone 14']}]]){
    console.log(tag); const ctx=await b.newContext(opt), p=await ctx.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(FILE); await p.waitForTimeout(800);
    // 채팅: 입력칸이 하단 탭 바로 위에, 마지막 내용이 입력칸에 가리지 않게
    await p.evaluate(()=>{ startRecord(); const d=S.draft; d.name='제주 세작'; d.brand='오설록'; d.type='green'; d.chat.push({who:'me',text:'오설록 제주 세작'},{who:'bot',text:'녹차로 기록할게요.'}); showGuide(); });
    await p.waitForTimeout(1800);
    const r=await p.evaluate(()=>{ const cf=document.querySelector('.chatfoot').getBoundingClientRect(), nav=document.querySelector('#nav').getBoundingClientRect(), last=[...document.querySelectorAll('#msgs > *')].pop().getBoundingClientRect(); return {gap:Math.round(nav.top-cf.bottom),cover:Math.round(last.bottom-cf.top)}; });
    ok(r.gap>=0&&r.gap<=24,`채팅 입력칸이 하단 탭 바로 위에 있음 (틈 ${r.gap}px)`); ok(r.cover<=2,`마지막 내용이 입력칸에 가리지 않음 (${r.cover}px)`);
    await p.screenshot({path:path.join(OUT,`${tag.split(' ')[0]}-chat.png`)});
    // 개발자 패널의 모든 화면
    const n=await p.evaluate(()=>JUMPS.length);
    for(let i=0;i<n;i++){ const name=await p.evaluate(i=>JUMPS[i][0],i); await p.evaluate(i=>{ try{ jump(i); }catch(e){ window.__jerr=e.message; } },i); await p.waitForTimeout(900);
      const bad=await p.evaluate(()=>{ const e=window.__jerr; window.__jerr=''; const w=document.documentElement.scrollWidth>innerWidth+1; return (e||'')+(w?' 가로로 넘침':''); });
      if(bad) ok(false,`${name}: ${bad}`); await p.screenshot({path:path.join(OUT,`${tag.split(' ')[0]}-${String(i).padStart(2,'0')}.png`)}); }
    ok(!errs.length,'페이지 오류 없음'+(errs.length?': '+errs.slice(0,3).join(' | '):'')); await ctx.close(); }
  await b.close(); console.log(fails?`\n실패 ${fails}개`:'\n모두 통과'); process.exit(fails?1:0); })();
