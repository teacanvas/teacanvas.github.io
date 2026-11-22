// 사용자 테스트 재생 녹화: 에이전트가 남긴 동작 기록(JSON)을 순서대로 다시 실행하며, 누르는 곳(빨간 점)과 속마음 자막을 얹어 영상으로 만든다
// 사용법: node tools/replay-session.js <actions.json> <out.mp4>
// actions.json = { "persona": "이름 · 한 줄 소개", "steps": [ { "do": "...", ..., "say": "그때의 생각" }, ... ] }
//   do: "tap"     { target }                         화면의 요소를 누른다 (target = Playwright 선택자, 예: "text=새로운 차 기록하기")
//       "type"    { target, text, enter?:true }      입력칸에 글자를 친다(enter면 Enter까지)
//       "tapRel"  { target, rx, ry }                 요소 안의 비율 위치를 누른다(캔버스 등)
//       "drag"    { target, from:[rx,ry], to:[rx,ry] }
//       "scroll"  { dy }                             화면을 위아래로 민다(+ 아래로)
//       "back"    {}                                 휴대폰 뒤로가기
//       "reopen"  {}                                 앱을 닫았다가 다시 연다
//       "upload"  { menu, file }                     사진 고르기 창에서 menu(예: "앨범에서 고르기")를 누르고 file을 고른다
//       "wait"    { ms }
//   say: 이 동작을 할 때의 속마음(자막). 비워도 된다
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const {execFileSync}=require('child_process');
const [,,IN,OUTP]=process.argv; if(!IN||!OUTP){ console.error('사용법: node tools/replay-session.js <actions.json> <out.mp4>'); process.exit(1); }
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'TEA_CANVAS_prototype_v6.html');
const log=JSON.parse(fs.readFileSync(IN,'utf8')); const W=1200,H=1080, TMP=path.join(require('os').tmpdir(),'tc-replay-'+Date.now()); fs.mkdirSync(TMP,{recursive:true});
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:W,height:H},recordVideo:{dir:TMP,size:{width:W,height:H}}});
  await ctx.addInitScript(([persona])=>{
    try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){}
    addEventListener('DOMContentLoaded',()=>{
      const st=document.createElement('style'); st.textContent=`
        #rpCap{position:fixed;left:40px;top:50%;transform:translateY(-50%);width:330px;z-index:9999;font-family:Pretendard,sans-serif;pointer-events:none}
        #rpCap .who{font-size:15px;color:#8A8A8A;font-weight:700;margin-bottom:14px;line-height:1.5}
        #rpCap .n{font-size:13px;color:#B0B0B0;font-weight:700;letter-spacing:.06em}
        #rpCap .say{font-size:24px;line-height:1.45;color:#111;font-weight:700;margin-top:6px;white-space:pre-line}
        #rpDot{position:fixed;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;background:rgba(214,69,61,.3);border:2px solid rgba(214,69,61,.9);z-index:10000;pointer-events:none;transition:transform .15s,opacity .4s;opacity:0}
        #rpDot.on{opacity:1}#rpDot.tap{transform:scale(.6)}`;
      document.head.appendChild(st);
      const c=document.createElement('div'); c.id='rpCap'; c.innerHTML=`<div class="who">${persona}</div><div class="n"></div><div class="say"></div>`; document.body.appendChild(c);
      const d=document.createElement('div'); d.id='rpDot'; document.body.appendChild(d);
      addEventListener('mousemove',e=>{ d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; d.classList.add('on'); clearTimeout(d._t); d._t=setTimeout(()=>d.classList.remove('on'),1400); },true);
      addEventListener('mousedown',()=>d.classList.add('tap'),true); addEventListener('mouseup',()=>d.classList.remove('tap'),true);
    });
  },[String(log.persona||'처음 쓰는 사용자')]);
  const p=await ctx.newPage(); const wait=ms=>p.waitForTimeout(ms);
  const say=async(i,t)=>{ await p.evaluate(([i,t])=>{ const c=document.getElementById('rpCap'); if(!c) return; c.querySelector('.n').textContent=t?'STEP '+i:''; c.querySelector('.say').textContent=t||''; },[i,t||'']); };
  const box=async sel=>{ const el=p.locator(sel).first(); await el.waitFor({state:'visible',timeout:15000}); await el.scrollIntoViewIfNeeded(); await wait(250); return el.boundingBox(); };
  const click=async(x,y)=>{ await p.mouse.move(x,y,{steps:14}); await wait(220); await p.mouse.down(); await wait(90); await p.mouse.up(); };
  await p.goto(APP); await wait(1500);
  const fails=[];
  for(let i=0;i<log.steps.length;i++){ const s=log.steps[i], n=i+1;
    try{
      await say(n,s.say); await wait(s.say?Math.min(2600,700+s.say.length*45):300);
      if(s.do==='tap'){ const r=await box(s.target); await click(r.x+r.width/2,r.y+r.height/2); }
      else if(s.do==='type'){ const r=await box(s.target); await click(r.x+r.width/2,r.y+r.height/2); await p.keyboard.type(String(s.text||''),{delay:70}); if(s.enter) { await wait(300); await p.keyboard.press('Enter'); } }
      else if(s.do==='tapRel'){ const r=await box(s.target); await click(r.x+r.width*s.rx,r.y+r.height*s.ry); }
      else if(s.do==='drag'){ const r=await box(s.target); await p.mouse.move(r.x+r.width*s.from[0],r.y+r.height*s.from[1],{steps:10}); await p.mouse.down(); await p.mouse.move(r.x+r.width*s.to[0],r.y+r.height*s.to[1],{steps:24}); await p.mouse.up(); }
      else if(s.do==='scroll'){ await p.evaluate(dy=>{ const v=document.querySelector('#view'); const sh=document.querySelector('#sheetWrap.open .sheet'); (sh||v).scrollBy({top:dy,behavior:'smooth'}); },s.dy||400); }
      else if(s.do==='back'){ await p.goBack(); }
      else if(s.do==='reopen'){ await p.reload(); }
      else if(s.do==='upload'){ const fc=p.waitForEvent('filechooser'); const r=await box('text='+s.menu); await click(r.x+r.width/2,r.y+r.height/2); await (await fc).setFiles(path.resolve(ROOT,s.file)); }
      else if(s.do==='wait'){ await wait(s.ms||1000); }
      await wait(s.after||1400);
    }catch(e){ fails.push(`STEP ${n} (${s.do} ${s.target||''}): ${String(e.message).split('\n')[0]}`); }
  }
  await say(0,''); await wait(1500);
  const vid=await p.video().path(); await ctx.close(); await b.close();
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-vf','crop=820:1080:20:0','-an','-c:v','libx264','-preset','medium','-crf','28','-pix_fmt','yuv420p','-movflags','+faststart',OUTP]);
  const dur=execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',OUTP]).toString().trim();
  console.log('완료:',OUTP,(+dur).toFixed(1)+'초', fails.length?'\n실패한 단계:\n'+fails.join('\n'):'(모든 단계 성공)');
})();
