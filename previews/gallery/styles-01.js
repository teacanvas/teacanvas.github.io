/* =========================================================
   TEA CANVAS 갤러리 — 묶음 01 · 점·입자·빛 (s101~s120)
   ========================================================= */
(function(){
const TAU=Math.PI*2;
const dens=N=>Math.sqrt(10/Math.max(10,N));          // 10잔=1, 50잔≈.45, 100잔≈.32
const lin=v=>Math.pow(v,2.2);
const gam=v=>Math.pow(v<0?0:v,1/2.2);
const cl=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const ssf=(a,b,x)=>{ const t=cl((x-a)/(b-a)); return t*t*(3-2*t); };

/* 기록 위치 근처에서 '기록 하나'를 확률적으로 고르는 도구 (색을 섞지 않고 점마다 순수한 색을 쓰기 위해) */
function picker(recs,R,H){
  const N=recs.length, xs=new Float32Array(N), ys=new Float32Array(N), s2=new Float32Array(N), a=new Float32Array(N), w=new Float32Array(N);
  recs.forEach((r,k)=>{ const rr=R*(.75+.5*r.i); xs[k]=r.x; ys[k]=r.y; s2[k]=2*rr*rr; a[k]=.6+.4*r.i; });
  return (u,v,rnd)=>{
    let tot=0;
    for(let k=0;k<N;k++){ const dx=u-xs[k], dy=v-ys[k], d2=dx*dx+dy*dy; const e=d2>4.5*s2[k]?0:a[k]*Math.exp(-d2/s2[k]); w[k]=e; tot+=e; }
    if(tot<1e-4) return null;
    let t=rnd()*tot, k=0; for(;k<N-1;k++){ t-=w[k]; if(t<=0) break; }
    return {rec:recs[k],cov:1-Math.exp(-tot*1.6),tot};
  };
}
function pickColor(rec,rnd,teaW=.8){
  let tot=teaW; for(let k=1;k<rec.colors.length;k++) tot+=rec.colors[k].w;
  let t=rnd()*tot-teaW; if(t<=0) return rec.colors[0].rgb;
  for(let k=1;k<rec.colors.length;k++){ t-=rec.colors[k].w; if(t<=0) return rec.colors[k].rgb; }
  return rec.colors[rec.colors.length-1].rgb;
}

/* 기록 색을 가우시안으로 흩뿌려 만든 색면 (선형 공간 평균) */
function cfield(recs,n,H,o={}){
  const rad=o.rad??.09, sharp=o.sharp??2, sel=o.sel||(()=>true), teaW=o.teaW??.9, covK=o.covK??1.8;
  const N=recs.length, ds=o.noDens?1:(.5+.5*dens(N));
  const acc=new Float32Array(n*n*3), ws=new Float32Array(n*n), tot=new Float32Array(n*n);
  let mr=0,mg=0,mb=0,mw=0;
  recs.forEach(r=>{
    const R=rad*(.7+.5*r.i)*ds, rr=H.rng(H.hash(r.id)+7);
    r.colors.forEach((c,k)=>{
      if(!sel(k,c,r)) return;
      const w=(k===0?teaW:c.w)*(.6+.4*r.i), ang=rr()*TAU, off=k===0?0:R*.6, s=k===0?R:R*.72;
      const px=r.x+Math.cos(ang)*off, py=r.y+Math.sin(ang)*off, L=c.rgb.map(lin), s2=2*s*s;
      mr+=L[0]*w; mg+=L[1]*w; mb+=L[2]*w; mw+=w;
      const i0=Math.max(0,Math.floor((px-3*s)*n)), i1=Math.min(n-1,Math.ceil((px+3*s)*n)), j0=Math.max(0,Math.floor((py-3*s)*n)), j1=Math.min(n-1,Math.ceil((py+3*s)*n));
      for(let j=j0;j<=j1;j++){ const dy=(j+.5)/n-py; for(let i=i0;i<=i1;i++){ const dx=(i+.5)/n-px, e=w*Math.exp(-(dx*dx+dy*dy)/s2); if(e<1e-5) continue;
        const q=j*n+i, ww=sharp===1?e:Math.pow(e,sharp); acc[q*3]+=L[0]*ww; acc[q*3+1]+=L[1]*ww; acc[q*3+2]+=L[2]*ww; ws[q]+=ww; tot[q]+=e; } }
    });
  });
  const mean=mw?[mr/mw,mg/mw,mb/mw]:[.8,.8,.8];
  const g=new Float32Array(n*n*3), cov=new Float32Array(n*n);
  for(let q=0;q<n*n;q++){
    const W=ws[q]; let r,gg,b;
    if(W>1e-9){ r=acc[q*3]/W; gg=acc[q*3+1]/W; b=acc[q*3+2]/W; const t=ssf(0,1e-4,W); r=mean[0]+(r-mean[0])*t; gg=mean[1]+(gg-mean[1])*t; b=mean[2]+(b-mean[2])*t; }
    else { r=mean[0]; gg=mean[1]; b=mean[2]; }
    g[q*3]=gam(r); g[q*3+1]=gam(gg); g[q*3+2]=gam(b); cov[q]=1-Math.exp(-tot[q]*covK);
  }
  return {n,g,cov,mean:mean.map(gam)};
}
/* 바이리니어 샘플 → [r,g,b(감마),cov] (out 배열 재사용) */
function fs(F,u,v,out=[0,0,0,0]){
  const n=F.n, x=cl(u*n-.5,0,n-1.001), y=cl(v*n-.5,0,n-1.001), i=x|0, j=y|0, fx=x-i, fy=y-j;
  const a=j*n+i, b=a+1, c=a+n, d=c+1, wa=(1-fx)*(1-fy), wb=fx*(1-fy), wc=(1-fx)*fy, wd=fx*fy;
  for(let k=0;k<3;k++) out[k]=F.g[a*3+k]*wa+F.g[b*3+k]*wb+F.g[c*3+k]*wc+F.g[d*3+k]*wd;
  out[3]=F.cov[a]*wa+F.cov[b]*wb+F.cov[c]*wc+F.cov[d]*wd; return out;
}
const off=(w,h=w)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
const rgba=(c,a=1)=>`rgba(${Math.round(cl(c[0])*255)},${Math.round(cl(c[1])*255)},${Math.round(cl(c[2])*255)},${a})`;
const lift=(c,t)=>c.map(v=>v+(1-v)*t);
const satur=(c,s)=>{ const l=.2126*c[0]+.7152*c[1]+.0722*c[2]; return c.map(v=>cl(l+(v-l)*s)); };

const A=s=>GALLERY.add(s);

/* ───────── 001 블루노이즈 점묘 ───────── */
A({id:'s101',name:'블루노이즈 점묘',cat:'점묘',
  desc:'고르게 흩어진 작은 점들이 모여 색을 이뤄요. 점 하나하나는 근처 기록의 찻물색·풍미색 중 하나라, 멀리서 보면 눈 안에서 섞여요.',
  render(ctx,W,recs,H){
    const N=recs.length, rnd=H.rng(101), P=picker(recs,.062*(.55+.45*dens(N)),H);
    const d=W*.0095, pts=H.poisson(W,d,7);
    for(const [x,y] of pts){
      const p=P(x/W,y/W,rnd); if(!p) continue; if(rnd()>p.cov*1.15) continue;
      const c=H.pastel(pickColor(p.rec,rnd),.03,1.12), rr=d*.5*(.3+.6*Math.sqrt(p.cov));
      ctx.fillStyle=rgba(c,.95); ctx.beginPath(); ctx.arc(x,y,rr,0,TAU); ctx.fill();
    }
  }});

/* ───────── 002 하프톤 로제트 ───────── */
A({id:'s102',name:'하프톤 로제트',cat:'점묘',
  desc:'인쇄 망점처럼 세 겹의 점 격자가 각도를 달리해 겹쳐요. 찻물색·첫 풍미·나머지 풍미가 한 판씩, 기록이 많은 곳일수록 망점이 커져요.',
  bg:'#F8F6F1',
  render(ctx,W,recs,H){
    const layers=[
      {F:cfield(recs,80,H,{sel:k=>k===0,rad:.075,covK:1.1}),ang:15},
      {F:cfield(recs,80,H,{sel:k=>k===1,rad:.075,covK:1.3}),ang:75},
      {F:cfield(recs,80,H,{sel:k=>k>=2,rad:.075,covK:1.6}),ang:45},
    ];
    const s=W/48, o=[0,0,0,0], M=Math.ceil(W*.75/s);
    ctx.save();
    layers.forEach(L=>{
      const a=L.ang*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
      for(let j=-M;j<=M;j++) for(let i=-M;i<=M;i++){
        const x=W/2+(i*ca-j*sa)*s, y=W/2+(i*sa+j*ca)*s; if(x<-s||y<-s||x>W+s||y>W+s) continue;
        fs(L.F,x/W,y/W,o); if(o[3]<.03) continue;
        const r=s*.42*Math.sqrt(o[3]); if(r<.3) continue;
        ctx.fillStyle=rgba(H.pastel([o[0],o[1],o[2]],.12,1.35),.82); ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
      }
    });
    ctx.restore();
  }});

/* ───────── 003 쇠라의 붓점 ───────── */
A({id:'s103',name:'쇠라의 오후',cat:'점묘',
  desc:'짧은 붓점이 화면 전체를 덮어요. 바탕은 옅은 하늘빛·모래빛 점, 기록이 있는 곳엔 그 기록의 색 점이 결을 따라 놓여요.',
  bg:'#F5F2EA',
  render(ctx,W,recs,H){
    const N=recs.length, rnd=H.rng(303), P=picker(recs,.085*(.5+.5*dens(N)),H);
    const sky=[.84,.89,.91], sand=[.94,.9,.82];
    ctx.lineCap='round';
    const dab=(x,y,c,a,len,wid)=>{ ctx.strokeStyle=c; ctx.lineWidth=wid; ctx.beginPath(); ctx.moveTo(x-Math.cos(a)*len/2,y-Math.sin(a)*len/2); ctx.lineTo(x+Math.cos(a)*len/2,y+Math.sin(a)*len/2); ctx.stroke(); };
    const flow=(x,y)=>-.5+(H.fbm(x/W*2.2,y/W*2.2,3)-.5)*2.4;
    const d1=W*.013; for(const [x,y] of H.poisson(W,d1,31)){
      const t=H.ss(.15,.85,y/W+(H.noise(x/W*3,y/W*3)-.5)*.3), c=H.mix(sky,sand,t).map(v=>v+(rnd()-.5)*.05);
      dab(x,y,rgba(c,.95),flow(x,y),d1*.7,d1*.5); }
    const d2=W*.0115; for(const [x,y] of H.poisson(W,d2,32)){
      const p=P(x/W,y/W,rnd); if(!p||rnd()>p.cov*1.35) continue;
      let c=pickColor(p.rec,rnd); c=rnd()<.1?lift(c,.45):H.pastel(c,.02+rnd()*.08,1.15);
      dab(x+(rnd()-.5)*d2*.4,y+(rnd()-.5)*d2*.4,rgba(c,.92),flow(x,y),d2*.75,d2*.62);
    }
  }});

/* ───────── 004 민들레 홀씨 ───────── */
A({id:'s104',name:'민들레 홀씨',cat:'입자',
  desc:'기록 하나가 민들레 홀씨 한 송이예요. 가운데는 찻물색, 솜털 끝은 풍미색이고, 오래된 기록일수록 홀씨가 바람에 날아가 듬성해져요.',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.42+.58*dens(N), lw=Math.max(.5,W/900);
    ctx.lineCap='round';
    recs.forEach((r,k)=>{
      const rnd=H.rng(H.hash(r.id)+4), age=1-k/Math.max(1,N-1), x=(.07+.86*r.x)*W, y=(.07+.86*r.y)*W;
      const L=W*(.045+.05*r.i)*sc, sp=Math.round(16+16*sc), keep=1-.6*age, tc=H.pastel(r.colors[0].rgb,0,1.15);
      for(let q=0;q<sp;q++){
        const z=rnd()*2-1, a=rnd()*TAU, s=Math.sqrt(1-z*z), dx=Math.cos(a)*s, dy=Math.sin(a)*s;
        const c=H.pastel(pickColor(r,rnd,.35),.05,1.2);
        let ex=x+dx*L, ey=y+dy*L;
        if(rnd()>keep){ // 날아간 홀씨
          const fl=(.3+rnd()*1.8)*W*.08; ex+=fl*(.8+rnd()*.4); ey-=fl*(.5+rnd()*.5);
          ctx.strokeStyle=rgba(c,.55); ctx.lineWidth=lw; const sl=L*.35;
          ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex-sl*.7,ey+sl*.7); ctx.stroke();
          for(let f=-2;f<=2;f++){ const fa=-.78+f*.32; ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex+Math.cos(fa-1.57)*sl*.45,ey+Math.sin(fa-1.57)*sl*.45); ctx.stroke(); }
          continue;
        }
        ctx.strokeStyle=rgba(H.shade(tc,-.1),(.3+.2*z)*(.55+.45*dens(N))+.1); ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey); ctx.stroke();
        ctx.fillStyle=rgba(c,.6+.3*(z+1)/2); ctx.beginPath(); ctx.arc(ex,ey,W*.0035*(.7+.5*(z+1)/2)*(.6+.4*sc),0,TAU); ctx.fill();
      }
      ctx.fillStyle=rgba(H.shade(tc,-.1),.95); ctx.beginPath(); ctx.arc(x,y,W*.004*(.8+.6*r.i),0,TAU); ctx.fill();
    });
  }});

/* ───────── 005 리소그래프 그레인 ───────── */
A({id:'s105',name:'리소그래프 그레인',cat:'그라데이션',
  desc:'리소 인쇄처럼 두 가지 잉크가 거친 입자로 겹쳐 찍혀요. 찻물색 판과 풍미색 판이 살짝 어긋나 겹친 곳에 새 색이 생겨요.',
  bg:'#F4F0E7',
  render(ctx,W,recs,H){
    const Ft=cfield(recs,90,H,{sel:k=>k===0,rad:.085,covK:1.2}), Ff=cfield(recs,90,H,{sel:k=>k>0,rad:.08,covK:1});
    const n=Math.min(W,360), im=ctx.createImageData(n,n), d=im.data, rnd=H.rng(55), o1=[0,0,0,0], o2=[0,0,0,0], paper=[.957,.94,.906];
    const mis=.007;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){
      const u=(i+.5)/n, v=(j+.5)/n; fs(Ft,u,v,o1); fs(Ff,u+mis,v-mis*.6,o2);
      let r=paper[0], g=paper[1], b=paper[2];
      if(rnd()<Math.pow(o1[3],1.4)*.85){ const c=satur([o1[0],o1[1],o1[2]],1.3); const ink=lift(c,.22); r*=ink[0]; g*=ink[1]; b*=ink[2]; }
      if(rnd()<Math.pow(o2[3],1.4)*.7){ const c=satur([o2[0],o2[1],o2[2]],1.45); const ink=lift(c,.28); r*=ink[0]; g*=ink[1]; b*=ink[2]; }
      const q=(j*n+i)*4; d[q]=r*255; d[q+1]=g*255; d[q+2]=b*255; d[q+3]=255;
    }
    const c=off(n); c.getContext('2d').putImageData(im,0,0);
    ctx.save(); ctx.imageSmoothingEnabled=n<W; ctx.drawImage(c,0,0,W,W); ctx.restore();
  }});

/* ───────── 006 메시 그라데이션 + 필름 그레인 ───────── */
A({id:'s106',name:'필름 그레인 메시',cat:'그라데이션',
  desc:'기록의 3D 찻방울 색이 캔버스 전체에 부드럽게 번진 색면이에요. 필름 입자 위로 기록 자리마다 작은 빛점이 떠 있어요.',
  bg:'#F2EEE6',
  render(ctx,W,recs,H){
    const F=H.field(recs,96,{spread:1.25,sharp:1.8,warp:(u,v)=>[(H.noise(u*3,v*3)-.5)*.08,(H.noise(u*3+9,v*3)-.5)*.08]});
    const bg=[.95,.935,.905];
    H.paintField(ctx,W,F,(c,a,u,v)=>{ const p=H.pastel(c,.14,1.2), m=H.ss(0,.85,a)*.9; return H.mix(bg,p,m).map(x=>x*255); },.02);
    H.grain(ctx,W,.13,'overlay'); H.grain(ctx,W,.035,'multiply');
    const N=recs.length;
    recs.forEach(r=>{ const x=r.x*W, y=r.y*W, rr=W*(.0025+.002*r.i)*(.7+.3*dens(N));
      const g=ctx.createRadialGradient(x,y,0,x,y,rr*4); g.addColorStop(0,'rgba(255,255,255,.4)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,rr*4,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(x,y,rr*.7,0,TAU); ctx.fill(); });
  }});

/* ───────── 007 원뿔 그라데이션 나이테 ───────── */
A({id:'s107',name:'찻잔 나이테',cat:'그라데이션',
  desc:'안쪽 고리가 첫 잔, 바깥 고리가 최근 잔이에요. 고리마다 그 차의 색이 원을 따라 흐르고, 색이 시작되는 방향은 향·맛 평가의 방향이에요.',
  render(ctx,W,recs,H){
    const N=recs.length, cx=W/2, cy=W/2, R0=W*.1, R1=W*.44, band=(R1-R0)/N, gap=N<=20?band*.16:N<=60?band*.1:0;
    recs.forEach((r,k)=>{
      const ri=R0+band*k+gap/2, ro=R0+band*(k+1)-gap/2;
      const th=Math.atan2(r.y-.5,r.x-.5)-.3, g=ctx.createConicGradient(th,cx,cy);
      const fl=r.colors.slice(1), tw=.9, sum=tw+fl.reduce((s,c)=>s+c.w,0);
      const tc=H.pastel(r.colors[0].rgb,.08,1.15);
      g.addColorStop(0,rgba(tc)); let t=tw/sum*.85;
      g.addColorStop(t*.6,rgba(tc));
      fl.forEach(c=>{ const s=c.w/sum; g.addColorStop(Math.min(.98,t+s*.5),rgba(H.pastel(c.rgb,.08,1.15))); t+=s; });
      g.addColorStop(1,rgba(tc));
      ctx.fillStyle=g; ctx.globalAlpha=.55+.45*r.i;
      ctx.beginPath(); ctx.arc(cx,cy,ro,0,TAU); ctx.arc(cx,cy,ri,0,TAU,true); ctx.fill();
    });
    ctx.globalAlpha=1; ctx.strokeStyle='rgba(60,50,40,.18)'; ctx.lineWidth=Math.max(.6,W/700);
    ctx.beginPath(); ctx.arc(cx,cy,R1+W*.012,0,TAU); ctx.stroke();
  }});

/* ───────── 008 오로라 ───────── */
A({id:'s108',name:'차빛 오로라',cat:'빛',
  desc:'기록 하나가 밤하늘의 빛 커튼 한 줄기예요. 향이 좋았던 기록은 오른쪽, 맛이 좋았던 기록일수록 높이 걸리고, 아래는 찻물색·위로 갈수록 풍미색이에요. 고요한 호수에 그 빛이 비쳐요.',
  bg:'#080B12',
  render(ctx,W,recs,H){
    const n=210, N=recs.length, im=ctx.createImageData(n,n), d=im.data, amp=.5*Math.min(1,2.4/Math.sqrt(N))+.04, hz=.74, hj=Math.round(hz*n);
    const R=recs.map(r=>({x:r.x, yb:.22+.36*r.y, L:.09+.15*r.i, sx:(.022+.03*r.i)*(.6+.4*dens(N)), ph:H.hash(r.id)%100/16,
      b:H.pastel(r.colors[0].rgb,.05,1.3).map(lin), t:H.pastel((r.colors[1]||r.colors[0]).rgb,.1,1.4).map(lin), a:amp*(.5+.5*r.i)}));
    for(let j=0;j<hj;j++){ const v=(j+.5)/n; for(let i=0;i<n;i++){ const u=(i+.5)/n, k=(j*n+i)*4;
      const ray=.35+.9*Math.pow(H.noise(u*70+H.noise(u*4,v*2)*6,v*1.1),1.8);
      let r=0,g=0,b=0;
      for(const q of R){ const xc=q.x+.05*Math.sin(v*4.5+q.ph)+.018*Math.sin(v*12+q.ph*2), dx=(u-xc)/q.sx; if(dx*dx>12) continue;
        const yb=q.yb+.035*Math.sin(u*6+q.ph); const dv=yb-v; let f;
        if(dv>0) f=Math.exp(-dv/q.L); else { const e=dv/.012; f=Math.exp(-e*e); }
        if(f<.01) continue; f*=Math.exp(-dx*dx*.5)*q.a; const t=cl(dv/(q.L*1.5));
        r+=f*(q.b[0]+(q.t[0]-q.b[0])*t); g+=f*(q.b[1]+(q.t[1]-q.b[1])*t); b+=f*(q.b[2]+(q.t[2]-q.b[2])*t); }
      const sky=Math.pow(v/hz,3)*.014;
      r=1-Math.exp(-r*ray*1.6); g=1-Math.exp(-g*ray*1.6); b=1-Math.exp(-b*ray*1.6);
      d[k]=gam(r+.0018+sky*.5)*255; d[k+1]=gam(g+.0025+sky*.8)*255; d[k+2]=gam(b+.0055+sky*1.2)*255; d[k+3]=255; } }
    // 호수: 위쪽을 거꾸로 비추고 잔물결로 흔든다
    for(let j=hj;j<n;j++){ const dj=j-hj, sj=Math.max(0,hj-1-Math.round(dj*1.15)), fade=.6*Math.exp(-dj/(n*.4));
      for(let i=0;i<n;i++){ const si=Math.min(n-1,Math.max(0,i+Math.round((H.noise(i*.05,j*.6)-.5)*6))), s=(sj*n+si)*4, k=(j*n+i)*4;
        d[k]=d[s]*fade+4; d[k+1]=d[s+1]*fade+6; d[k+2]=d[s+2]*fade+10; d[k+3]=255; } }
    const c=off(n); c.getContext('2d').putImageData(im,0,0);
    ctx.save(); ctx.imageSmoothingQuality='high'; ctx.filter=`blur(${Math.max(.6,W/600)}px)`; ctx.drawImage(c,0,0,W,W); ctx.restore();
    const sr=H.rng(8); ctx.fillStyle='#fff';
    for(let k=0;k<110;k++){ const x=sr()*W, y=sr()*W*hz*.9, s=(sr()*.8+.5)*W/480; ctx.globalAlpha=.15+sr()*.45; ctx.fillRect(x,y,s,s); }
    ctx.globalAlpha=1;
    // 먼 산 실루엣(얇게)
    ctx.fillStyle='#07090D'; ctx.beginPath(); ctx.moveTo(0,hz*W+1);
    for(let x=0;x<=W;x+=W/90) ctx.lineTo(x,W*(hz-.004-.03*Math.pow(H.fbm(x/W*2.5,4.2,4),2)));
    ctx.lineTo(W,hz*W+1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=Math.max(.5,W/900); ctx.beginPath(); ctx.moveTo(0,hz*W+1); ctx.lineTo(W,hz*W+1); ctx.stroke();
  }});
/* ───────── 009 나전칠기 ───────── */
A({id:'s109',name:'나전칠기',cat:'빛',
  desc:'검은 옻칠 위에 자개 조각을 박아 넣었어요. 기록 하나가 자개 한 점, 결마다 무지갯빛이 돌고 바탕엔 그 차의 색이 비쳐요. 진한 차일수록 조각이 커요.',
  bg:'#15120F',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.4+.6*dens(N), n=Math.min(W,320), im=ctx.createImageData(n,n), d=im.data;
    const lac=[.082,.07,.06];
    for(let j=0;j<n;j++){ const v=(j+.5)/n; for(let i=0;i<n;i++){ const u=(i+.5)/n, q=(j*n+i)*4, t=H.noise(u*60,v*2.5)*.4+H.noise(u*4,v*4)*.6;
      d[q]=lac[0]*(.9+.22*t)*255; d[q+1]=lac[1]*(.9+.22*t)*255; d[q+2]=lac[2]*(.9+.22*t)*255; d[q+3]=255; } }
    // 오래된 조각부터 차례로 박는다
    recs.forEach(r=>{
      const rh=H.rng(H.hash(r.id)+9), cx=(.07+.86*r.x)*n, cy=(.07+.86*r.y)*n, R=(.022+.036*r.i)*sc*n, ph=rh()*10, rot=rh()*TAU;
      const cols=r.colors.map(c=>H.pastel(c.rgb,.2,1.3));
      const x0=Math.max(0,Math.floor(cx-R*1.15)), x1=Math.min(n-1,Math.ceil(cx+R*1.15)), y0=Math.max(0,Math.floor(cy-R*1.15)), y1=Math.min(n-1,Math.ceil(cy+R*1.15));
      for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
        const lu=(x+.5-cx)/R, lv=(y+.5-cy)/R, rr=Math.hypot(lu,lv); if(rr>1.12) continue;
        const a=Math.atan2(lv,lu), Rr=1+.08*(H.noise(Math.cos(a+rot)*1.8+ph,Math.sin(a+rot)*1.8)-.5)*2; if(rr>Rr) continue;
        const f=H.fbm(lu*1.2+ph,lv*1.2,3), dir=lu*Math.cos(rot)+lv*Math.sin(rot);
        const band=.5+.5*Math.cos(TAU*(dir*.7+f*1.3)), fine=.5+.5*Math.cos(TAU*(dir*7+f*3));
        const ci=Math.min(cols.length-1,Math.floor(H.noise(lu*.8+ph*3,lv*.8)*cols.length*1.15)), tint=cols[ci];
        const b=f*1.1+dir*.45, ir=[.86+.14*Math.cos(TAU*b),.88+.12*Math.cos(TAU*(b+.33)),.9+.1*Math.cos(TAU*(b+.67))];
        const e=ssf(.8,1,rr/Rr), q=(y*n+x)*4, sh=.7+.28*band+.035*fine;
        for(let m=0;m<3;m++) d[q+m]=cl((tint[m]*.42+ir[m]*.58)*sh*(1-.25*e))*255;
      }
    });
    const cv=off(n); cv.getContext('2d').putImageData(im,0,0);
    ctx.save(); ctx.imageSmoothingQuality='high'; ctx.drawImage(cv,0,0,W,W); ctx.restore();
  }});
/* ───────── 010 보케 ───────── */
A({id:'s110',name:'보케',cat:'빛',
  desc:'초점이 나간 불빛처럼 기록이 동그란 빛망울이 돼요. 진한 차일수록 크고, 오래된 기록일수록 더 흐릿하게 물러나요.',
  bg:'#16141A',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.45+.55*dens(N), al=Math.min(1,.5+2.4/Math.sqrt(N));
    const order=recs.map((r,k)=>({r,k})).sort((a,b)=>b.r.daysAgo-a.r.daysAgo);
    ctx.save(); ctx.globalCompositeOperation='screen';
    order.forEach(({r,k})=>{
      const age=1-k/Math.max(1,N-1), x=(.06+.88*r.x)*W, y=(.06+.88*r.y)*W, R=W*(.03+.055*r.i)*sc*(1+age*.35);
      const c=H.pastel(r.colors[0].rgb,.1,1.3), e=H.pastel((r.colors[1]||r.colors[0]).rgb,.25,1.3), a=al*(.75-.35*age);
      const soft=.06+.22*age, g=ctx.createRadialGradient(x,y,0,x,y,R);
      g.addColorStop(0,rgba(c,a*.32)); g.addColorStop(Math.max(.05,.86-soft),rgba(c,a*.42));
      g.addColorStop(Math.max(.1,.95-soft*.6),rgba(e,a*.75)); g.addColorStop(1,rgba(e,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.fill();
    });
    const rnd=H.rng(110);
    for(let q=0;q<Math.min(60,N*2);q++){ const r=recs[Math.floor(rnd()*N)], x=(r.x+H.gauss(rnd)*.1)*W, y=(r.y+H.gauss(rnd)*.1)*W, R=W*.008*(.5+rnd());
      ctx.fillStyle=rgba(H.pastel(pickColor(r,rnd),.3),.35); ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.fill(); }
    ctx.restore();
  }});

/* ───────── 011 반딧불이 ───────── */
A({id:'s111',name:'반딧불이 밤',cat:'빛',
  desc:'기록 하나가 반딧불이 한 마리예요. 맛이 좋았던 기록일수록 높이 날고, 별점이 높을수록 밝게 빛나요. 최근 기록일수록 꼬리가 또렷해요.',
  bg:'#0B1316',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.5+.5*dens(N);
    const sky=ctx.createLinearGradient(0,0,0,W); sky.addColorStop(0,'#0A1119'); sky.addColorStop(1,'#0E1B17'); ctx.fillStyle=sky; ctx.fillRect(0,0,W,W);
    const rg=H.rng(111); ctx.lineCap='round';
    for(let k=0;k<140;k++){ const x=rg()*W, h=W*(.04+.14*rg()*rg()), b=(rg()-.5)*h*.6; ctx.strokeStyle=`rgba(${20+rg()*14|0},${38+rg()*18|0},${34+rg()*10|0},.9)`; ctx.lineWidth=W/500*(1+rg());
      ctx.beginPath(); ctx.moveTo(x,W+2); ctx.quadraticCurveTo(x+b*.2,W-h*.6,x+b,W-h); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation='lighter';
    recs.forEach((r,k)=>{
      const rnd=H.rng(H.hash(r.id)+11), age=1-k/Math.max(1,N-1), x=(.06+.88*r.x)*W, y=(.05+.8*r.y)*W;
      const c=H.pastel((r.colors[1]||r.colors[0]).rgb,.35,1.25), bright=(.45+.55*r.stars/3)*(1-.45*age);
      // 꼬리: 지나온 길의 작은 입자
      let px=x, py=y, a=rnd()*TAU; const steps=Math.round(10+10*(1-age));
      for(let s=0;s<steps;s++){ a+=(H.noise(px/W*6,py/W*6+k)-.5)*1.4; px-=Math.cos(a)*W*.007; py-=Math.sin(a)*W*.007;
        ctx.fillStyle=rgba(c,bright*.5*(1-s/steps)); ctx.fillRect(px,py,W/420+.5,W/420+.5); }
      const R=W*.065*sc*(.6+.4*r.i), g=ctx.createRadialGradient(x,y,0,x,y,R);
      g.addColorStop(0,rgba(c,.85*bright)); g.addColorStop(.15,rgba(c,.32*bright)); g.addColorStop(.5,rgba(c,.07*bright)); g.addColorStop(1,rgba(c,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.fill();
      ctx.fillStyle=rgba(lift(c,.6),.9*bright+.1); ctx.beginPath(); ctx.arc(x,y,W/330+W/400*r.i,0,TAU); ctx.fill();
    });
    ctx.restore();
  }});

/* ───────── 012 은하 ───────── */
A({id:'s112',name:'차의 은하',cat:'입자',
  desc:'기록 하나가 별 하나예요. 향·맛이 좋았던 기록일수록 은하 중심에 가까워요. 나선팔의 먼지는 기록들의 풍미색이에요.',
  bg:'#0A0A11',
  render(ctx,W,recs,H){
    const N=recs.length, cx=W/2, cy=W/2, rot=-.4, sq=.7, rnd=H.rng(112), Rm=W*.47, R0=Rm*.08, K=2.6;
    const P=(r,th)=>{ const x=Math.cos(th)*r, y=Math.sin(th)*r*sq; return [cx+x*Math.cos(rot)-y*Math.sin(rot), cy+x*Math.sin(rot)+y*Math.cos(rot)]; };
    const armTh=(rr,arm)=>arm*Math.PI+K*Math.log(rr/R0+1);
    const core=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.2); core.addColorStop(0,'rgba(255,238,212,.42)'); core.addColorStop(.3,'rgba(220,196,170,.1)'); core.addColorStop(1,'rgba(200,180,170,0)');
    ctx.fillStyle=core; ctx.fillRect(0,0,W,W);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const ds=W/480;
    // 나선팔 먼지: 기록들의 색을 고루 나눠 받는다
    for(let q=0;q<3200;q++){ const r=recs[Math.floor(rnd()*N)], rr=R0+Math.pow(rnd(),.8)*(Rm-R0), arm=rnd()<.5?0:1, th=armTh(rr,arm)+H.gauss(rnd)*(.35+.25*rr/Rm);
      const [x,y]=P(rr*(1+H.gauss(rnd)*.06),th), c=H.pastel(pickColor(r,rnd,.5),.25,1.2); ctx.fillStyle=rgba(c,.08+.2*rnd()); const s=ds*(.5+rnd()*1.2); ctx.fillRect(x,y,s,s); }
    for(let q=0;q<300;q++){ const x=rnd()*W, y=rnd()*W; ctx.fillStyle=`rgba(255,250,240,${.08+rnd()*.3})`; ctx.fillRect(x,y,ds*.8,ds*.8); }
    recs.forEach(r=>{ const dd=Math.min(1,Math.hypot(1-r.x,r.y)/1.2), rh=H.rng(H.hash(r.id));
      const rr=R0+(Rm-R0)*(.04+.96*dd)*(1+H.gauss(rh)*.08), th=armTh(rr,r.idx%2)+H.gauss(rh)*.4, [x,y]=P(rr,th);
      const c=H.pastel(r.colors[0].rgb,.35,1.2), f=H.pastel((r.colors[1]||r.colors[0]).rgb,.2,1.3), R=W*(.012+.016*r.i)*(.55+.45*dens(N));
      const g=ctx.createRadialGradient(x,y,0,x,y,R*1.8); g.addColorStop(0,rgba(c,.75)); g.addColorStop(.18,rgba(c,.25)); g.addColorStop(.5,rgba(f,.08)); g.addColorStop(1,rgba(f,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,R*1.8,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(255,252,245,.95)'; ctx.beginPath(); ctx.arc(x,y,ds*(.6+.6*r.i),0,TAU); ctx.fill();
      if(r.stars>=3){ ctx.strokeStyle=rgba(lift(c,.5),.45); ctx.lineWidth=ds*.5; const L=R*1.5; ctx.beginPath(); ctx.moveTo(x-L,y); ctx.lineTo(x+L,y); ctx.moveTo(x,y-L); ctx.lineTo(x,y+L); ctx.stroke(); }
    });
    ctx.restore();
  }});
/* ───────── 013 모래 그림 ───────── */
A({id:'s113',name:'모래 병',cat:'입자',
  desc:'한 잔을 마실 때마다 유리병에 색모래 한 켜를 부어요. 아래가 첫 잔, 위가 최근 잔이고, 향이 좋았던 쪽으로 모래가 더 높이 쌓여요.',
  bg:'#F7F5F0',
  render(ctx,W,recs,H){
    const N=recs.length, x0=Math.round(W*.16), x1=Math.round(W*.84), yb=Math.round(W*.9), yt=Math.round(W*.1), cw=x1-x0, ch=yb-yt;
    const Hs=new Float32Array((N+1)*cw);
    let mx=0;
    for(let c=0;c<cw;c++){ const u=(c+.5)/cw; let h=0;
      for(let k=0;k<N;k++){ const r=recs[k], dx=(u-(.08+.84*r.x))/.2; h+=(.4+.6*r.i)*(.5+.75*Math.exp(-dx*dx))*(1+.25*(H.fbm(u*5,k*.37,3)-.5)); Hs[(k+1)*cw+c]=h; }
      mx=Math.max(mx,h); }
    const scl=ch*.86/mx;
    const layers=recs.map(r=>{ const fl=r.colors.slice(1), tw=1.1, sum=tw+fl.reduce((s,c)=>s+c.w,0); let t=0;
      const parts=[{to:tw/sum,c:H.pastel(r.colors[0].rgb,.04,1.1)}]; t=tw/sum; fl.forEach(c=>{ t+=c.w/sum; parts.push({to:t,c:H.pastel(c.rgb,.06,1.15)}); }); return parts; });
    const im=ctx.getImageData(x0,yt,cw,ch), d=im.data, rnd=H.rng(113);
    for(let c=0;c<cw;c++){ let k=0;
      for(let yy=ch-1;yy>=0;yy--){ const hp=(ch-1-yy+.5)/scl; if(hp>Hs[N*cw+c]) break;
        while(k<N-1&&Hs[(k+1)*cw+c]<hp) k++;
        const lo=Hs[k*cw+c], hi=Hs[(k+1)*cw+c], f=(hp-lo)/Math.max(1e-6,hi-lo), P=layers[k]; let col=P[P.length-1].c;
        const fj=f+(rnd()-.5)*.25; for(const p of P){ if(fj<=p.to){ col=p.c; break; } }
        let m=.9+rnd()*.16; if(rnd()<.05) m=rnd()<.5?.72:1.12;
        if(rnd()<.03){ const P2=layers[Math.min(N-1,Math.max(0,k+(rnd()<.5?-1:1)))]; col=P2[0].c; }
        const q=(yy*cw+c)*4; d[q]=cl(col[0]*m)*255; d[q+1]=cl(col[1]*m)*255; d[q+2]=cl(col[2]*m)*255; d[q+3]=255; } }
    ctx.putImageData(im,x0,yt);
    ctx.strokeStyle='rgba(70,64,56,.28)'; ctx.lineWidth=Math.max(1,W/400);
    ctx.beginPath(); ctx.moveTo(x0-W*.008,yt-W*.02); ctx.lineTo(x0-W*.008,yb+W*.006); ctx.lineTo(x1+W*.008,yb+W*.006); ctx.lineTo(x1+W*.008,yt-W*.02); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=W*.006; ctx.beginPath(); ctx.moveTo(x0+W*.02,yt); ctx.lineTo(x0+W*.02,yb-W*.02); ctx.stroke();
  }});

/* ───────── 014 모자이크 ───────── */
A({id:'s114',name:'타일 모자이크',cat:'점묘',
  desc:'작은 유리 타일을 한 장씩 붙인 모자이크예요. 기록이 있는 자리의 타일은 그 차의 색, 나머지는 옅은 바탕 타일이에요.',
  bg:'#FBFAF7',
  render(ctx,W,recs,H){
    const N=recs.length, g=34, s=W/g, rnd=H.rng(114), P=picker(recs,.07*(.5+.5*dens(N)),H);
    for(let j=0;j<g;j++) for(let i=0;i<g;i++){
      const u=(i+.5+(rnd()-.5)*.25)/g, v=(j+.5+(rnd()-.5)*.25)/g, p=P(u,v,rnd);
      let c;
      if(p&&rnd()<p.cov*1.25){ c=H.pastel(pickColor(p.rec,rnd),.05+rnd()*.08,1.12).map(x=>x*(.96+rnd()*.07)); }
      else { const t=rnd(); c=[.95+t*.02,.943+t*.02,.925+t*.02]; }
      const sz=s*(.8+rnd()*.06);
      ctx.save(); ctx.translate(u*W,v*W); ctx.rotate((rnd()-.5)*.12); ctx.fillStyle=rgba(c);
      ctx.beginPath(); ctx.roundRect(-sz/2,-sz/2,sz,sz,s*.12); ctx.fill(); ctx.restore();
    }
  }});

/* ───────── 015 베이어 디더링 ───────── */
A({id:'s115',name:'베이어 디더',cat:'그라데이션',
  desc:'오래된 컴퓨터 화면처럼, 정해진 차 색 팔레트의 픽셀만으로 그라데이션을 만들어요. 기록이 모인 곳은 색 픽셀이 빽빽해요.',
  bg:'#F6F3EC',
  render(ctx,W,recs,H){
    const M=96, F=cfield(recs,M,H,{rad:.08,sharp:2,covK:1.3}), paper=[.965,.953,.925];
    const pal=[paper]; const seen=new Set(); recs.forEach(r=>r.colors.forEach(c=>{ if(!seen.has(c.hex)){ seen.add(c.hex); pal.push(H.pastel(c.rgb,.1,1.1)); } }));
    const B=[0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
    const im=ctx.createImageData(M,M), d=im.data;
    const D=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
    for(let j=0;j<M;j++) for(let i=0;i<M;i++){ const q=j*M+i, cv=F.cov[q];
      const t=[paper[0]+(H.pastel([F.g[q*3],F.g[q*3+1],F.g[q*3+2]],.1,1.2)[0]-paper[0])*ssf(0,.85,cv),0,0];
      const fc=H.pastel([F.g[q*3],F.g[q*3+1],F.g[q*3+2]],.1,1.2), m=ssf(0,.85,cv); t[1]=paper[1]+(fc[1]-paper[1])*m; t[2]=paper[2]+(fc[2]-paper[2])*m;
      let a=0,b=0,da=1e9,db=1e9; pal.forEach((p,k)=>{ const dd=D(p,t); if(dd<da){ db=da; b=a; da=dd; a=k; } else if(dd<db){ db=dd; b=k; } });
      const pa=pal[a], pb=pal[b], ab=D(pa,pb)||1; const tt=cl(((t[0]-pa[0])*(pb[0]-pa[0])+(t[1]-pa[1])*(pb[1]-pa[1])+(t[2]-pa[2])*(pb[2]-pa[2]))/ab);
      const c=tt>(B[(j%8)*8+i%8]+.5)/64?pb:pa; d[q*4]=c[0]*255; d[q*4+1]=c[1]*255; d[q*4+2]=c[2]*255; d[q*4+3]=255; }
    const c=off(M); c.getContext('2d').putImageData(im,0,0);
    ctx.save(); ctx.imageSmoothingEnabled=false; ctx.drawImage(c,0,0,W,W); ctx.restore();
  }});

/* ───────── 016 LED 도트 매트릭스 ───────── */
A({id:'s116',name:'LED 전광판',cat:'점묘',
  desc:'작은 LED가 촘촘히 박힌 전광판이에요. 기록이 있는 자리의 LED가 그 차의 찻물색·풍미색으로 켜지고, 많이 모인 곳일수록 밝아요.',
  bg:'#111111',
  render(ctx,W,recs,H){
    const N=recs.length, g=46, s=W/g, rnd=H.rng(116), P=picker(recs,.052*(.55+.45*dens(N)),H);
    const lay=off(W), lx=lay.getContext('2d');
    for(let j=0;j<g;j++) for(let i=0;i<g;i++){
      const x=(i+.5)*s, y=(j+.5)*s, p=P(x/W,y/W,rnd), lv=p?Math.floor(cl(p.cov*1.15)*4)/4:0;
      if(lv<.25){ ctx.fillStyle='#1E1E1E'; ctx.beginPath(); ctx.arc(x,y,s*.33,0,TAU); ctx.fill(); continue; }
      const c=H.pastel(pickColor(p.rec,rnd),.1,1.35).map(v=>v*(.35+.65*lv));
      ctx.fillStyle=rgba(c); ctx.beginPath(); ctx.arc(x,y,s*.36,0,TAU); ctx.fill();
      ctx.fillStyle=rgba(lift(c,.45),.55); ctx.beginPath(); ctx.arc(x-s*.07,y-s*.07,s*.12,0,TAU); ctx.fill();
      lx.fillStyle=rgba(c); lx.beginPath(); lx.arc(x,y,s*.5,0,TAU); lx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.3; ctx.filter=`blur(${Math.round(s*1.1)}px)`; ctx.drawImage(lay,0,0); ctx.restore();
  }});
/* ───────── 017 비눗방울 ───────── */
A({id:'s117',name:'비눗방울',cat:'빛',
  desc:'기록 하나가 비눗방울 하나예요. 얇은 막에 그 차의 색이 무지갯빛처럼 돌고, 진한 차일수록 방울이 커요.',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.45+.55*dens(N), bg=[.969,.961,.941];
    const L=recs.map(r=>({r,R:W*(.03+.06*r.i)*sc})).sort((a,b)=>b.R-a.R);
    const irid=[[.98,.78,.86],[.72,.9,.95],[.97,.92,.7]];
    L.forEach(({r,R})=>{
      const x=(.07+.86*r.x)*W, y=(.07+.86*r.y)*W, rh=H.rng(H.hash(r.id)+17);
      const g=ctx.createConicGradient(rh()*TAU,x,y), cs=[]; r.colors.forEach((c,k)=>{ cs.push(H.pastel(c.rgb,.12,1.3)); cs.push(irid[k%3]); });
      cs.forEach((c,k)=>g.addColorStop(k/cs.length,rgba(c))); g.addColorStop(1,rgba(cs[0]));
      ctx.save(); ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.clip();
      ctx.globalAlpha=.75; ctx.fillStyle=g; ctx.fillRect(x-R,y-R,2*R,2*R);
      const m=ctx.createRadialGradient(x+R*.1,y+R*.12,0,x,y,R); m.addColorStop(0,rgba(bg,.9)); m.addColorStop(.62,rgba(bg,.78)); m.addColorStop(.9,rgba(bg,.25)); m.addColorStop(1,rgba(bg,0));
      ctx.globalAlpha=1; ctx.fillStyle=m; ctx.fillRect(x-R,y-R,2*R,2*R); ctx.restore();
      ctx.strokeStyle=rgba(H.shade(r.colors[0].rgb,-.15),.35); ctx.lineWidth=Math.max(.6,W/650); ctx.beginPath(); ctx.arc(x,y,R,0,TAU); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.95)'; ctx.lineWidth=R*.09; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(x,y,R*.72,-2.55,-1.95); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x+R*.48,y+R*.42,R*.05,0,TAU); ctx.fill();
    });
  }});

/* ───────── 018 창호지 빛 ───────── */
A({id:'s118',name:'창호지 너머',cat:'빛',
  desc:'띠살 창호지 문 너머로 색색의 등불이 비쳐요. 기록 하나가 등불 하나, 진한 차일수록 크고 또렷하게 번져요.',
  bg:'#EFE9DC',
  render(ctx,W,recs,H){
    const N=recs.length, sc=.45+.55*dens(N), lay=off(W), lx=lay.getContext('2d'), a=Math.min(.9,.32+1.6/Math.sqrt(N));
    recs.forEach(r=>{ const x=r.x*W, y=r.y*W, R=W*(.06+.08*r.i)*sc;
      const c0=H.pastel(r.colors[0].rgb,.2,1.4), c1=H.pastel((r.colors[1]||r.colors[0]).rgb,.25,1.4), g=lx.createRadialGradient(x,y,0,x,y,R);
      g.addColorStop(0,rgba(lift(c1,.75),a)); g.addColorStop(.28,rgba(lift(c1,.2),a*.85)); g.addColorStop(.65,rgba(c0,a*.5)); g.addColorStop(1,rgba(c0,0));
      lx.fillStyle=g; lx.beginPath(); lx.arc(x,y,R,0,TAU); lx.fill(); });
    ctx.save(); ctx.filter=`blur(${Math.round(W*.01)}px)`; ctx.drawImage(lay,0,0); ctx.restore();
    const rnd=H.rng(118); ctx.lineCap='round';
    for(let k=0;k<300;k++){ let x=rnd()*W, y=rnd()*W, an=rnd()*TAU; ctx.strokeStyle=rnd()<.7?'rgba(255,253,246,.3)':'rgba(140,120,90,.07)'; ctx.lineWidth=W/900*(1+rnd());
      ctx.beginPath(); ctx.moveTo(x,y); for(let s=0;s<6;s++){ an+=(rnd()-.5)*.8; x+=Math.cos(an)*W*.012; y+=Math.sin(an)*W*.012; ctx.lineTo(x,y); } ctx.stroke(); }
    H.grain(ctx,W,.05,'overlay');
    // 띠살: 촘촘한 세로살 + 위·가운데·아래의 가로살 묶음
    const m=W*.035, iw=W-2*m; ctx.strokeStyle='rgba(118,96,72,.34)'; ctx.lineCap='butt';
    ctx.lineWidth=Math.max(1,W*.008); ctx.strokeRect(m,m,iw,iw);
    ctx.lineWidth=Math.max(.7,W*.0032); ctx.beginPath();
    for(let i=1;i<9;i++){ const x=m+iw*i/9; ctx.moveTo(x,m); ctx.lineTo(x,W-m); }
    [.06,.5,.94].forEach(c=>{ for(let k=-1;k<=1;k++){ const y=m+iw*c+k*W*.018; ctx.moveTo(m,y); ctx.lineTo(W-m,y); } });
    ctx.stroke();
  }});
/* ───────── 019 글리터 ───────── */
A({id:'s119',name:'반짝이 가루',cat:'입자',
  desc:'아주 작은 반짝이 가루가 기록 자리에 소복이 쌓여요. 조각마다 빛을 받는 각도가 달라 같은 색도 밝고 어둡게 반짝여요.',
  bg:'#F6F4F0',
  render(ctx,W,recs,H){
    const N=recs.length, rnd=H.rng(119), P=picker(recs,.05*(.55+.45*dens(N)),H), G=104, cell=W/G, gl=[];
    for(let j=0;j<G;j++) for(let i=0;i<G;i++){
      const x=(i+rnd())*cell, y=(j+rnd())*cell, p=P(x/W,y/W,rnd); if(!p||rnd()>p.cov*1.2) continue;
      const base=pickColor(p.rec,rnd), f=rnd(); let c;
      if(f<.3) c=H.shade(base,-.35); else if(f>.86) c=lift(base,.7); else c=H.pastel(base,.05+.1*rnd(),1.25);
      const s=cell*(.6+.5*rnd()); ctx.fillStyle=rgba(c,.95);
      ctx.save(); ctx.translate(x,y); ctx.rotate(rnd()*1.57); ctx.beginPath(); ctx.moveTo(0,-s*.6); ctx.lineTo(s*.55,0); ctx.lineTo(0,s*.6); ctx.lineTo(-s*.55,0); ctx.closePath(); ctx.fill(); ctx.restore();
      if(f>.95&&p.cov>.25) gl.push([x,y,base]);
    }
    ctx.lineCap='round';
    gl.forEach(([x,y,b])=>{ const L=cell*(2.6+rnd()*2.6), g=ctx.createRadialGradient(x,y,0,x,y,L);
      g.addColorStop(0,'rgba(255,255,255,.95)'); g.addColorStop(.35,rgba(lift(b,.6),.35)); g.addColorStop(1,rgba(lift(b,.6),0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,L,0,TAU); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.95)'; ctx.lineWidth=Math.max(.6,W/700); ctx.beginPath(); ctx.moveTo(x-L*1.2,y); ctx.lineTo(x+L*1.2,y); ctx.moveTo(x,y-L*1.2); ctx.lineTo(x,y+L*1.2); ctx.stroke(); });
  }});
/* ───────── 020 찻잔 속 빛 ───────── */
A({id:'s120',name:'찻잔 속 물빛',cat:'빛',
  desc:'위에서 내려다본 찻잔이에요. 찻물 바닥에 어른거리는 물빛 그물이 기록들의 색으로 물들고, 기록이 모인 쪽일수록 그 색이 짙어요.',
  bg:'#F4F1EA',
  render(ctx,W,recs,H){
    const cx=W/2, cy=W/2, R0=W*.43, R1=W*.355, n=220;
    const mapped=recs.map(r=>{ const a=(r.x-.5)*2, b=(r.y-.5)*2; return {...r,x:.5+.5*a*Math.sqrt(1-b*b/2)*.88,y:.5+.5*b*Math.sqrt(1-a*a/2)*.88}; });
    const F=cfield(mapped,80,H,{rad:.12,sharp:1.6,covK:1.4}), o=[0,0,0,0];
    const base=lift(H.pastel(F.mean,.1,1.1),.3);
    // 물결 무늬(셀 노이즈의 경계 = 빛이 모이는 선)
    const G=8, pts=[]; const pr=H.rng(120); for(let j=0;j<G;j++) for(let i=0;i<G;i++) pts.push([(i+.15+.7*pr())/G,(j+.15+.7*pr())/G]);
    const cell=(u,v)=>{ const gi=Math.floor(u*G), gj=Math.floor(v*G); let f1=9,f2=9;
      for(let b=gj-1;b<=gj+1;b++) for(let a=gi-1;a<=gi+1;a++){ const A=((a%G)+G)%G, B=((b%G)+G)%G, p=pts[B*G+A], dx=u-(p[0]+(a-A)/G), dy=v-(p[1]+(b-B)/G), dd=dx*dx+dy*dy;
        if(dd<f1){ f2=f1; f1=dd; } else if(dd<f2) f2=dd; } return (Math.sqrt(f2)-Math.sqrt(f1))*G; };
    ctx.strokeStyle='rgba(90,80,66,.12)'; ctx.lineWidth=Math.max(1,W/500); ctx.beginPath(); ctx.arc(cx,cy,W*.48,0,TAU); ctx.stroke();
    ctx.fillStyle='#FCFBF8'; ctx.beginPath(); ctx.arc(cx,cy,R0,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(90,80,66,.2)'; ctx.stroke();
    const im=ctx.createImageData(n,n), d=im.data;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){
      const u=(i+.5)/n, v=(j+.5)/n, rr=Math.hypot(u*2-1,v*2-1), q=(j*n+i)*4; if(rr>1.02){ d[q+3]=0; continue; }
      fs(F,u,v,o); const c=H.mix(base,H.pastel([o[0],o[1],o[2]],.1,1.3),cl(o[3]*.9));
      const wu=u+(H.noise(u*2.5,v*2.5)-.5)*.26, wv=v+(H.noise(u*2.5+7,v*2.5+3)-.5)*.26;
      const c1=cell(wu,wv), c2=cell(wu*1.7+.31,wv*1.7+.17);
      const cs=(Math.exp(-c1*c1*700)*.9+Math.exp(-c1*c1*50)*.3+Math.exp(-c2*c2*900)*.35)*(.25+.95*H.noise(u*5+2,v*5)), deep=ssf(.55,1,rr);
      const out=c.map(x=>cl(x*(.93-.08*deep)+cs*.32*(1-.5*deep)*(.55+.45*x)));
      d[q]=out[0]*255; d[q+1]=out[1]*255; d[q+2]=out[2]*255; d[q+3]=255;
    }
    const c=off(n); c.getContext('2d').putImageData(im,0,0);
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,R1,0,TAU); ctx.clip(); ctx.imageSmoothingQuality='high'; ctx.filter=`blur(${Math.max(.4,W/900)}px)`; ctx.drawImage(c,cx-R1,cy-R1,R1*2,R1*2); ctx.filter='none';
    const hl=ctx.createRadialGradient(cx-R1*.35,cy-R1*.4,0,cx-R1*.35,cy-R1*.4,R1*.5); hl.addColorStop(0,'rgba(255,255,255,.3)'); hl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=hl; ctx.fillRect(cx-R1,cy-R1,R1*2,R1*2); ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=Math.max(1,W/320); ctx.beginPath(); ctx.arc(cx,cy,R1-W*.003,0,TAU); ctx.stroke();
    ctx.strokeStyle='rgba(90,80,66,.18)'; ctx.lineWidth=Math.max(.7,W/650); ctx.beginPath(); ctx.arc(cx,cy,R1+W*.002,0,TAU); ctx.stroke();
  }});
})();
