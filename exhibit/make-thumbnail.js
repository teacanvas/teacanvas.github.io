// 전시용 썸네일 만들기 (v5 기준) — 글자 없이 그림만, 16:9
// A) thumbnail.png        : 앱과 같은 수채 방울이 화면 가득 번진 캔버스
// B) thumbnail-phone.png  : A 위에 v5 홈 화면을 담은 폰
// 사용법: node exhibit/make-thumbnail.js
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const ROOT=path.join(__dirname,'..'), APP='file://'+path.join(ROOT,'old','TEA_CANVAS_prototype_v5.html');
(async()=>{
  const b=await chromium.launch(); const errs=[];
  // 1) 캔버스 그림: 앱의 drawRec1 그대로
  const p=await b.newPage({viewport:{width:430,height:900}}); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const url=await p.evaluate(()=>{
    const F=(o,m)=>{ const L=Object.entries(o).map(([k,w])=>({k,c:FLAVORS[k].color,w})); L.mood=m||null; return L; };
    const recs=S.records.filter(r=>r.canvas).map(r=>({id:r.id,x:r.canvas.x,y:r.canvas.y,L:recFlav(r)}));
    [[.82,.18,{floral:.9,fruity:.6,sweet:.4},'lively'],[.64,.30,{citrus:.85,fresh:.6,floral:.3}],[.93,.42,{nutty:.8,sweet:.6,soft:.4},'calm'],
     [.52,.10,{fruity:.9,sweet:.7,floral:.4,spicy:.2},'lively'],[.74,.07,{vegetal:.8,fresh:.7,citrus:.3}],[.40,.22,{soft:.8,sweet:.5,floral:.4},'calm'],
     [.33,.62,{earthy:.8,astringent:.5,nutty:.3},'deep'],[.14,.30,{floral:.7,soft:.6,fresh:.3},'calm'],[.90,.70,{spicy:.8,earthy:.5,sweet:.4}],
     [.06,.84,{astringent:.8,vegetal:.5,earthy:.3}],[.60,.76,{citrus:.7,astringent:.6,fresh:.3},'lively'],[.47,.45,{nutty:.7,vegetal:.6,sweet:.3}],
     [.04,.12,{fresh:.8,vegetal:.5}],[.97,.92,{earthy:.7,nutty:.5,sweet:.3},'deep'],[.22,.95,{soft:.7,floral:.4},'calm'],[.70,.52,{fruity:.7,citrus:.5,sweet:.4},'lively']]
      .forEach(([x,y,f,m],i)=>recs.push({id:'ex'+i,x,y,L:F(f,m)}));
    const W=3840,H=2160, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const x=cv.getContext('2d');
    x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.strokeStyle='rgba(0,0,0,.05)'; x.lineWidth=3; x.beginPath(); x.moveTo(W/2,H*.05); x.lineTo(W/2,H*.95); x.moveTo(W*.04,H/2); x.lineTo(W*.96,H/2); x.stroke();
    recs.forEach(r=>drawRec1(x,r.L,W*(.05+.9*r.x),H*(.08+.84*r.y),W*.042,r.id,CV_SPREAD,.9));
    return cv.toDataURL('image/png');
  });
  fs.writeFileSync(path.join(__dirname,'canvas-v5.png'),Buffer.from(url.split(',')[1],'base64'));
  await p.close();
  // 2) 폰 화면: v5 홈(풍미 이름이 떠 있는 순간)
  const h=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3}); h.on('pageerror',e=>errs.push(e.message));
  await h.addInitScript(()=>{ window.HOME_T=4.2; }); await h.goto(APP); await h.waitForTimeout(2500);
  await h.screenshot({path:path.join(__dirname,'home-v5.png')}); await h.close();
  // 3) 16:9 두 장
  const q=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}); q.on('pageerror',e=>errs.push(e.message));
  for(const [mode,out] of [['a','thumbnail.png'],['b','thumbnail-phone.png']]){
    await q.goto('file://'+path.join(__dirname,'thumbnail.html')+'?'+mode); await q.waitForTimeout(800);
    await q.screenshot({path:path.join(__dirname,out)}); }
  console.log(errs.length?'오류: '+errs.join(' / '):'완료: exhibit/thumbnail.png, exhibit/thumbnail-phone.png'); await b.close();
})();
