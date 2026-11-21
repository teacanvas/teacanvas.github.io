/* =========================================================
   한 잔 한 덩어리 점묘 — 한 잔이 또렷한 점으로 된 작은 덩어리가 된다
   한 잔 = 찻물 색(비중 .5) + 풍미 색(대화에서 나온 강도 w).
   비중이 큰 색일수록 점이 많고 덩어리 가운데를 차지하며, 약한 색은 가장자리에 적게 놓인다.
   덩어리 안에서 색 구역이 만나는 곳은 점이 섞여 그라데이션이 된다. 흐림 처리 없음.
   ========================================================= */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,pastel}=H;

  function zones(rec,p){
    const r=rng(hash(rec.id+'z')), tot=rec.colors.reduce((s,c)=>s+c.w,0);
    const cs=[...rec.colors].sort((a,b)=>b.w-a.w), a0=r()*6.283;
    return cs.map((c,i)=>{ const share=c.w/tot;
      if(i===0) return {c:c.rgb,share,x:0,y:0,s:p.coreS};
      const a=a0+(i-1)*6.283/Math.max(1,cs.length-1)+(r()-.5)*.6, d=p.off*(1-share*.8);
      return {c:c.rgb,share,x:Math.cos(a)*d,y:Math.sin(a)*d,s:p.sideS*(.7+share)};
    });
  }
  const gauss=r=>{ let u=0; for(let k=0;k<4;k++) u+=r(); return (u-2)/1.15; };

  function positions(recs,W,p){
    const n=recs.length, pts=recs.map(r=>[r.x*W,r.y*W]); if(p.layout==='pos') return pts;
    if(p.layout==='grid'){ const m=Math.ceil(Math.sqrt(n)), g=W/(m+.4); return recs.map((r,i)=>[g*(.7+i%m),g*(.7+Math.floor(i/m))]); }
    if(p.layout==='spiral'){ const o=recs.map((r,i)=>[r,i]).sort((a,b)=>((1-a[0].x)+a[0].y)-((1-b[0].x)+b[0].y)), out=[], k=W*.4/Math.sqrt(Math.max(n,10));
      o.forEach(([r,i],j)=>{ const a=j*2.39996, rr=k*Math.sqrt(j+.6); out[i]=[W/2+Math.cos(a)*rr,W/2+Math.sin(a)*rr]; }); return out; }
    const R0=W*(p.fill??.5)/Math.sqrt(n+4);
    for(let it=0;it<50;it++) for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.05,W*.95); pts[i][1]=clamp(pts[i][1]+fy,W*.05,W*.95); }
    return pts;
  }

  function render(ctx,W,recs,p){
    const n=recs.length, r=rng(hash(p.id)), pos=positions(recs,W,p);
    const dens=Math.pow(10/Math.max(10,n),p.shrink??.3), R=W*p.size*dens;
    if(p.under){ const F=H.field(recs,90,{spread:1.2}); const bg=H.hex2rgb(p.bg);
      ctx.save(); ctx.globalAlpha=p.under; H.paintField(ctx,W,F,(c,a)=>H.mix(bg,pastel(c,.25,1),H.ss(0,.9,a)).map(v=>v*255),.01); ctx.restore(); }
    const dots=[];
    recs.forEach((rec,i)=>{ const Z=zones(rec,p), Rr=R*(.65+.5*rec.i), N=Math.round(p.n*(.6+.4*rec.i)*(Rr/R)**2);
      for(let k=0;k<N;k++){
        let u=r(), z=Z[0]; for(const q of Z){ if(u<q.share){ z=q; break; } u-=q.share; }
        let dx=z.x+gauss(r)*z.s, dy=z.y+gauss(r)*z.s;
        if(p.ring){ const rr=Math.hypot(dx,dy)||1e-3, t=p.ring, m=(1-t)+t*.85/rr*Math.min(1,rr*1.6); dx*=m; dy*=m; }
        if(p.clip){ const rr=Math.hypot(dx,dy); if(rr>p.clip){ dx*=p.clip/rr*(.92+.08*r()); dy*=p.clip/rr*(.92+.08*r()); } }
        let c=pastel(z.c,p.lift,p.sat); if(p.jit){ const j=1+(r()-.5)*p.jit; c=c.map(v=>clamp(v*j)); }
        dots.push({x:pos[i][0]+dx*Rr,y:pos[i][1]+dy*Rr,c,s:W*p.dot*(p.dotVar?(1-p.dotVar/2+p.dotVar*r()):1)*(.8+.4*rec.i),i});
      } });
    if(!p.byCup) for(let k=dots.length-1;k>0;k--){ const j=Math.floor(r()*(k+1)); [dots[k],dots[j]]=[dots[j],dots[k]]; }
    const shape=p.shape; ctx.save(); ctx.globalAlpha=p.alpha;
    for(const d of dots){ ctx.fillStyle=H.rgbStr(d.c); ctx.beginPath();
      if(shape==='circle') ctx.arc(d.x,d.y,d.s,0,6.2832);
      else if(shape==='square') ctx.rect(d.x-d.s,d.y-d.s,d.s*2,d.s*2);
      else if(shape==='dash'){ const a=(p.dashA??-.6)+(r()-.5)*.5; ctx.ellipse(d.x,d.y,d.s*1.9,d.s*.7,a,0,6.2832); }
      else if(shape==='petal'){ const a=Math.atan2(d.y-pos[d.i][1],d.x-pos[d.i][0]); ctx.ellipse(d.x,d.y,d.s*1.7,d.s*.75,a,0,6.2832); }
      ctx.fill(); }
    ctx.restore();
    if(p.grain) H.grain(ctx,W,p.grain);
    if(p.axes) H.axes(ctx,W,.07,true);
  }

  const B={size:.11,n:900,dot:.0045,coreS:.42,sideS:.3,off:.55,lift:.04,sat:1.15,alpha:.9,layout:'spread',fill:.5,grain:.03,shape:'circle',bg:'#F7F5F0'};
  const L=[]; const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});

  // 1. 점 크기 (처음 시안과 같은 6가지 + 4)
  [[.0025,2200,'아주 고운 점'],[.0035,1400,'고운 점'],[.0045,900,'기본 점'],[.006,520,'조금 큰 점'],[.008,300,'큰 점'],[.0045,900,'점 크기 제각각',{dotVar:1}],
   [.003,1800,'고운 점 · 촘촘하게',{n:2600}],[.0045,1400,'기본 점 · 촘촘하게'],[.0045,550,'기본 점 · 성기게'],[.011,170,'아주 큰 점']]
    .forEach(([d,n,nm,o])=>add('점 크기',nm,'점 하나의 크기와 점 개수를 바꿨어요.',{dot:d,n,...(o||{})}));
  // 2. 색 섞임
  [[.25,.18,.55,'또렷하게 나뉨'],[.35,.25,.55,'조금 섞임'],[.42,.3,.55,'기본 섞임'],[.55,.42,.5,'많이 섞임'],[.7,.55,.4,'고르게 섞임'],
   [.3,.22,.8,'풍미가 바깥으로'],[.5,.2,.6,'찻물 색 크게'],[.25,.35,.45,'풍미 색 크게'],[.35,.25,.55,'섞임 · 큰 점',{dot:.007,n:420}],[.55,.42,.5,'섞임 · 고운 점',{dot:.003,n:1800}]]
    .forEach(([cs,ss,off,nm,o])=>add('색 섞임',nm,'한 잔 안에서 찻물 색과 풍미 색 구역이 얼마나 섞이는지 바꿨어요. 비중이 큰 색이 가운데, 약한 색이 가장자리예요.',{coreS:cs,sideS:ss,off,...(o||{})}));
  // 3. 덩어리 크기·배치
  [[.08,.45,'작은 덩어리'],[.11,.5,'기본 덩어리'],[.14,.6,'큰 덩어리'],[.17,.75,'아주 큰 덩어리'],[.11,.5,'실제 위치 그대로',{layout:'pos'}],
   [.13,.85,'캔버스 가득'],[.1,.5,'마신 순서 격자',{layout:'grid'}],[.1,.5,'해바라기 나선(좋았던 차가 가운데)',{layout:'spiral'}],[.12,.65,'잔마다 크기 차이 크게',{shrink:.22}],[.09,.4,'작게 · 촘촘하게 모임']]
    .forEach(([sz,fl,nm,o])=>add('덩어리·배치',nm,'한 잔이 차지하는 크기와 잔들을 놓는 방식을 바꿨어요.',{size:sz,fill:fl,n:Math.round(900*(sz/.11)**1.2),...(o||{})}));
  // 4. 덩어리 모양
  [[{},'기본(구름 모양)'],[{ring:.5},'방울 모양 살리기'],[{ring:.85},'둥근 방울'],[{clip:.95},'테두리 또렷한 방울'],[{clip:.8,ring:.4},'작고 단단한 방울'],
   [{coreS:.3,sideS:.18,off:.75},'꽃잎처럼 갈라짐'],[{shape:'petal',dot:.004},'꽃잎 모양 점'],[{coreS:.55,sideS:.45,off:.3},'뭉게뭉게'],[{ring:.6,coreS:.5},'고리 모양'],[{clip:1.1,coreS:.6,sideS:.5},'넓게 퍼진 원']]
    .forEach(([o,nm])=>add('덩어리 모양',nm,'한 잔 덩어리의 모양을 바꿨어요.',o));
  // 5. 점 모양·질감
  [['circle',{},'동그란 점'],['square',{dot:.004},'네모 점(픽셀)'],['dash',{dot:.004},'짧은 붓 터치'],['circle',{jit:.18},'점마다 농담 차이'],['circle',{alpha:.7},'겹쳐 비치는 점'],
   ['circle',{alpha:1},'불투명한 점'],['dash',{dot:.0035,dashA:0},'가로 붓 터치'],['square',{dot:.003,n:1700},'고운 픽셀'],['circle',{byCup:true},'잔 단위로 겹침(최근 잔이 위)'],['dash',{dot:.004,jit:.2},'붓 터치 · 농담']]
    .forEach(([sh,o,nm])=>add('점 모양',nm,'점의 모양과 질감을 바꿨어요.',{shape:sh,...o}));
  // 6. 색감·바탕
  [[0,1,'원래 색'],[.1,1.05,'밝은 파스텔'],[.2,1,'아주 파스텔'],[.02,1.4,'선명하게'],[.06,.85,'차분하게'],
   [.04,1.15,'아주 옅은 바탕 받침',{under:.12}],[.04,1.15,'옅은 바탕 받침',{under:.25}],[.04,1.15,'크림 종이',{bg:'#F4ECDD'}],[.04,1.15,'흰 종이',{bg:'#FCFCFA',grain:0}],[.04,1.15,'축 표시',{axes:1}]]
    .forEach(([lf,st,nm,o])=>add('색감·바탕',nm,'색의 밝기·채도와 바탕을 바꿨어요.',{lift:lf,sat:st,...(o||{})}));

  L.forEach((s,i)=>{ const id='c'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:s.p.bg,render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
