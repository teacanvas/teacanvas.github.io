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
      if(p.round){ for(let k=0;k<N;k++){
          const a=r()*6.2832, rr=Math.sqrt(r())*(1+(r()<p.round.soft?r()*p.round.out:0)), dx=Math.cos(a)*rr, dy=Math.sin(a)*rr;
          let ws=0; const w=Z.map(z=>{ const q=z.share*Math.exp(-((dx-z.x)**2+(dy-z.y)**2)/(2*z.s*z.s)); ws+=q; return q; });
          let t=r()*ws, zi=0; for(;zi<w.length-1;zi++){ if(t<w[zi]) break; t-=w[zi]; }
          let c=pastel(Z[zi].c,p.lift,p.sat); if(p.jit){ const j=1+(r()-.5)*p.jit; c=c.map(v=>clamp(v*j)); }
          dots.push({x:pos[i][0]+dx*Rr,y:pos[i][1]+dy*Rr,c,s:W*p.dot*(.8+.4*rec.i),i}); } return; }
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

  // 고른 조합: 아주 고운 점 + 고르게 섞임 + 아주 큰 덩어리 + 둥글고 테두리 또렷한 방울 + 크림 바탕
  const PICK={dot:.0025,coreS:.7,sideS:.55,off:.4,size:.17,fill:.75,bg:'#F4ECDD',round:{soft:.05,out:.08}};
  const nFor=(sz,dot)=>Math.round(2200*(sz/.11)**2*(.0025/dot)**2*.9);
  [['기본 조합',{}],
   ['테두리 아주 또렷',{round:{soft:0,out:0}}],
   ['테두리 살짝 퍼짐',{round:{soft:.12,out:.15}}],
   ['조금 작은 방울',{size:.14,fill:.65}],
   ['더 큰 방울',{size:.2,fill:.85}],
   ['색 조금 더 나뉨',{coreS:.5,sideS:.38,off:.5}],
   ['색 아주 고르게',{coreS:.9,sideS:.75,off:.3}],
   ['점 더 촘촘하게',{nMul:1.5}],
   ['점 조금 크게',{dot:.0033}],
   ['선명한 색',{sat:1.35,lift:.02}],
   ['밝은 파스텔',{lift:.12,sat:1.05}],
   ['실제 위치 그대로',{layout:'pos',size:.15}],
   ['해바라기 나선',{layout:'spiral',size:.14}],
   ['마신 순서 격자',{layout:'grid',size:.12}],
   ['진한 크림 바탕',{bg:'#EFE4CF'}],
   ['옅은 크림 바탕',{bg:'#F8F3EA'}]]
    .forEach(([nm,o])=>{ const q={...PICK,...o}; q.n=Math.round(nFor(q.size,q.dot)*(o.nMul||1)); add('고른 조합',nm,'아주 고운 점 · 고르게 섞임 · 아주 큰 덩어리 · 둥근 방울 · 크림 바탕을 기본으로, 한 가지씩만 바꿨어요.',q); });

  L.forEach((s,i)=>{ const id='c'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:s.p.bg,render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
