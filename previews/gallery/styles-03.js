/* =========================================================
   시안 s301–s320 — 잉크·물감·자연
   ========================================================= */
(function(){
const H0=GALLERY.H;
const TAU=Math.PI*2;
const BG='#F7F5F0', BGc=H0.hex2rgb(BG);
const MG=.08;
const P=(u,W,m=MG)=>(m+u*(1-2*m))*W;                    // 기록 좌표 → 화면
const kN=(n,e=.42,b=10)=>Math.min(1.15,Math.pow(b/Math.max(n,6),e)); // 기록 수에 따른 크기 보정
const mk=W=>{ const c=document.createElement('canvas'); c.width=c.height=W; return c; };
const pick=(r,t)=>{ const tot=r.colors.reduce((a,c)=>a+c.w,0); let s=0; t*=tot; for(const c of r.colors){ s+=c.w; if(t<=s) return c.rgb; } return r.colors[r.colors.length-1].rgb; };
const fl0=r=>r.fl.length?r.fl[0].rgb:r.tea;
const maxAge=recs=>Math.max(1,...recs.map(r=>r.daysAgo));
function pixels(N,fn){
  const c=document.createElement('canvas'); c.width=c.height=N; const x=c.getContext('2d'), im=x.createImageData(N,N), d=im.data, o=[0,0,0,1];
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){ o[3]=1; fn((i+.5)/N,(j+.5)/N,o,i,j); const k=(j*N+i)*4;
    d[k]=o[0]*255; d[k+1]=o[1]*255; d[k+2]=o[2]*255; d[k+3]=o[3]*255; }
  x.putImageData(im,0,0); return c;
}
function blit(ctx,W,c,blur=0,alpha=1,op){ ctx.save(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; if(blur) ctx.filter=`blur(${blur}px)`; ctx.globalAlpha=alpha; if(op) ctx.globalCompositeOperation=op; ctx.drawImage(c,0,0,W,W); ctx.restore(); }
// 흔들리는 원 경로
function blobPath(ctx,H,cx,cy,R,seed,amp=.06,freq=1.4,n=72){
  const ox=(seed%997)*.37, oy=(seed%613)*.53; ctx.beginPath();
  for(let i=0;i<=n;i++){ const a=i/n*TAU, rr=R*(1+amp*(H.noise(Math.cos(a)*freq+ox,Math.sin(a)*freq+oy)*2-1)); const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
  ctx.closePath();
}
// 겹침 풀기: 기록 자리를 지키면서 서로 밀어 캔버스를 고르게 쓴다 → [{x,y,r}]
function spread(recs,W,rad,{iter=50,gap=.8,pull=.015,m=.05}={}){
  const p=recs.map(r=>{ const x=P(r.x,W), y=P(r.y,W); return {x,y,ox:x,oy:y,r:rad(r),h:H0.hash(r.id)}; }), n=p.length;
  for(let it=0;it<iter;it++){
    for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=p[i], b=p[j]; let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy); const mn=(a.r+b.r)*gap;
      if(d>=mn) continue; if(d<1e-6){ const t=(a.h^b.h)%628/100; dx=Math.cos(t); dy=Math.sin(t); d=1e-6; } else { dx/=d; dy/=d; }
      const s=(mn-d)*.25; a.x-=dx*s; a.y-=dy*s; b.x+=dx*s; b.y+=dy*s; }
    for(const q of p){ q.x+=(q.ox-q.x)*pull; q.y+=(q.oy-q.y)*pull; const lo=W*m+q.r*.5, hi=W-lo; q.x=Math.max(lo,Math.min(hi,q.x)); q.y=Math.max(lo,Math.min(hi,q.y)); }
  }
  return p;
}
const S=[];
const add=s=>{ S.push(s); GALLERY.add(s); };

/* ---------------- s301 찻잔 자국 ---------------- */
add({id:'s301',name:'찻잔 자국',cat:'물감',bg:'#F6F2EA',
  desc:'기록 하나가 종이에 남은 찻잔 자국 하나예요. 진하게 우린 차일수록 자국이 짙고, 오래된 기록일수록 바래요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), mA=maxAge(recs);
    H.grain(ctx,W,.05,'multiply');
    const LP=spread(recs,W,r=>W*(.055+.045*r.i)*k,{gap:.7}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    for(const r of recs){
      const s=H.hash(r.id), rr=H.rng(s), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r;
      const fade=1-.5*r.daysAgo/mA, a=(.45+.55*r.i)*fade*(n>40?.8:1);
      const ink=H.shade(H.pastel(r.tea,0,1.15),-.22), wash=H.pastel(r.tea,.25,1.1);
      // 안쪽: 가장자리로 갈수록 진해지는 얼룩
      const g=ctx.createRadialGradient(x,y,0,x,y,R);
      g.addColorStop(0,H.rgbStr(wash,.05*a)); g.addColorStop(.7,H.rgbStr(wash,.10*a)); g.addColorStop(.96,H.rgbStr(ink,.16*a)); g.addColorStop(1,H.rgbStr(ink,0));
      ctx.fillStyle=g; blobPath(ctx,H,x,y,R,s,.012,1.2); ctx.fill();
      // 풍미: 안쪽 가장자리에 스민 빛
      r.fl.forEach((f,j)=>{ ctx.strokeStyle=H.rgbStr(H.pastel(f.rgb,.05,1.2),.32*f.w*a); ctx.lineWidth=W*(.0025+.003*f.w);
        blobPath(ctx,H,x,y,R*(.9-.07*j),s+j*31,.015,1.3); ctx.stroke(); });
      // 테두리: 끊어질 듯 이어지는 여러 겹의 선
      ctx.lineCap='round';
      for(let L=0;L<4;L++){
        ctx.strokeStyle=H.rgbStr(ink,a*(.55-.11*L)); ctx.lineWidth=W*(.0012+.0022*rr());
        const ox=(s%300)*.1+L*3.1, N=90; ctx.beginPath(); let pen=false;
        for(let i=0;i<=N;i++){ const t=i/N*TAU, gap=H.noise(Math.cos(t)*1.6+ox,Math.sin(t)*1.6+L);
          const rad=R*(1-.012*L+.012*(H.noise(Math.cos(t)*2+L*5,Math.sin(t)*2+ox)-.5)), px=x+Math.cos(t)*rad, py=y+Math.sin(t)*rad;
          if(gap<.28+.05*L){ pen=false; continue; } pen?ctx.lineTo(px,py):ctx.moveTo(px,py); pen=true; }
        ctx.stroke();
      }
      // 잔을 한 번 더 내려놓은 흔적
      if(s%3===0){ const an=rr()*TAU, d=R*(.12+.12*rr()); ctx.strokeStyle=H.rgbStr(ink,.22*a); ctx.lineWidth=W*.0013;
        ctx.beginPath(); ctx.arc(x+Math.cos(an)*d,y+Math.sin(an)*d,R*.99,an+1,an+1+TAU*(.35+.3*rr())); ctx.stroke(); }
      // 별 3개: 튄 방울
      if(r.stars>=3){ for(let q=0;q<3;q++){ const an=rr()*TAU, d=R*(1.15+.35*rr()); ctx.fillStyle=H.rgbStr(ink,.25*a); ctx.beginPath(); ctx.arc(x+Math.cos(an)*d,y+Math.sin(an)*d,W*(.002+.003*rr()),0,TAU); ctx.fill(); } }
    }
  }});

/* ---------------- s302 물속 잉크 ---------------- */
add({id:'s302',name:'한 획 원상',cat:'잉크',bg:'#F6F4EE',
  desc:'기록 하나를 붓으로 한 번에 그린 동그라미(원상)로 남겼어요. 붓끝은 찻물 색에서 풍미 색으로 바뀌고, 별점이 높을수록 원이 온전히 닫혀요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10);
    const LP=spread(recs,W,r=>W*(.05+.04*r.i)*k,{gap:.85}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    ctx.lineCap='round';
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+21), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r;
      const a0=-Math.PI*.6+H.gauss(rr)*.5, sweep=TAU*(.78+.06*r.stars)+(rr()-.5)*.1, bw=R*(.2+.16*r.i), NB=n>50?10:14, NS=72;
      const c0=H.shade(H.pastel(r.tea,0,1.2),-.12), c1=H.pastel(fl0(r),0,1.25), sd=(H.hash(r.id)%300)*.21;
      for(let b=0;b<NB;b++){
        const off=(b/(NB-1)-.5), dry=.25+.55*rr(), lw=W*(.0012+.0018*rr())*(.7+.5*k);
        let pts=[];
        const flush=t=>{ if(pts.length>1){ const c=H.mix(c0,c1,H.ss(.15,.95,t)); ctx.strokeStyle=H.rgbStr(c,(.55+.3*r.i)*(1-.4*t)*(n>50?.85:1)); ctx.lineWidth=lw;
            ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke(); } pts=pts.length?[pts[pts.length-1]]:[]; };
        for(let q=0;q<=NS;q++){ const t=q/NS, a=a0+sweep*t;
          const width=bw*(Math.sin(Math.PI*Math.min(1,t*1.15+.08))*.8+.2)*(1-.35*t);
          const rad=R*(1+.03*Math.sin(t*5+sd))+off*width;
          const p=[x+Math.cos(a)*rad,y+Math.sin(a)*rad];
          const gap=H.noise(b*3.7+sd,t*9)<dry*t*1.1;
          if(gap){ flush(t); pts=[]; continue; }
          pts.push(p); if(pts.length>=8) flush(t); }
        flush(1);
      }
    }
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- 마블링 엔진 (s303, s304) ---------------- */
function marbling(recs,seq,{nv=110,thr=.012}={}){
  let polys=[];
  const inBox=(x,y)=>x>-.03&&x<1.03&&y>-.03&&y<1.03;
  const drop=(cx,cy,r,col)=>{
    const r2=r*r;
    for(const p of polys){ if(p.full) continue; const X=p.x,Y=p.y; for(let i=0;i<X.length;i++){ const dx=X[i]-cx, dy=Y[i]-cy, f=Math.sqrt(1+r2/(dx*dx+dy*dy+1e-12)); X[i]=cx+dx*f; Y[i]=cy+dy*f; } }
    const x=new Float64Array(nv), y=new Float64Array(nv); for(let i=0;i<nv;i++){ const a=i/nv*TAU; x[i]=cx+Math.cos(a)*r; y[i]=cy+Math.sin(a)*r; }
    polys.push({x,y,col});
  };
  const refine=(t=thr)=>{
    const out=[];
    for(const p of polys){ if(p.full){ out.push(p); continue; }
      const X=p.x,Y=p.y,N=X.length; let anyIn=false;
      for(let i=0;i<N;i++) if(inBox(X[i],Y[i])){ anyIn=true; break; }
      if(!anyIn){ // 화면 밖으로 밀려남 → 화면을 감싸면 바탕색이 된다
        let c=false; for(let i=0,j=N-1;i<N;j=i++){ if(((Y[i]>.5)!==(Y[j]>.5))&&(.5<(X[j]-X[i])*(.5-Y[i])/(Y[j]-Y[i])+X[i])) c=!c; }
        if(c){ out.length=0; out.push({full:true,col:p.col}); }
        continue; }
      const nx=[],ny=[];
      for(let i=0;i<N;i++){ const j=(i+1)%N; nx.push(X[i]); ny.push(Y[i]);
        const dx=X[j]-X[i], dy=Y[j]-Y[i], L=Math.hypot(dx,dy);
        if(L>t&&(inBox(X[i],Y[i])||inBox(X[j],Y[j]))&&nx.length<6000){ const m=Math.min(8,Math.ceil(L/t)); for(let q=1;q<m;q++){ nx.push(X[i]+dx*q/m); ny.push(Y[i]+dy*q/m); } } }
      p.x=Float64Array.from(nx); p.y=Float64Array.from(ny); out.push(p);
    }
    polys=out;
  };
  for(const r of recs){ seq(r,drop); refine(); }
  return {get polys(){ return polys; }, refine, apply(fn){ for(const p of polys){ if(p.full) continue; for(let i=0;i<p.x.length;i++){ const o=fn(p.x[i],p.y[i]); p.x[i]=o[0]; p.y[i]=o[1]; } } }};
}
function drawPolys(ctx,W,polys,H,stroke){
  for(const p of polys){
    ctx.fillStyle=p.col;
    if(p.full){ ctx.fillRect(0,0,W,W); continue; }
    ctx.beginPath(); for(let i=0;i<p.x.length;i++){ const x=p.x[i]*W, y=p.y[i]*W; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.closePath(); ctx.fill();
    if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=W*.0012; ctx.stroke(); }
  }
}

/* ---------------- s303 스미나가시 ---------------- */
add({id:'s303',name:'스미나가시',cat:'잉크',bg:'#F5F4EF',
  desc:'물 위에 먹과 맑은 물을 번갈아 떨어뜨린 무늬예요. 기록마다 한 자리에 잉크를 떨구고, 새 기록이 옛 고리를 바깥으로 밀어내요.',
  render(ctx,W,recs,H){
    const n=recs.length, R=Math.sqrt(.55/(Math.PI*Math.max(n,6)))*(n<20?1.1:1), water='rgb(245,244,239)';
    const M=marbling(recs,(r,drop)=>{
      const x=.1+.8*r.x, y=.1+.8*r.y, inks=[H.shade(H.pastel(r.tea,0,1.1),-.25),...r.fl.map(f=>H.shade(H.pastel(f.rgb,0,1.15),-.1))];
      const rings=n>50?2:3, rk=R*(.6+.5*r.i)/Math.sqrt(rings);
      for(let q=0;q<rings;q++){ const c=inks[q%inks.length]; drop(x,y,rk*.42,H.rgbStr(c,.9)); drop(x,y,rk*.75,water); }
    },{nv:96,thr:.012});
    drawPolys(ctx,W,M.polys,H);
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s304 에브루 ---------------- */
add({id:'s304',name:'에브루 빗살',cat:'물감',bg:'#F4F1EA',
  desc:'물감 방울을 기록 순서대로 떨어뜨린 뒤 빗으로 위아래로 빗어낸 에브루 무늬예요. 찻물 색 방울 안에 풍미 색이 고리로 들어 있어요.',
  render(ctx,W,recs,H){
    const n=recs.length, R=Math.sqrt(.75/(Math.PI*Math.max(n,6)));
    const M=marbling(recs,(r,drop)=>{
      const x=.1+.8*r.x, y=.1+.8*r.y, rk=R*(.65+.45*r.i);
      drop(x,y,rk*.8,H.rgbStr(H.pastel(r.tea,.22,1.05)));
      r.fl.forEach((f,j)=>drop(x,y,rk*(.32+.25*f.w)*(1-.15*j),H.rgbStr(H.pastel(f.rgb,.2,1.1))));
      drop(x,y,rk*.18,'rgb(244,241,234)');
    },{nv:90,thr:.014});
    M.refine(.006);
    const T=7, z=.09, lam=.018;
    M.apply((x,y)=>{ let dy=0; for(let t=0;t<T;t++){ const x0=(t+.5)/T; dy+=z*Math.exp(-Math.abs(x-x0)/lam); } return [x,y+dy]; });
    M.refine(.006);
    M.apply((x,y)=>{ let dy=0; for(let t=0;t<T;t++){ const x0=(t+1)/T; dy-=z*Math.exp(-Math.abs(x-x0)/lam); } return [x,y+dy]; });
    M.refine(.008);
    M.apply((x,y)=>[x+.018*Math.sin(y*TAU*2.5),y]);
    drawPolys(ctx,W,M.polys,H);
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s305 수채 번짐 ---------------- */
function deform(pts,depth,rng,H){
  for(let d=0;d<depth;d++){ const out=[];
    for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; out.push(a);
      const L=Math.hypot(b[0]-a[0],b[1]-a[1]), v=a[2]; out.push([(a[0]+b[0])/2+H.gauss(rng)*L*v*.5,(a[1]+b[1])/2+H.gauss(rng)*L*v*.5,v*(.55+rng()*.45)]); }
    pts=out; }
  return pts;
}
function fillPts(ctx,pts){ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill(); }
function wcBlob(ctx,H,x,y,R,col,rng,layers,alpha){
  const base=[]; for(let i=0;i<10;i++){ const a=i/10*TAU; base.push([x+Math.cos(a)*R,y+Math.sin(a)*R,.6+rng()*1.4]); }
  const b=deform(base,3,rng,H); ctx.fillStyle=H.rgbStr(col,alpha);
  for(let l=0;l<layers;l++) fillPts(ctx,deform(b,2,rng,H));
}
add({id:'s305',name:'젖은 수채',cat:'물감',
  desc:'젖은 종이에 기록마다 물감 한 방울을 얹었어요. 찻물 색이 넓게 번지고 그 안에 풍미 색이 피어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), wet=mk(W), w=wet.getContext('2d');
    const LP=spread(recs,W,r=>W*(.05+.04*r.i)*k,{gap:.7}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    for(const r of recs){ const x=AT.get(r).x, y=AT.get(r).y, R=W*(.07+.05*r.i)*k;
      const g=w.createRadialGradient(x,y,0,x,y,R*1.3); const c=H.pastel(r.tea,.2,1.2); g.addColorStop(0,H.rgbStr(c,.2)); g.addColorStop(1,H.rgbStr(c,0)); w.fillStyle=g; w.fillRect(x-R*1.3,y-R*1.3,R*2.6,R*2.6); }
    blit(ctx,W,wet,Math.round(W*.02),.8);
    const lay=n>50?7:n>20?9:12, al=n>50?.045:.04;
    for(const r of recs){ const rng=H.rng(H.hash(r.id)), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r;
      wcBlob(ctx,H,x,y,R,H.pastel(r.tea,.08,1.2),rng,lay,al);
      r.fl.forEach((f,j)=>{ const a=rng()*TAU, d=R*.35*rng(); wcBlob(ctx,H,x+Math.cos(a)*d,y+Math.sin(a)*d,R*(.3+.35*f.w),H.pastel(f.rgb,.05,1.25),rng,lay-2,al*1.1); });
    }
    H.grain(ctx,W,.07,'soft-light');
  }});

/* ---------------- s306 취향 데칼코마니 ---------------- */
add({id:'s306',name:'취향 데칼코마니',cat:'잉크',
  desc:'종이를 반으로 접어 찍은 나만의 잉크 얼룩이에요. 향이 좋았던 차일수록 접힌 선 가까이, 맛이 좋았던 차일수록 위쪽에 번져요.',
  render(ctx,W,recs,H){
    const n=recs.length, sg=(.042+.03*Math.sqrt(10/Math.max(n,10)))*Math.pow(10/Math.max(n,10),.22);
    const M=recs.map(r=>({...r,_pts:null,x:.07+.41*r.x,y:.1+.8*r.y}));
    const F=H.field(M,90,{spread:1.6});
    const N=220, half=N/2, T=.42;
    const cv=pixels(N,(u,v,o,i)=>{
      const uu=i<half?u:1-u;
      const wu=uu+.035*(H.fbm(uu*6,v*6,3)-.5), wv=v+.035*(H.fbm(uu*6+7,v*6+3,3)-.5);
      let f=0,core=0; for(const r of M){ const dx=wu-r.x, dy=wv-r.y, s2=sg*sg*(.6+.8*r.i); const d2=dx*dx+dy*dy; if(d2>s2*9) continue; f+=(.5+.5*r.i)*Math.exp(-d2/s2); core+=r.i*Math.exp(-d2/(s2*.12)); }
      const vein=H.fbm(uu*22,v*22,3), feather=H.noise(uu*9,v*46);
      const val=f+.38*(vein-.5)+.22*(feather-.5)*H.ss(.05,.3,v)*H.ss(.95,.7,v);
      const a=H.ss(T-.045,T+.02,val);
      if(a<=0){ o[3]=0; return; }
      const c=H.sample(F,wu,wv), p=H.pastel(c,.02,1.3);
      const edge=Math.exp(-Math.max(0,val-T)/.09), inner=H.fbm(uu*9+3,v*9,3);
      let col=H.mix(H.mix(BGc,p,.45+.35*inner),H.shade(p,-.3),edge*.7);
      col=H.mix(col,H.shade(p,-.22),Math.min(.6,core*.5));
      o[0]=col[0]; o[1]=col[1]; o[2]=col[2]; o[3]=a*.95;
    });
    blit(ctx,W,cv);
    ctx.strokeStyle='rgba(0,0,0,.05)'; ctx.lineWidth=Math.max(1,W/480); ctx.beginPath(); ctx.moveTo(W/2,W*.03); ctx.lineTo(W/2,W*.97); ctx.stroke();
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s307 잉크 튀김 ---------------- */
add({id:'s307',name:'잉크 튀김',cat:'잉크',
  desc:'붓을 털어 튄 잉크 자국이에요. 기록마다 찻물 색 한 점과 풍미 색 물방울이 같은 방향으로 흩어지고, 별점이 높을수록 많이 튀어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), dir=-.55;
    const LP=spread(recs,W,r=>W*(.022+.026*r.i)*k*1.8,{gap:.8}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+3), x=AT.get(r).x, y=AT.get(r).y, R=W*(.022+.026*r.i)*k, base=H.pastel(r.tea,.05,1.2);
      // 흩날린 방울
      const m=Math.round((5+r.stars*4)*(n>50?.6:1));
      for(let q=0;q<m;q++){
        const a=dir+H.gauss(rr)*.9, d=R*(1.3+rr()*rr()*4.5), sz=R*(.06+.22*rr())*(1-.12*d/R/5), c=H.pastel(pick(r,rr()),.05,1.2);
        const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d;
        ctx.fillStyle=H.rgbStr(c,.75);
        ctx.save(); ctx.translate(px,py); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0,0,sz*(1+d/R*.35),sz,0,0,TAU); ctx.fill(); ctx.restore();
      }
      // 줄기 자국
      const st=1+(r.stars>1?1:0);
      for(let q=0;q<st;q++){ const a=dir+H.gauss(rr)*.4, L=R*(1.6+rr()*1.6); ctx.fillStyle=H.rgbStr(base,.55);
        ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(R*.4,-R*.18); ctx.quadraticCurveTo(L*.6,-R*.05,L,0); ctx.quadraticCurveTo(L*.6,R*.05,R*.4,R*.18); ctx.fill();
        ctx.beginPath(); ctx.arc(L,0,R*.09,0,TAU); ctx.fill(); ctx.restore(); }
      // 본 방울
      ctx.fillStyle=H.rgbStr(base,.82); blobPath(ctx,H,x,y,R,H.hash(r.id),.18,2.2,60); ctx.fill();
      if(r.fl[0]){ ctx.fillStyle=H.rgbStr(H.pastel(r.fl[0].rgb,.05,1.25),.6); blobPath(ctx,H,x+R*.12,y-R*.08,R*.45*(.6+.6*r.fl[0].w),H.hash(r.id)+5,.2,2,40); ctx.fill(); }
    }
    H.grain(ctx,W,.04,'multiply');
  }});

/* ---------------- s308 알코올 잉크 ---------------- */
add({id:'s308',name:'알코올 잉크',cat:'잉크',
  desc:'알코올 잉크가 서로 밀어내며 생긴 세포 무늬예요. 기록 하나가 방 하나이고, 잉크가 가장자리에 모여 금빛 경계가 생겨요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.35,10), Np=recs.map(r=>({r,x:.08+.84*r.x,y:.08+.84*r.y,w:.012*r.i*k,R:(.09+.07*r.i)*k,s:(H.hash(r.id)%100)*.7}));
    const gold=[.80,.68,.42], N=230;
    const cv=pixels(N,(u,v,o)=>{
      const wu=u+.045*(H.fbm(u*4,v*4,3)-.5), wv=v+.045*(H.fbm(u*4+5,v*4+9,3)-.5);
      let d1=9,d2=9,b=null,raw=9;
      for(const p of Np){ const dx=wu-p.x, dy=wv-p.y; const dd=Math.sqrt(dx*dx+dy*dy), d=dd-p.w; if(d<d1){ d2=d1; d1=d; b=p; raw=dd; } else if(d<d2) d2=d; }
      const out=b.R*(1+.25*(H.noise(wu*12+b.s,wv*12)-.5))-raw;     // 바깥 여백까지의 거리
      if(out<-.004){ o[3]=0; return; }
      const e=Math.min((d2-d1)*.5,out+.004);
      const t=H.fbm(wu*7+b.s,wv*7,3), vein=1-Math.abs(2*H.fbm(wu*5+b.s,wv*5+2,3)-1), fl=b.r.fl.length?b.r.fl[Math.floor(t*b.r.fl.length*1.5)%b.r.fl.length].rgb:b.r.tea, c=H.mix(b.r.tea,fl,H.ss(.72,.9,vein));
      const pc=H.pastel(c,.04,1.25);
      let col=H.mix(BGc,pc,.28+.35*H.fbm(wu*16,wv*16+b.s,2));
      col=H.mix(col,H.shade(pc,-.25),Math.exp(-e/.012)*.85);
      col=H.mix(col,gold,H.ss(.0045,.0012,e)*.9);
      o[0]=col[0]; o[1]=col[1]; o[2]=col[2]; o[3]=H.ss(-.004,.001,out);
    });
    blit(ctx,W,cv);
    H.grain(ctx,W,.04,'multiply');
  }});

/* ---------------- s309 홀치기 염색 ---------------- */
add({id:'s309',name:'홀치기 염색',cat:'물감',
  desc:'천을 비틀어 묶은 뒤 물들인 소용돌이 무늬예요. 맨 위에서 시계 방향으로 기록 순서대로 한 갈래씩 물들고, 진한 차일수록 갈래가 넓어요.',
  render(ctx,W,recs,H){
    const n=recs.length, tw=recs.map(r=>.5+r.i), sum=tw.reduce((a,b)=>a+b,0), cum=[]; let s=0; for(const t of tw){ cum.push(s/sum); s+=t; } cum.push(1);
    const cols=recs.map(r=>[H.pastel(r.tea,.12,1.25),H.pastel(fl0(r),.1,1.25)]);
    const N=230, find=f=>{ let lo=0,hi=n-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(cum[m]<=f) lo=m; else hi=m-1; } return lo; };
    const cv=pixels(N,(u,v,o)=>{
      const dx=u-.5, dy=v-.5, rho=Math.hypot(dx,dy), th=Math.atan2(dx,-dy);
      const nz=H.fbm(u*5,v*5,3)-.5;
      let f=th/TAU+rho*1.25+nz*.06; f-=Math.floor(f);
      const i=find(f), fw=(cum[i+1]-cum[i]), loc=(f-cum[i])/fw;
      const j=(i+1)%n, bl=H.ss(.6,1.05,loc+nz*.4)*.5;
      const ci=cols[i], cj=cols[j];
      const band=H.ss(.35,.65,.5+.5*Math.sin(rho*28+nz*6));      // 찻물색 ↔ 풍미색 띠
      const a=H.mix(ci[0],ci[1],band*.6), b=H.mix(cj[0],cj[1],band*.6);
      let col=H.mix(a,b,bl);
      const ridge=1-Math.abs(2*H.fbm(u*7+2,v*7,3)-1), white=H.ss(.84,.96,ridge)*.75+H.ss(.07,.0,rho);
      col=H.mix(col,[.98,.975,.96],Math.min(1,white));
      const fade=H.ss(.5,.47,rho+nz*.05);
      col=H.mix(BGc,col,fade);
      o[0]=col[0]; o[1]=col[1]; o[2]=col[2];
    });
    blit(ctx,W,cv,Math.max(1,Math.round(W/480)));
    H.grain(ctx,W,.06,'soft-light');
  }});

/* ---------------- s310 화선지 번짐 ---------------- */
add({id:'s310',name:'화선지 번짐',cat:'잉크',bg:'#F6F3EC',
  desc:'화선지에 먹을 찍은 듯 기록마다 한 점이 섬유를 따라 번져요. 가운데는 찻물 색, 번진 물 자리엔 풍미 색 테두리가 남아요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), bg=H.hex2rgb('#F6F3EC');
    const LP=spread(recs,W,r=>W*(.035+.035*r.i)*k,{gap:.85}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    const Q=recs.map(r=>({r,x:AT.get(r).x/W,y:AT.get(r).y/W,R:(.035+.035*r.i)*k,ink:H.shade(H.pastel(r.tea,0,1.15),-.2),halo:H.pastel(fl0(r),.15,1.2),s:(H.hash(r.id)%300)*.31}));
    const N=240;
    const cv=pixels(N,(u,v,o)=>{
      const fib=.6*H.noise(u*70,v*9)+.4*H.noise(u*11,v*80);
      let col=bg;
      for(const q of Q){ const dx=u-q.x, dy=v-q.y; if(Math.abs(dx)>q.R*1.6||Math.abs(dy)>q.R*1.6) continue;
        const d=Math.sqrt(dx*dx+dy*dy); if(d>q.R*1.6) continue;
        const ang=Math.atan2(dy,dx), Re=q.R*(1+.32*(fib-.5)+.18*(H.noise(Math.cos(ang)*1.8+q.s,Math.sin(ang)*1.8)-.5)), qq=d/Re;
        if(qq>1.12) continue;
        const core=H.ss(.75,.25,qq), halo=H.ss(1.04,.94,qq), tide=Math.exp(-(((qq-.98)/.05)**2));
        const c=H.mix(q.halo,q.ink,core), a=Math.min(1,halo*(.22+.55*core*(.5+.5*q.r.i))*(.85+.3*fib)+tide*.22);
        col=H.mix(col,c,a);
      }
      o[0]=col[0]; o[1]=col[1]; o[2]=col[2];
    });
    blit(ctx,W,cv);
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s311 압화 ---------------- */
add({id:'s311',name:'압화 노트',cat:'자연',bg:'#F6F3EC',
  desc:'기록 한 잔이 눌러 말린 꽃 한 송이예요. 꽃잎은 풍미 색, 가운데는 찻물 색이고, 별점이 높을수록 꽃잎이 겹으로 피어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10);
    const LP=spread(recs,W,r=>W*(.035+.035*r.i)*k,{gap:.85}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    const petal=(L,wd)=>{ ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(L*.25,-wd,L*.85,-wd*.9,L,0); ctx.bezierCurveTo(L*.85,wd*.9,L*.25,wd,0,0); };
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+11), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r, rot=rr()*TAU;
      const fls=r.fl.length?r.fl:[{rgb:r.tea,w:1}], np=5+Math.round(rr()*2)+(fls.length>2?1:0), layers=r.stars>=3?2:1;
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      for(let l=layers-1;l>=0;l--){
        for(let p=0;p<np;p++){
          const tot=fls.reduce((a,f)=>a+f.w,0); let t=(p+.5)/np*tot, f=fls[0]; for(const q of fls){ t-=q.w; if(t<=0){ f=q; break; } }
          const a=p/np*TAU+l*Math.PI/np+H.gauss(rr)*.12, L=R*(1-.28*l)*(.85+.3*rr()), wd=L*(.32+.08*rr());
          const c=H.pastel(f.rgb,.12+.1*l,1.15);
          ctx.save(); ctx.rotate(a);
          const g=ctx.createLinearGradient(0,0,L,0); g.addColorStop(0,H.rgbStr(H.mix(c,r.tea,.3),.75)); g.addColorStop(1,H.rgbStr(c,.6));
          ctx.fillStyle=g; petal(L,wd); ctx.fill();
          ctx.strokeStyle=H.rgbStr(H.shade(c,-.3),.3); ctx.lineWidth=Math.max(.5,W*.0011); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(L*.12,0); ctx.lineTo(L*.8,0); ctx.moveTo(L*.3,0); ctx.quadraticCurveTo(L*.55,-wd*.15,L*.7,-wd*.35); ctx.moveTo(L*.3,0); ctx.quadraticCurveTo(L*.55,wd*.15,L*.7,wd*.35);
          ctx.strokeStyle=H.rgbStr([1,1,1],.4); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.fillStyle=H.rgbStr(H.shade(H.pastel(r.tea,0,1.2),-.1),.9); ctx.beginPath(); ctx.arc(0,0,R*.2,0,TAU); ctx.fill();
      ctx.fillStyle=H.rgbStr(H.shade(r.tea,-.35),.5);
      for(let q=0;q<7;q++){ const a=q/7*TAU+rr(), d=R*(.25+.06*rr()); ctx.beginPath(); ctx.arc(Math.cos(a)*d,Math.sin(a)*d,Math.max(.6,R*.035),0,TAU); ctx.fill(); }
      ctx.restore();
    }
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s312 지의류 ---------------- */
add({id:'s312',name:'돌 위의 지의류',cat:'자연',bg:'#F3F2EE',
  desc:'기록 하나가 돌 위에 자라는 지의류 한 무리예요. 오래된 기록일수록 넓게 자랐고, 이웃과 만나면 경계를 두고 멈춰요. 작은 점은 풍미 색이에요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.42,10), mA=maxAge(recs), RF=r=>W*(.04+.1*Math.sqrt(r.daysAgo/mA+.05)*(.6+.4*r.i))*k;
    const LP=spread(recs,W,RF,{gap:.7}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    const C=recs.map(r=>({r,x:AT.get(r).x,y:AT.get(r).y,R:RF(r),s:(H.hash(r.id)%400)*.29,
      body:H.pastel(r.tea,.18,1.1),edge:H.pastel(r.tea,.05,1.25)}));
    const d=W*.0095, pts=H.poisson(W,d,5), gray=[.78,.78,.76];
    for(const [px,py] of pts){
      let best=null,bq=9;
      for(const c of C){ const dx=px-c.x, dy=py-c.y; if(Math.abs(dx)>c.R*1.2||Math.abs(dy)>c.R*1.2) continue;
        const ang=Math.atan2(dy,dx), Re=c.R*(1+.22*(H.noise(Math.cos(ang)*2.2+c.s,Math.sin(ang)*2.2)-.5)), q=Math.hypot(dx,dy)/Re; if(q<bq){ bq=q; best=c; } }
      if(!best||bq>1) continue;
      const ring=.5+.5*Math.cos(bq*TAU*3.2), rim=H.ss(.75,1,bq);
      const col=H.mix(H.mix(gray,best.body,.55+.3*ring),best.edge,rim);
      const sz=d*(.32+.2*ring+.12*rim)*(bq>.96?.6:1);
      const h=H.hash(px.toFixed(1)+','+py.toFixed(1))%100;
      if(h<7&&best.r.fl.length&&bq<.85){ const f=best.r.fl[h%best.r.fl.length].rgb; ctx.fillStyle=H.rgbStr(H.pastel(f,.05,1.2),.9); ctx.beginPath(); ctx.arc(px,py,d*.42,0,TAU); ctx.fill();
        ctx.fillStyle=H.rgbStr(H.shade(f,-.3),.6); ctx.beginPath(); ctx.arc(px,py,d*.17,0,TAU); ctx.fill(); continue; }
      ctx.fillStyle=H.rgbStr(col,.9); ctx.beginPath(); ctx.arc(px,py,sz,0,TAU); ctx.fill();
    }
    H.grain(ctx,W,.05,'multiply');
  }});

/* ---------------- s313 지층 ---------------- */
add({id:'s313',name:'시간의 지층',cat:'자연',bg:'#F6F4EF',
  desc:'마신 차가 아래부터 한 겹씩 쌓인 지층이에요. 맨 아래가 처음 마신 차, 맨 위가 최근 차이고, 진한 차일수록 층이 두꺼워요. 작은 렌즈는 풍미예요.',
  render(ctx,W,recs,H){
    const n=recs.length, th=recs.map(r=>.4+r.i), sum=th.reduce((a,b)=>a+b,0), total=W*.74, stone=[.82,.79,.74];
    const NX=70, x0=-W*.1, x1=W*1.1;
    const fold=x=>W*.045*Math.sin(x/W*2.4+.6)+W*.05*(H.fbm(x/W*1.6,3.3,3)-.5);
    const bound=(i,cy)=>{ const a=[]; for(let q=0;q<=NX;q++){ const x=x0+(x1-x0)*q/NX; a.push([x,cy+fold(x)*(.6+.4*cy/W)+W*.006*(H.noise(x/W*7,i*.7)-.5)]); } return a; };
    ctx.save(); ctx.translate(W/2,W/2); ctx.rotate(-.07); ctx.translate(-W/2,-W/2);
    let y=W*1.04; let lower=bound(-1,W*1.2);
    recs.forEach((r,i)=>{
      const t=th[i]/sum*total, upper=bound(i,y-t);
      const col=H.mix(H.pastel(r.tea,.15,1.05),stone,.22);
      ctx.fillStyle=H.rgbStr(col); ctx.beginPath(); upper.forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); for(let q=lower.length-1;q>=0;q--) ctx.lineTo(lower[q][0],lower[q][1]); ctx.closePath(); ctx.fill();
      // 얇은 결
      if(t>W*.012){ ctx.strokeStyle=H.rgbStr(H.shade(col,-.12),.25); ctx.lineWidth=Math.max(.5,W*.001);
        for(let l=1;l<3;l++){ ctx.beginPath(); upper.forEach((p,q)=>{ const yy=p[1]+(lower[q][1]-p[1])*l/3; q?ctx.lineTo(p[0],yy):ctx.moveTo(p[0],yy); }); ctx.stroke(); } }
      // 풍미 렌즈
      const rr=H.rng(H.hash(r.id)+5);
      r.fl.forEach(f=>{ const cnt=Math.max(1,Math.round(f.w*3*(n>50?.6:1))); for(let c=0;c<cnt;c++){ const q=Math.floor(rr()*NX), mid=(upper[q][1]+lower[q][1])/2, hh=Math.max(.7,Math.min(W*.006,(lower[q][1]-upper[q][1])*.22)), L=W*(.015+.03*rr())*(.5+f.w);
        ctx.fillStyle=H.rgbStr(H.pastel(f.rgb,.08,1.2),.8); ctx.beginPath(); ctx.ellipse(upper[q][0],mid,L,hh,0,0,TAU); ctx.fill(); } });
      ctx.strokeStyle=H.rgbStr(H.shade(col,-.25),.35); ctx.lineWidth=Math.max(.5,W*.0012); ctx.beginPath(); upper.forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke();
      lower=upper; y-=t;
    });
    ctx.restore();
    H.grain(ctx,W,.07,'multiply');
  }});

/* ---------------- s314 마노 단면 ---------------- */
add({id:'s314',name:'마노 단면',cat:'자연',
  desc:'잘라낸 마노 돌의 띠무늬예요. 바깥 띠가 처음 마신 차, 안쪽으로 갈수록 최근 차이고, 띠 안의 가는 줄은 풍미 색이에요.',
  render(ctx,W,recs,H){
    const n=recs.length, th=recs.map(r=>.45+r.i), sum=th.reduce((a,b)=>a+b,0), cum=[0]; th.forEach(t=>cum.push(cum[cum.length-1]+t/sum*.8));
    const subs=recs.map(r=>{ const cs=n>40?r.colors.slice(0,2):r.colors, tot=cs.reduce((a,c)=>a+c.w,0); let s=0; return cs.map(c=>{ s+=c.w/tot; return [s,H.pastel(c.rgb,.1,1.15)]; }); });
    const N=340, rim=[.55,.5,.47];
    const cv=pixels(N,(u,v,o)=>{
      const dx=u-.5, dy=v-.5, rho=Math.hypot(dx,dy), a=Math.atan2(dy,dx);
      const R=.43*(1+.16*(H.fbm(Math.cos(a)*1.3+3,Math.sin(a)*1.3+1,3)-.5))*(1+.05*Math.cos(2*a+.5));
      let d=1-rho/R; if(d<-.01){ o[3]=0; return; }
      d+= .035*(H.fbm(u*5,v*5,3)-.5)*H.ss(0,.15,d);
      let col;
      if(d<.025){ col=H.mix(rim,[.72,.68,.62],H.ss(0,.025,d)); }
      else if(d-.025>=.8){ // 가운데 수정
        const c=H.fbm(u*9,v*9,3); col=H.mix([.97,.965,.955],[.86,.875,.89],H.ss(.4,.75,c)*H.ss(.8,.9,d-.025)); }
      else { const dd0=d-.025, dl=1/(N*R)*.3; col=[0,0,0];
        for(let ss=-1.5;ss<=1.5;ss+=1){ const dd=Math.max(0,Math.min(.7999,dd0+ss*dl)); let lo=0,hi=n-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(cum[m]<=dd) lo=m; else hi=m-1; }
          const loc=(dd-cum[lo])/(cum[lo+1]-cum[lo]); const sb=subs[lo]; let c=sb[sb.length-1][1]; for(const [s,cc] of sb){ if(loc<=s){ c=cc; break; } }
          const fine=n>40?0:.5+.5*Math.sin(dd*360);
          let cc=H.mix(c,H.shade(c,.25),fine*.2); cc=H.mix(cc,H.shade(c,-.15),H.ss(.9,1,loc)*.4);
          col[0]+=cc[0]/4; col[1]+=cc[1]/4; col[2]+=cc[2]/4; }
      }
      o[0]=col[0]; o[1]=col[1]; o[2]=col[2]; o[3]=H.ss(-.01,.004,d);
    });
    blit(ctx,W,cv);
    H.grain(ctx,W,.05,'soft-light');
  }});

/* ---------------- s315 노을 구름 ---------------- */
add({id:'s315',name:'노을 구름',cat:'자연',
  desc:'하늘의 색은 그 높이에 있는 기록들의 색이고, 기록 하나가 가늘게 흐르는 구름 한 줄이에요. 맛이 좋았던 차일수록 높이 떠 있어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), sig=.16;
    const g=ctx.createLinearGradient(0,0,0,W);
    for(let s=0;s<=24;s++){ const v=s/24; let r=0,gg=0,b=0,ws=1e-9;
      for(const q of recs){ const w=Math.exp(-((((.08+.84*q.y)-v)/sig)**2))*(.4+q.i)+1e-6; const c=H.mix(q.tea,fl0(q),.35); r+=H.lin(c[0])*w; gg+=H.lin(c[1])*w; b+=H.lin(c[2])*w; ws+=w; }
      const c=[H.gam(r/ws),H.gam(gg/ws),H.gam(b/ws)];
      g.addColorStop(v,H.rgbStr(H.mix(BGc,H.pastel(c,.45,1.05),.7))); }
    ctx.fillStyle=g; ctx.fillRect(0,0,W,W);
    const lay=mk(W), L=lay.getContext('2d'); L.lineCap='round';
    for(const r of recs){ const rr=H.rng(H.hash(r.id)+2), x=P(r.x,W), y=P(r.y,W), len=W*(.12+.2*r.i)*k;
      for(let q=0;q<4;q++){ const c=q<2?H.pastel(r.tea,.08,1.2):H.pastel(pick(r,rr()),.1,1.2), ox=(rr()-.5)*len*.4, oy=(q-1.5)*W*.0045*k+(rr()-.5)*W*.003, l=len*(.45+.55*rr());
        L.strokeStyle=H.rgbStr(q===3?[1,.98,.95]:c,q===3?.7:.55); L.lineWidth=W*(.0025+.003*r.i)*k*(q===3?.6:1);
        L.beginPath(); L.moveTo(x+ox-l/2,y+oy+W*.002); L.quadraticCurveTo(x+ox,y+oy-W*.006*k,x+ox+l/2,y+oy+W*.001); L.stroke(); }
    }
    blit(ctx,W,lay,Math.max(1,Math.round(W*.003)),.8);
    blit(ctx,W,lay,0,.55);
    H.grain(ctx,W,.04,'soft-light');
  }});

/* ---------------- s316 연못 파문 ---------------- */
add({id:'s316',name:'연못 파문',cat:'자연',bg:'#F3F5F3',
  desc:'기록 한 잔이 연못에 떨어진 물방울 하나예요. 오래된 기록일수록 물결이 멀리 퍼져 희미해지고, 최근 기록은 작고 또렷해요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.35,10), mA=maxAge(recs), lw=Math.max(.6,W*.0016);
    for(const r of recs){
      const x=P(r.x,W), y=P(r.y,W), age=r.daysAgo/mA, Ro=W*(.02+.16*Math.sqrt(age))*k, m=n>50?3:4, gap=W*(.007+.004*r.i);
      const cols=r.colors.map(c=>H.shade(H.pastel(c.rgb,0,1.2),-.12)), A=(.35+.5*r.i)*(1-.55*age)*(n>50?.8:1);
      for(let j=0;j<m;j++){ const rad=Ro-j*gap*(1+j*.3); if(rad<W*.003) break;
        ctx.strokeStyle=H.rgbStr(cols[j%cols.length],A*(1-j/(m+.5))); ctx.lineWidth=lw*(1-j*.15);
        ctx.beginPath(); ctx.ellipse(x,y,rad,rad*.97,0,0,TAU); ctx.stroke(); }
      if(age<.25){ ctx.fillStyle=H.rgbStr(cols[0],.6); ctx.beginPath(); ctx.arc(x,y,W*.004,0,TAU); ctx.fill(); }
    }
    H.grain(ctx,W,.03);
  }});

/* ---------------- s317 연잎 ---------------- */
add({id:'s317',name:'연잎 연못',cat:'자연',bg:'#F2F4F1',
  desc:'위에서 내려다본 연못에 기록마다 연잎이 한 장씩 떠 있어요. 잎 가운데는 찻물 색, 가장자리는 풍미 색이고, 별 셋 받은 차엔 꽃이 피어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), bg=H.hex2rgb('#F2F4F1');
    const LP=spread(recs,W,r=>W*(.032+.04*r.i)*k,{gap:.85}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));

    const flowers=[];
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+4), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r, na=rr()*TAU, nt=.1, s=H.hash(r.id);
      const path=()=>{ ctx.beginPath(); ctx.moveTo(x+Math.cos(na)*R*.08,y+Math.sin(na)*R*.08); const N=60;
        for(let i=0;i<=N;i++){ const a=na+nt+(TAU-2*nt)*i/N, rad=R*(1+.04*(H.noise(Math.cos(a)*2+s%50,Math.sin(a)*2)-.5)); ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad); } ctx.closePath(); };
      path(); ctx.strokeStyle=H.rgbStr(bg,.95); ctx.lineWidth=W*.006; ctx.stroke();
      const g=ctx.createRadialGradient(x,y,0,x,y,R); g.addColorStop(0,H.rgbStr(H.pastel(r.tea,.15,1.15))); g.addColorStop(.6,H.rgbStr(H.pastel(H.mix(r.tea,fl0(r),.4),.15,1.15))); g.addColorStop(1,H.rgbStr(H.pastel(fl0(r),.12,1.2)));
      ctx.fillStyle=g; path(); ctx.fill();
      ctx.strokeStyle=H.rgbStr(H.shade(r.tea,-.3),.25); ctx.lineWidth=Math.max(.5,W*.001); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=Math.max(.5,W*.0011); ctx.beginPath();
      const nv=13; for(let v=1;v<nv;v++){ const a=na+nt+(TAU-2*nt)*v/nv; ctx.moveTo(x+Math.cos(a)*R*.1,y+Math.sin(a)*R*.1); ctx.quadraticCurveTo(x+Math.cos(a+.06)*R*.55,y+Math.sin(a+.06)*R*.55,x+Math.cos(a)*R*.9,y+Math.sin(a)*R*.9); }
      ctx.stroke();
      ctx.fillStyle=H.rgbStr(H.shade(r.tea,-.15),.5); ctx.beginPath(); ctx.arc(x,y,R*.07,0,TAU); ctx.fill();
      if(r.stars>=3) flowers.push([x+Math.cos(na+Math.PI*.8)*R*.75,y+Math.sin(na+Math.PI*.8)*R*.75,R,r]);
    }
    for(const [fx,fy,R,r] of flowers){ const c=H.pastel(r.fl.length?r.fl[0].rgb:[.91,.66,.78],.25,1.15), pr=R*.32;
      for(let l=0;l<2;l++) for(let p=0;p<6;p++){ const a=p/6*TAU+l*.5; ctx.fillStyle=H.rgbStr(l?H.shade(c,.3):c,.92); ctx.save(); ctx.translate(fx,fy); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(pr*(.5-l*.15),0,pr*(.55-l*.15),pr*.24,0,0,TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle=H.rgbStr([.93,.8,.4]); ctx.beginPath(); ctx.arc(fx,fy,pr*.18,0,TAU); ctx.fill(); }
    H.grain(ctx,W,.03);
  }});

/* ---------------- s318 포자 무늬 ---------------- */
add({id:'s318',name:'버섯 포자 무늬',cat:'자연',bg:'#F7F5F0',
  desc:'버섯 갓을 종이에 얹어 받은 포자 무늬예요. 기록마다 한 장이고, 주름의 색 비율이 찻물과 풍미의 비율이에요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10);
    const LP=spread(recs,W,r=>W*(.045+.045*r.i)*k,{gap:.8}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    ctx.lineCap='round';
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+9), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r, G=Math.round(70+90*R/(W*.09));
      const cs=r.colors, tot=cs.reduce((a,c)=>a+c.w,0), A=(.42+.35*r.i)*(n>50?.85:1), rot=rr()*TAU;
      let a0=rot;
      cs.forEach(c=>{ const span=c.w/tot*TAU, g=Math.max(2,Math.round(G*c.w/tot)), col=H.shade(H.pastel(c.rgb,0,1.25),-.15);
        ctx.strokeStyle=H.rgbStr(col,A); ctx.lineWidth=Math.max(.45,W*.0009); ctx.beginPath();
        for(let q=0;q<g;q++){ const a=a0+span*(q+.5)/g+(rr()-.5)*.01, inner=q%2?R*.5:q%4===2?R*.32:R*.16, outer=R*(.9+.1*H.noise(Math.cos(a)*2+x*.01,Math.sin(a)*2));
          ctx.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner); ctx.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer); }
        ctx.stroke(); a0+=span; });
      const g=ctx.createRadialGradient(x,y,R*.2,x,y,R); const tc=H.pastel(r.tea,.1,1.1);
      g.addColorStop(0,H.rgbStr(tc,0)); g.addColorStop(.75,H.rgbStr(tc,.05*r.i)); g.addColorStop(1,H.rgbStr(tc,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.fill();
    }
    H.grain(ctx,W,.04,'multiply');
  }});

/* ---------------- s319 찻김 ---------------- */
add({id:'s319',name:'민들레 홀씨',cat:'자연',
  desc:'기록 한 잔이 민들레 홀씨 한 송이예요. 가운데는 찻물 색, 가는 갓털 끝은 풍미 색이고, 진한 차일수록 갓털이 길고 많아요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10);
    const LP=spread(recs,W,r=>W*(.045+.04*r.i)*k,{gap:.8}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    ctx.lineCap='round';
    const lw=Math.max(.5,W*.0011), al=n>50?.75:1;
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+1), x=AT.get(r).x, y=AT.get(r).y, R=AT.get(r).r, M=Math.round((26+30*r.i)*(n>50?.7:1));
      const tc=H.shade(H.pastel(r.tea,0,1.2),-.15);
      for(let q=0;q<M;q++){
        const a=(q+rr()*.6)/M*TAU, L=R*(.75+.25*rr()), tilt=Math.sqrt(rr()), ex=x+Math.cos(a)*L*tilt, ey=y+Math.sin(a)*L*tilt;
        ctx.strokeStyle=H.rgbStr(tc,.35*al); ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*R*.12,y+Math.sin(a)*R*.12); ctx.lineTo(ex,ey); ctx.stroke();
        const c=H.pastel(pick(r,rr()),0,1.25), fr=R*(.16+.08*r.i)*tilt;
        ctx.strokeStyle=H.rgbStr(c,.55*al); ctx.beginPath();
        for(let h=-3;h<=3;h++){ const b=a+h*.2; ctx.moveTo(ex,ey); ctx.lineTo(ex+Math.cos(b)*fr,ey+Math.sin(b)*fr); }
        ctx.stroke();
      }
      ctx.fillStyle=H.rgbStr(tc,.7); ctx.beginPath(); ctx.arc(x,y,R*.1,0,TAU); ctx.fill();
      ctx.fillStyle=H.rgbStr(H.pastel(r.tea,.3),.9); ctx.beginPath(); ctx.arc(x-R*.025,y-R*.025,R*.045,0,TAU); ctx.fill();
    }
    H.grain(ctx,W,.035,'multiply');
  }});

/* ---------------- s320 찻잎 ---------------- */
add({id:'s320',name:'펼쳐진 찻잎',cat:'자연',bg:'#F5F4EE',
  desc:'우리고 난 찻잎을 하나씩 펼쳐 놓았어요. 잎자루는 찻물 색, 잎끝으로 갈수록 풍미 색이고, 오래된 기록일수록 잎이 활짝 펴져 있어요.',
  render(ctx,W,recs,H){
    const n=recs.length, k=kN(n,.3,10), mA=maxAge(recs);
    const LP=spread(recs,W,r=>W*(.03+.03*r.i)*k,{gap:.85}), AT=new Map(recs.map((r,i)=>[r,LP[i]]));
    for(const r of recs){
      const rr=H.rng(H.hash(r.id)+6), x=AT.get(r).x, y=AT.get(r).y, Lf=W*(.06+.06*r.i)*k, open=.45+.55*Math.sqrt(r.daysAgo/mA), wd=Lf*.19*open;
      const ang=(H.noise(r.x*2.5,r.y*2.5)-.5)*5+H.gauss(rr)*.4;
      ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.translate(-Lf/2,0);
      const edge=sgn=>{ const pts=[]; for(let q=0;q<=40;q++){ const t=q/40; let w=wd*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.75)*(1-.2*t); w*=1+.07*(((t*13)%1)<.5?((t*13)%1)*2:(1-((t*13)%1))*2)*(t>.08&&t<.95?1:0); pts.push([t*Lf,sgn*w]); } return pts; };
      const top=edge(-1), bot=edge(1);
      const g=ctx.createLinearGradient(0,0,Lf,0); g.addColorStop(0,H.rgbStr(H.pastel(r.tea,.1,1.15),.9)); g.addColorStop(1,H.rgbStr(H.pastel(fl0(r),.12,1.2),.85));
      ctx.fillStyle=g; ctx.beginPath(); top.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); for(let i=bot.length-1;i>=0;i--) ctx.lineTo(bot[i][0],bot[i][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=H.rgbStr(H.shade(r.tea,-.3),.3); ctx.lineWidth=Math.max(.5,W*.001); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(-Lf*.1,0); ctx.lineTo(Lf*.96,0);
      for(let v=1;v<7;v++){ const t=v/7.5; for(const sg of [-1,1]){ ctx.moveTo(t*Lf,0); ctx.quadraticCurveTo((t+.06)*Lf,sg*wd*.35,(t+.14)*Lf,sg*wd*.7); } }
      ctx.stroke();
      if(r.fl[1]){ ctx.fillStyle=H.rgbStr(H.pastel(r.fl[1].rgb,.1,1.2),.45); ctx.beginPath(); ctx.ellipse(Lf*.62,-wd*.3,Lf*.1,wd*.25,.2,0,TAU); ctx.fill(); }
      ctx.restore();
    }
    H.grain(ctx,W,.04,'multiply');
  }});
})();
