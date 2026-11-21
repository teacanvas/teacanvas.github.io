/* =========================================================
   비중 점묘 — 기록 내용으로 정한 색 비중대로 또렷한 점을 흩뿌려 그라데이션을 만든다
   한 잔 = 찻물 색(비중 .5) + 풍미 색(대화에서 나온 강도 w).
   비중이 큰 색일수록 점이 많고 방울 가운데를 차지하며, 약한 색은 가장자리에 적게 놓인다.
   색 구역이 만나는 곳은 점이 섞여 자연스러운 그라데이션이 된다. 흐림 처리는 하지 않는다.
   ========================================================= */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,pastel}=H;

  /* 한 잔의 색 구역: 색마다 방울 안의 자리(중심)와 퍼짐을 정한다 */
  function zones(rec,p){
    const r=rng(hash(rec.id+'z')), tot=rec.colors.reduce((s,c)=>s+c.w,0);
    const cs=[...rec.colors].sort((a,b)=>b.w-a.w), a0=r()*6.283;
    return cs.map((c,i)=>{ const share=c.w/tot;
      if(i===0) return {c:c.rgb,share,x:0,y:0,s:p.coreS};                       // 가장 강한 색: 가운데
      const a=a0+(i-1)*6.283/Math.max(1,cs.length-1)+(r()-.5)*.6, d=p.off*(1-share*.8);
      return {c:c.rgb,share,x:Math.cos(a)*d,y:Math.sin(a)*d,s:p.sideS*(.7+share)}; // 약한 색: 가장자리
    });
  }
  const gauss=r=>{ let u=0; for(let k=0;k<4;k++) u+=r(); return (u-2)/1.15; };

  /* 배치: 실제 향·맛 위치 근처를 지키며 고르게 */
  function positions(recs,W,p){
    const n=recs.length, pts=recs.map(r=>[r.x*W,r.y*W]); if(p.layout==='pos') return pts;
    const R0=W*(p.fill??.5)/Math.sqrt(n+4);
    for(let it=0;it<50;it++) for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.05,W*.95); pts[i][1]=clamp(pts[i][1]+fy,W*.05,W*.95); }
    return pts;
  }

  /* 캔버스 전체의 색 비중 지도: 색(팔레트 17색)마다 '이 자리에 이 색이 얼마나'를 격자에 쌓는다 */
  function weightMap(recs,W,p,pos){
    const g=p.grid||110, keys=[], idx=new Map(), maps=[], tot=new Float32Array(g*g);
    const n=recs.length, dens=Math.pow(10/Math.max(10,n),p.shrink??.3), R=p.size*dens;
    recs.forEach((rec,i)=>{ const Z=zones(rec,p), Rr=R*(.65+.5*rec.i), cx=pos[i][0]/W, cy=pos[i][1]/W, wI=.6+.4*rec.i;
      Z.forEach(z=>{ const key=H.rgb2hex(z.c); if(!idx.has(key)){ idx.set(key,keys.length); keys.push(z.c); maps.push(new Float32Array(g*g)); }
        const M=maps[idx.get(key)], zx=cx+z.x*Rr, zy=cy+z.y*Rr, sg=Math.max(.008,z.s*Rr*p.spread), s2=2*sg*sg, rad=sg*3;
        const x0=Math.max(0,Math.floor((zx-rad)*g)), x1=Math.min(g-1,Math.ceil((zx+rad)*g)), y0=Math.max(0,Math.floor((zy-rad)*g)), y1=Math.min(g-1,Math.ceil((zy+rad)*g));
        for(let yy=y0;yy<=y1;yy++) for(let xx=x0;xx<=x1;xx++){ const dx=(xx+.5)/g-zx, dy=(yy+.5)/g-zy, e=z.share*wI*Math.exp(-(dx*dx+dy*dy)/s2); M[yy*g+xx]+=e; tot[yy*g+xx]+=e; } }); });
    return {g,keys,maps,tot};
  }
  function at(A,g,u,v){ const x=clamp(u*g-.5,0,g-1.001), y=clamp(v*g-.5,0,g-1.001), i=x|0, j=y|0, fx=x-i, fy=y-j, k=j*g+i;
    return A[k]*(1-fx)*(1-fy)+A[k+1]*fx*(1-fy)+A[k+g]*(1-fx)*fy+A[k+g+1]*fx*fy; }

  function render(ctx,W,recs,p){
    const r=rng(hash(p.id)), pos=positions(recs,W,p), M=weightMap(recs,W,p,pos);
    if(p.under){ const F=H.field(recs,90,{spread:1.2}); const bg=H.hex2rgb('#F7F5F0');
      ctx.save(); ctx.globalAlpha=p.under; H.paintField(ctx,W,F,(c,a)=>H.mix(bg,pastel(c,.25,1),H.ss(0,.9,a)).map(v=>v*255),.01); ctx.restore(); }
    const d=W*p.gap, pts=H.poisson(W,d,hash(p.id)%997+1), cols=M.keys.map(c=>pastel(c,p.lift??.04,p.sat??1.15)), shape=p.shape||'circle';
    const peak=Math.max(...M.tot)||1;
    ctx.save(); ctx.globalAlpha=p.alpha??.95;
    for(const [x,y] of pts){
      const u=x/W, v=y/W, T=at(M.tot,M.g,u,v)/peak;
      const cov=H.ss(p.edge0??.03,p.edge1??.22,T); if(r()>cov) continue;           // 덩어리 바깥으로 갈수록 점이 성겨짐
      // 이 자리의 색 비중대로 색 하나를 고른다(비중^sharp: 클수록 구역이 또렷)
      let ws=0; const w=M.maps.map(A=>{ const q=Math.pow(Math.max(0,at(A,M.g,u,v)),p.sharp??1.3); ws+=q; return q; });
      let t=r()*ws, ci=0; for(;ci<w.length-1;ci++){ if(t<w[ci]) break; t-=w[ci]; }
      let c=cols[ci]; if(p.jit){ const j=1+(r()-.5)*p.jit; c=c.map(q=>clamp(q*j)); }
      const sz=d*p.dot*(p.dotVar?(1-p.dotVar/2+p.dotVar*r()):1)*(p.dotByCov?(.55+.45*cov):1);
      ctx.fillStyle=H.rgbStr(c); ctx.beginPath();
      if(shape==='circle') ctx.arc(x,y,sz,0,6.2832);
      else if(shape==='square') ctx.rect(x-sz,y-sz,sz*2,sz*2);
      else { const a=(p.dashA??-.6)+(r()-.5)*.5; ctx.ellipse(x,y,sz*1.8,sz*.7,a,0,6.2832); }
      ctx.fill();
    }
    ctx.restore();
    if(p.grain) H.grain(ctx,W,p.grain);
    if(p.axes) H.axes(ctx,W,.07,true);
  }

  const B={size:.11,coreS:.42,sideS:.3,off:.55,spread:1.6,gap:.0085,dot:.42,sharp:1.3,lift:.04,sat:1.15,alpha:.95,layout:'spread',fill:.5,grain:.03};
  const L=[]; const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});
  // 1. 점 크기·간격
  [[.005,.4,'아주 고운 점'],[.0068,.42,'고운 점'],[.0085,.42,'기본 점'],[.011,.44,'조금 큰 점'],[.015,.45,'큰 점'],[.0085,.42,'점 크기 제각각',{dotVar:1}],[.0085,.5,'촘촘하게 닿는 점'],[.0085,.3,'작게 띄운 점']]
    .forEach(([g,dt,nm,o])=>add('점 크기',nm,'점 사이 간격과 점 크기를 바꿨어요. 작을수록 고운 그라데이션, 클수록 점묘화 같아요.',{gap:g,dot:dt,...(o||{})}));
  // 2. 그라데이션 폭(색이 퍼지는 범위)
  [[1.1,'좁게 퍼짐'],[1.6,'기본'],[2.2,'넓게 퍼짐'],[3,'아주 넓게 퍼짐'],[2.2,'넓게 · 덩어리 크게',{size:.14}],[1.6,'기본 · 덩어리 작게',{size:.08}],[2.6,'넓게 · 캔버스 가득',{fill:.8,size:.13}],[1.3,'좁게 · 실제 위치',{layout:'pos'}]]
    .forEach(([sp,nm,o])=>add('그라데이션 폭',nm,'한 색이 주변으로 퍼지는 범위를 바꿨어요. 넓을수록 이웃 잔들과 자연스럽게 이어져 한 덩어리가 돼요.',{spread:sp,...(o||{})}));
  // 3. 색 구역의 또렷함
  [[.7,'아주 부드러운 섞임'],[1,'부드러운 섞임'],[1.3,'기본'],[1.8,'조금 또렷'],[2.5,'또렷한 구역'],[4,'아주 또렷한 구역'],[1.3,'풍미가 바깥으로',{off:.85}],[1.3,'찻물 색 크게',{coreS:.6,sideS:.25}]]
    .forEach(([sh,nm,o])=>add('색 구역',nm,'두 색이 만나는 곳의 점이 얼마나 섞이는지 바꿨어요. 또렷할수록 색 구역이 분명하고, 부드러울수록 점이 서로 스며들어요.',{sharp:sh,...(o||{})}));
  // 4. 덩어리 가장자리
  [[.03,.22,'기본'],[.1,.25,'가장자리 또렷'],[.01,.35,'가장자리 성기게'],[.005,.5,'아주 성기게 흩어짐'],[.03,.22,'가장자리로 갈수록 작은 점',{dotByCov:true}],[.15,.2,'단단한 덩어리']]
    .forEach(([e0,e1,nm,o])=>add('가장자리',nm,'덩어리 바깥쪽에서 점이 어떻게 줄어드는지 바꿨어요.',{edge0:e0,edge1:e1,...(o||{})}));
  // 5. 점 모양·바탕
  [['circle',{},'동그란 점'],['square',{dot:.38},'네모 점(픽셀)'],['dash',{dot:.36},'짧은 붓 터치'],['circle',{jit:.2},'점마다 농담 차이'],['circle',{under:.15},'아주 옅은 바탕 받침'],['circle',{under:.3},'옅은 바탕 받침'],['dash',{dot:.36,under:.18},'붓 터치 + 받침'],['circle',{alpha:.75},'겹쳐 비치는 점']]
    .forEach(([sh,o,nm])=>add('점 모양·바탕',nm,'점 모양과 바탕을 바꿨어요. 바탕 받침은 흐림이 아니라 점 아래에 같은 색을 아주 옅게 깔아요.',{shape:sh,...o}));
  // 6. 색감·추천
  [[0,1,'원래 색'],[.12,1.05,'밝은 파스텔'],[.02,1.4,'선명하게'],[.06,.85,'차분하게'],
   [.04,1.2,'추천: 고운 점 · 넓게 이어짐',{gap:.0065,spread:2.4,sharp:1.5}],[.04,1.2,'추천: 또렷한 구역 · 큰 점',{gap:.011,sharp:2.4,spread:1.8}],[.04,1.2,'추천: 붓 터치 · 부드러운 섞임',{shape:'dash',dot:.36,sharp:1,spread:2.2}],[.05,1.2,'추천: 캔버스 가득',{fill:.85,size:.13,spread:2.4,gap:.0072}]]
    .forEach(([lf,st,nm,o])=>add('색감·추천',nm,'색의 밝기·채도와 추천 조합이에요.',{lift:lf,sat:st,...(o||{})}));

  L.forEach((s,i)=>{ const id='p'+String(i+1).padStart(3,'0'); s.p.id=id; s.p.bg='#F7F5F0';
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:'#F7F5F0',render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
