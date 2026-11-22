// 썸네일 시안 50개: 가운데 'TEA CANVAS' 한 줄 + 뒤에 큼직한 수채화 찻방울 5개(배치 10가지 × 색 조합 5가지)
// node tools/make-thumbs.js → previews/thumb50/01.jpg … 50.jpg
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(ROOT,'previews/thumb50');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:800,height:600}});
  await p.goto('file://'+path.join(ROOT,'submission/B.html')); await p.waitForTimeout(800); await p.evaluate(()=>document.fonts.ready);
  const res=await p.evaluate(async()=>{
    const W=1600,H=900, out=[];
    const PAL={따뜻한:['fruity','sweet','floral','spicy','citrus'],시원한:['fresh','vegetal','citrus','floral','soft'],흙빛:['nutty','earthy','soft','sweet','astringent'],파스텔:['floral','soft','fresh','citrus','fruity'],열한가지:FKEYS};
    const rng=s=>{ let a=s>>>0||1; return ()=>((a=Math.imul(a^a>>>15,a|1)^a+Math.imul(a^a>>>7,a|61)), ((a^a>>>14)>>>0)/4294967296); };
    const L=[   // 찻방울 5개를 큼직하게: 배치 10가지
      ['균형 잡힌 다섯',r=>[[.17,.24],[.83,.22],[.13,.8],[.86,.78],[.5,.06]].map(([x,y])=>({x,y,R:.13+.03*r()}))],
      ['왼쪽에 무게',r=>[[.1,.18,.17],[.24,.72,.15],[.06,.62,.1],[.84,.2,.1],[.9,.82,.12]].map(([x,y,R])=>({x,y,R}))],
      ['오른쪽에 무게',r=>[[.9,.2,.17],[.76,.76,.15],[.95,.6,.1],[.14,.22,.1],[.1,.84,.12]].map(([x,y,R])=>({x,y,R}))],
      ['대각선 흐름',r=>[[.06,.12,.13],[.27,.3,.11],[.5,.5,.14],[.73,.7,.11],[.94,.88,.13]].map(([x,y,R])=>({x,y,R}))],
      ['위 셋 · 아래 둘',r=>[[.15,.12,.12],[.5,.04,.13],[.85,.12,.12],[.3,.92,.13],[.7,.92,.13]].map(([x,y,R])=>({x,y,R}))],
      ['네 귀퉁이 + 가운데',r=>[[.04,.08,.15],[.96,.08,.15],[.04,.94,.15],[.96,.94,.15],[.5,.5,.16]].map(([x,y,R])=>({x,y,R}))],
      ['큰 하나 · 작은 넷',r=>[[.78,.42,.24],[.16,.2,.08],[.24,.82,.09],[.5,.1,.06],[.55,.9,.07]].map(([x,y,R])=>({x,y,R}))],
      ['글자 뒤 한 줄',r=>[.12,.31,.5,.69,.88].map((x,i)=>({x,y:.5+(i%2?.12:-.1),R:.11+.02*r()}))],
      ['엇갈린 두 줄',r=>[[.12,.2],[.5,.16],[.88,.24],[.31,.84],[.69,.8]].map(([x,y])=>({x,y,R:.12+.03*r()}))],
      ['자유 배치',r=>Array.from({length:5},(_,i)=>({x:.08+.84*((i+r()*.6)/5),y:r()<.5?.15+.2*r():.65+.2*r(),R:.11+.06*r()}))]];
    let n=0;
    for(const [ln,fn] of L){ for(const [pn,pal] of Object.entries(PAL)){ n++;
      const r=rng(n*977+13), c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
      x.fillStyle='#F7F5F2'; x.fillRect(0,0,W,H);
      fn(r).forEach((d,i)=>{ const k=2+Math.floor(r()*2), fl=[pal[i%pal.length],...[...pal].filter((_,j)=>j!==i%pal.length).sort(()=>r()-.5).slice(0,k-1)];   // 방울마다 주인공 색 하나 + 곁들임
        const comps=fl.map((f,j)=>({c:FLAVORS[f].color,k:f,w:1-j*.22}));
        drawRec1(x,comps,d.x*W,d.y*H,d.R*W*2.3,'t'+n+'_'+i,CV_SPREAD+1.4,.88); });
      x.fillStyle='#111'; x.textAlign='center'; x.textBaseline='middle'; x.font='800 150px Pretendard'; try{ x.letterSpacing='4px'; }catch(e){}
      x.fillText('TEA CANVAS',W/2,H/2+6);
      out.push({n,ln,pn,url:c.toDataURL('image/jpeg',.9)}); await new Promise(r=>setTimeout(r,0)); } }
    return out; });
  fs.mkdirSync(OUT,{recursive:true});
  res.forEach(o=>fs.writeFileSync(path.join(OUT,String(o.n).padStart(2,'0')+'.jpg'),Buffer.from(o.url.split(',')[1],'base64')));
  fs.writeFileSync(path.join(OUT,'list.json'),JSON.stringify(res.map(({n,ln,pn})=>({n,ln,pn}))));
  console.log(res.length,'개'); await b.close(); })();
