// 썸네일 시안 50개: 가운데 'TEA CANVAS' 한 줄 + 배경을 빈틈없이 채운 수채화 찻방울(색 조합 10가지 × 채우는 방식 5가지)
// node tools/make-thumbs.js → previews/thumb50/01.jpg … 50.jpg
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(ROOT,'previews/thumb50');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:800,height:600}});
  await p.goto('file://'+path.join(ROOT,'submission/B.html')); await p.waitForTimeout(800); await p.evaluate(()=>document.fonts.ready);
  const res=await p.evaluate(async()=>{
    const W=1600,H=900, out=[];
    const PAL={따뜻한:['fruity','sweet','floral','spicy','citrus'],시원한:['fresh','vegetal','citrus','floral','soft'],흙빛:['nutty','earthy','soft','sweet','astringent'],파스텔:['floral','soft','fresh','citrus','fruity'],열한가지:FKEYS,
      꽃밭:['floral','fruity','soft','sweet'],숲:['vegetal','fresh','earthy','nutty','soft'],노을:['spicy','fruity','citrus','sweet','floral'],찻잎:['vegetal','citrus','fresh','soft','sweet'],가을:['nutty','spicy','earthy','sweet','astringent']};
    const rng=s=>{ let a=s>>>0||1; return ()=>((a=Math.imul(a^a>>>15,a|1)^a+Math.imul(a^a>>>7,a|61)), ((a^a>>>14)>>>0)/4294967296); };
    const grid=(cols,rows,R,j,r)=>{ const a=[]; for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) a.push({x:(x+.5+(r()-.5)*j)/cols,y:(y+.5+(r()-.5)*j)/rows,R:R*(.85+.3*r())}); return a.sort(()=>r()-.5); };
    const L=[   // 배경을 빈틈없이 채우는 방식 5가지
      ['큰 번짐 성글게',r=>grid(4,3,.15,.6,r)],
      ['중간 번짐 촘촘히',r=>grid(6,4,.1,.7,r)],
      ['큰 바탕 + 작은 번짐',r=>[...grid(3,2,.2,.5,r),...grid(7,4,.045,.9,r)]],
      ['가로 물결',r=>{ const a=[]; for(let y=0;y<4;y++) for(let x=0;x<7;x++) a.push({x:(x+.5+(y%2?.5:0))/7,y:(y+.5)/4+.04*Math.sin(x*1.3+y),R:.1+.03*r()}); return a; }],
      ['가운데서 퍼지는',r=>{ const a=[{x:.5,y:.5,R:.17}]; for(let k=0;k<3;k++){ const n=6+k*6, d=.2+k*.17; for(let i=0;i<n;i++){ const t=i/n*6.283+k; a.push({x:.5+d*Math.cos(t)*1.05,y:.5+d*Math.sin(t)*1.6,R:.09+k*.025}); } } return a; }]];
    let n=0;
    for(const [pn,pal] of Object.entries(PAL)){ for(const [ln,fn] of L){ n++;
      const r=rng(n*977+13), c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
      x.fillStyle='#F7F5F2'; x.fillRect(0,0,W,H);
      fn(r).forEach((d,i)=>{ const k=2+Math.floor(r()*2), fl=[pal[i%pal.length],...[...pal].filter((_,j)=>j!==i%pal.length).sort(()=>r()-.5).slice(0,k-1)];   // 방울마다 주인공 색 하나 + 곁들임
        const comps=fl.map((f,j)=>({c:FLAVORS[f].color,k:f,w:1-j*.22}));
        drawRec1(x,comps,d.x*W,d.y*H,d.R*W*2.4,'t'+n+'_'+i,CV_SPREAD+1.4,.88); });
      x.fillStyle='#111'; x.textAlign='center'; x.textBaseline='middle'; x.font='800 150px Pretendard'; try{ x.letterSpacing='4px'; }catch(e){}
      x.fillText('TEA CANVAS',W/2,H/2+6);
      out.push({n,ln,pn,url:c.toDataURL('image/jpeg',.9)}); await new Promise(r=>setTimeout(r,0)); } }
    return out; });
  fs.mkdirSync(OUT,{recursive:true});
  res.forEach(o=>fs.writeFileSync(path.join(OUT,String(o.n).padStart(2,'0')+'.jpg'),Buffer.from(o.url.split(',')[1],'base64')));
  fs.writeFileSync(path.join(OUT,'list.json'),JSON.stringify(res.map(({n,ln,pn})=>({n,ln,pn}))));
  console.log(res.length,'개'); await b.close(); })();
