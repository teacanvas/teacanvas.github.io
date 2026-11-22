// 썸네일: 가운데 'TEA CANVAS' + 대각선으로 흐르는 큼직한 찻방울. 풍미 색 11가지를 모두 넣고, 흰 곳이 남지 않게 채운다
// node tools/make-thumb-all.js → previews/thumb-all/01.jpg … 12.jpg
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), ONLY=process.env.ONLY?{n:+process.env.ONLY,sz:(process.env.SZ||'2.6').split(',').map(Number)}:null, OUT=path.join(ROOT,ONLY?'previews/thumb-all/v'+ONLY.n:'previews/thumb-all');   // ONLY=11 SZ=2.6,2.2 → 11번만 크기 바꿔서
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:800,height:600}});
  if(ONLY) await p.addInitScript(o=>{ window.__ONLY=o; },ONLY); await p.goto('file://'+path.join(ROOT,'submission/B.html')); await p.waitForTimeout(800); await p.evaluate(()=>document.fonts.ready);
  const res=await p.evaluate(async()=>{
    const W=1600,H=900,out=[];
    const rng=s=>{ let a=s>>>0||1; return ()=>((a=Math.imul(a^a>>>15,a|1)^a+Math.imul(a^a>>>7,a|61)), ((a^a>>>14)>>>0)/4294967296); };
    // 11자리: 대각선 다섯 + 오른쪽 위 셋 + 왼쪽 아래 셋 (모서리까지)
    const SPOTS=[[.04,.1],[.26,.3],[.5,.5],[.74,.7],[.96,.9],[.6,.12],[.86,.1],[.98,.42],[.14,.62],[.04,.94],[.4,.9]];
    const ORDERS={'무지개':['spicy','fruity','citrus','sweet','vegetal','fresh','soft','floral','nutty','earthy','astringent'],
      '따뜻함→시원함':['fruity','spicy','sweet','citrus','floral','soft','vegetal','fresh','nutty','earthy','astringent']};
    const opts=[]; for(const [on,ord] of Object.entries(ORDERS)) for(const sz of [2.2,2.6]) for(const sh of [0,1,2]) opts.push({on,ord,sz,sh});
    let n=0; const ONLY=window.__ONLY||null;   // 특정 시안 하나를 크기만 바꿔 다시 그릴 때
    const list=ONLY? ONLY.sz.map(sz=>({...opts[ONLY.n-1],sz,seed:ONLY.n})) : opts;
    for(const o of list){ n++; const seedN=o.seed||n; const r=rng(seedN*1301+7), c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
      x.fillStyle='#F7F5F2'; x.fillRect(0,0,W,H);
      const ord=o.sh? [...o.ord].sort(()=>r()-.5) : o.ord;   // 섞은 순서도 함께
      const DARK=['earthy','astringent','nutty'], LIGHT=['soft','floral','citrus','fresh','sweet'];
      const drop=(k,px,py,R,id)=>drawRec1(x,[{c:FLAVORS[k].color,k,w:1}],px*W,py*H,R*W*(DARK.includes(k)?.72:1),id,CV_SPREAD+1.4,.74);   // 한 방울 한 색으로 맑게, 진한 색은 작게
      SPOTS.forEach(([sx,sy],i)=>drop(ord[i],sx+(r()-.5)*.05,sy+(r()-.5)*.05,.11*o.sz*(.9+.2*r()),'a'+seedN+'_'+i));
      // 흰 곳 메우기: 가장 밝은 칸을 찾아 그 둘레 색으로 한 번 더
      for(let k=0;k<10;k++){ const d=x.getImageData(0,0,W,H).data; let best=null,bv=0; const G=140;   // 크게 빈 곳(모서리 등)만 메우고, 작은 틈은 19번처럼 남긴다
        for(let gy=0;gy<H;gy+=G) for(let gx=0;gx<W;gx+=G){ let s=0; let m=0; for(let yy=gy;yy<Math.min(H,gy+G);yy+=10) for(let xx=gx;xx<Math.min(W,gx+G);xx+=10){ const q=(yy*W+xx)*4; s+=d[q]+d[q+1]+d[q+2]; m++; } s/=m*3; if(s>bv){ bv=s; best=[gx+G/2,gy+G/2]; } }
        if(bv<228) break; drop(LIGHT[(k+seedN)%LIGHT.length],best[0]/W,best[1]/H,.075*o.sz,'f'+seedN+'_'+k); }
      x.fillStyle='#111'; x.textAlign='center'; x.textBaseline='middle'; x.font='800 150px Pretendard'; try{ x.letterSpacing='4px'; }catch(e){}
      x.fillText('TEA CANVAS',W/2,H/2+6);
      out.push({n,label:o.seed?`${o.seed}번 · 크기 ${o.sz}`:`${o.on}${o.sh?' (섞음 '+o.sh+')':''} · ${o.sz===2.2?'보통':'크게'}`,url:c.toDataURL('image/jpeg',.92)}); await new Promise(r=>setTimeout(r,0)); }
    return out; });
  fs.mkdirSync(OUT,{recursive:true});
  res.forEach(o=>fs.writeFileSync(path.join(OUT,String(o.n).padStart(2,'0')+'.jpg'),Buffer.from(o.url.split(',')[1],'base64')));
  fs.writeFileSync(path.join(OUT,'list.json'),JSON.stringify(res.map(({n,label})=>({n,label})))); console.log(res.length,'개'); await b.close(); })();
