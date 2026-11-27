// 레이아웃 자동 점검: 모든 화면·시트를 여러 폰 크기에서 열고, 글자·버튼끼리 겹치거나 너무 붙은 곳, 화면 밖으로 잘린 곳을 찾는다
// node tests/layout-check.js [--shots]  → 문제 목록(없으면 "모두 통과"), --shots면 tests/out/layout/에 화면을 남긴다
const {chromium,devices}=require('playwright'); const path=require('path'), fs=require('fs');
const F='file://'+path.join(__dirname,'..',process.env.TC_FILE||'TEA_CANVAS_prototype_v6.html'), SHOTS=process.argv.includes('--shots'), OUT=path.join(__dirname,'out/layout');
const DEVS=[['SE',{...devices['iPhone SE'],viewport:{width:375,height:667}}],['i13',devices['iPhone 13']],['P7',devices['Pixel 7']],['낮은폰',{...devices['iPhone 13'],viewport:{width:390,height:600}}],['전시',{viewport:{width:1600,height:1000}}]];
const GAP=3;   // 이보다 가까우면 '붙음'
// 화면 만들기: [이름, 페이지 안에서 실행할 준비 코드]
const SCENES=[
  ['홈',()=>goTab('home')],
  ['채팅-이름',()=>{ startRecord(); }],
  ['채팅-가이드',()=>{ startRecord(); S.draft.name='제주 세작'; S.draft.type='green'; showGuide(); }],
  ['채팅-색',()=>{ jump(JUMPS.findIndex(j=>j[1]==='chat')); }],
  ['채팅-마시는중',()=>{ startRecord(); Object.assign(S.draft,{name:'제주 세작',type:'green',stage:'free',drinkAt:Date.now()}); S.draft.chat.push({who:'me',text:'꽃향이 은은해요',kept:true}); rerender(); }],
  ['채팅-음성',()=>{ startRecord(); Object.assign(S.draft,{name:'제주 세작',type:'green',stage:'free',drinkAt:Date.now()}); VOICE.on=true; rerender(); }],
  ['analyzing',()=>{ startRecord(); Object.assign(S.draft,{name:'제주 세작',type:'green'}); ['달콤한 과일 향','꽃향이 은은해요'].forEach(t=>S.draft.chat.push({who:'me',text:t,kept:true})); go('analyzing'); }],
  ...['organizing','thin','compare','@done','@fullChat','@teaTag','@cv','@list','@detail','my','noti','error'].map(k=>[k,new Function(`jump(JUMPS.findIndex(j=>j[1]===${JSON.stringify(k)}))`)]),
  ['시트-찍기',()=>{ jump(JUMPS.findIndex(j=>j[1]==='@canvas')); }],
  ['시트-읽는법',()=>{ openCanvasHelp(); }],
  ['시트-필터',()=>{ go('canvas',{tab:'list'},{reset:true}); openFlSheet(); }],
  ['시트-달력',()=>{ go('canvas',{tab:'list'},{reset:true}); typeof openDateSheet==='function'&&openDateSheet(); }],
  ['시트-기록고치기',()=>{ openEditSheet('s2'); }],
  ['시트-차종류',()=>{ goTab('my'); openTypeSheet(); }],
  ['시트-앱설정',()=>{ goTab('my'); openSettings('app'); }],
  ['시트-계정',()=>{ goTab('my'); openSettings('account'); }],
];
(async()=>{ const b=await chromium.launch(); const issues=[]; if(SHOTS) fs.mkdirSync(OUT,{recursive:true});
  for(const [dn,dev] of DEVS){ const ctx=await b.newContext({...dev,deviceScaleFactor:1});
    await ctx.addInitScript(()=>{ try{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }catch(e){} });
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto(F); await p.waitForTimeout(700);
    for(const [sn,fn] of SCENES){
      await p.evaluate(()=>{ try{ VOICE.on=false; closeSheet(); clearLive(); savePaused(null); S.draft=null; S.timer=null; S.stack=[{name:'home',params:{}}]; }catch(e){} });
      try{ await p.evaluate(fn); }catch(e){ issues.push(`${dn}/${sn}: 준비 실패 ${e.message.split('\n')[0]}`); continue; }
      await p.waitForTimeout(sn==='analyzing'?3200:1500);   /* 채팅 인사는 1.1초 뒤에 뜬다 */
      await p.evaluate(()=>document.querySelectorAll('.inflabel').forEach(e=>{ e.classList.add('on'); e.style.transition='none'; e.style.opacity=1; e.style.filter='none'; }));   // 나타났다 사라지는 풍미 이름은 보이는 상태로 재기
      const r=[];
      for(const at of ['top','bottom']){   // 고정 영역(위·아래)은 맨 위·맨 아래로 스크롤했을 때만 따진다: 스크롤 중 그 밑으로 지나가는 건 정상
        await p.evaluate(at=>{ const sc=document.querySelector('#sheetWrap.open #sheet')||document.querySelector('#view'); sc.style.scrollBehavior='auto'; sc.scrollTop=at==='top'?0:sc.scrollHeight; },at); await p.waitForTimeout(450);
        r.push(...await p.evaluate(([GAP,at])=>{
        const vis=e=>{ const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none') return false; let a=e; while(a&&a!==document.body){ const c=getComputedStyle(a); if(c.opacity!=='' && +c.opacity<.15) return false; if(c.display==='none') return false; a=a.parentElement; } const r=e.getBoundingClientRect(); return r.width>1&&r.height>1; };
        const sheetOpen=document.querySelector('#sheetWrap.open'), root=sheetOpen?document.querySelector('#sheet'):document.querySelector('#phone');
        const stick=e=>{ let a=e; while(a&&a!==document.body&&a.id!=='view'&&a.id!=='sheet'){ const c=getComputedStyle(a); if(c.position==='sticky'||c.position==='fixed') return c.bottom!=='auto'&&c.top==='auto'?'bottom':'top'; a=a.parentElement; } return null; };
        const clip=e=>{ let a=e.parentElement; let R=e.getBoundingClientRect(); R={l:R.left,t:R.top,r:R.right,b:R.bottom}; while(a&&a!==document.documentElement){ const c=getComputedStyle(a); if(/(auto|scroll|hidden)/.test(c.overflow+c.overflowY+c.overflowX)){ const q=a.getBoundingClientRect(); R={l:Math.max(R.l,q.left),t:Math.max(R.t,q.top),r:Math.min(R.r,q.right),b:Math.min(R.b,q.bottom)}; } a=a.parentElement; } return R; };
        const textOwn=e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
        let els=[...root.querySelectorAll('button,input,select,textarea,a,[role=button],h1,h2,h3,p,span,b,em,small,label,li,dt,dd,figcaption,div')].filter(e=>(e.matches('button,input,select,textarea,a,[role=button]')||textOwn(e))&&vis(e));
        els=els.filter(e=>!e.closest('.rotate,#rpCap,.toast,#dev,.hd-stage,.cvbox')&&!(sheetOpen&&!e.closest('#sheet')));
        const items=els.map(e=>{ const R=clip(e); return {e,R,st:stick(e),name:(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:'')+':'+(e.textContent||e.value||e.placeholder||e.getAttribute('aria-label')||'').trim().slice(0,14))}; }).filter(o=>o.R.r-o.R.l>1&&o.R.b-o.R.t>1);
        const out=[];
        for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++){ const A=items[i],B=items[j]; if(A.e.contains(B.e)||B.e.contains(A.e)) continue;
          if([A,B].some(o=>o.e.matches('input,textarea'))&&[A,B].some(o=>getComputedStyle(o.e).position==='absolute')) continue;   // 입력칸 안에 일부러 얹은 표시(글자 수 등)
          if(A.st!==B.st){ const s=A.st||B.st; if(s!==at) continue; }   // 고정 영역과 내용: 그 끝까지 스크롤했을 때만
          else if(at==='bottom') continue;   // 같은 층끼리는 한 번만
          const ix=Math.min(A.R.r,B.R.r)-Math.max(A.R.l,B.R.l), iy=Math.min(A.R.b,B.R.b)-Math.max(A.R.t,B.R.t);
          if(ix>2&&iy>2){ out.push(`겹침 ${A.name} ↔ ${B.name} (${Math.round(ix)}×${Math.round(iy)})`); continue; }
          const big=o=>parseFloat(getComputedStyle(o.e).fontSize)>=22;   // 큰 글자 둘레는 4px 이상 비우기(찻방울 완성 화면 'Fruity'가 위 설명에 붙던 문제)
          if(ix>8&&(big(A)||big(B))&&A.e.parentElement!==B.e.parentElement&&iy>-4&&iy<=2) out.push(`붙음 ${A.name} ↔ ${B.name} (${Math.round(-iy)}px)`); }
        if(at==='top'){ const pw=document.querySelector('#phone').getBoundingClientRect();
          items.forEach(o=>{ if(o.e.closest(".hp-pal")) return; /* 물감 줄은 일부러 옆으로 넘긴다 */ const r=o.e.getBoundingClientRect(); if(r.right>pw.right+1||r.left<pw.left-1) out.push(`가로로 잘림 ${o.name}`); });
          const nav=document.querySelector('.nav'); if(nav&&getComputedStyle(nav).display!=='none'&&nav.getBoundingClientRect().bottom>innerHeight+1) out.push('하단 탭이 화면 밖'); }
        return out; },[GAP,at])); }
      [...new Set(r)].slice(0,8).forEach(x=>issues.push(`${dn}/${sn}: ${x}`));
      if(SHOTS) await p.screenshot({path:path.join(OUT,`${dn}-${sn.replace(/[@/]/g,'')}.png`)});
    }
    if(errs.length) issues.push(`${dn}: 화면 오류 ${[...new Set(errs)].join(' / ')}`);
    await ctx.close(); }
  console.log(issues.length?issues.join('\n'):'모두 통과'); await b.close(); process.exit(issues.length?1:0); })();
