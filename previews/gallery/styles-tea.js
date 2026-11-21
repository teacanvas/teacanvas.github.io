/* =========================================================
   찻물 번짐 — 1번 시안(고운 점·고르게 섞임·큰 둥근 방울·크림 바탕)을 기준으로
   ① 점 ↔ 수채 그라데이션 사이 단계  ② 겹침 처리 방식(최근 잔 위로 / 자리 나눠 갖기 / 겹친 만큼 밝게)
   ========================================================= */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,pastel,noise,fbm}=H;
  const BG='#F4ECDD', BGc=H.hex2rgb(BG);
  const mk=n=>{ const c=document.createElement('canvas'); c.width=c.height=Math.max(2,Math.round(n)); return c; };

  /* 한 잔의 색 구역(1번 시안과 같음): 강한 색은 가운데, 약한 색은 가장자리 */
  function zones(rec){
    const r=rng(hash(rec.id+'z')), tot=rec.colors.reduce((s,c)=>s+c.w,0), cs=[...rec.colors].sort((a,b)=>b.w-a.w), a0=r()*6.283;
    return cs.map((c,i)=>{ const share=c.w/tot; if(i===0) return {c:c.rgb,share,x:0,y:0,s:.7};
      const a=a0+(i-1)*6.283/Math.max(1,cs.length-1)+(r()-.5)*.6, d=.4*(1-share*.8); return {c:c.rgb,share,x:Math.cos(a)*d,y:Math.sin(a)*d,s:.55*(.7+share)}; });
  }
  const zw=(Z,x,y)=>Z.map(z=>z.share*Math.exp(-((x-z.x)**2+(y-z.y)**2)/(2*z.s*z.s)));

  /* 배치 */
  function place(recs,W,p){
    const n=recs.length;
    if(p.stack){ const r=rng(7), pts=recs.map(()=>[W*(.5+(r()-.5)*.08),W*(.5+(r()-.5)*.08)]);
      if(p.overlap==='shift'){ const R0=W*.17*.9*.55; for(let k=0;k<120;k++) for(let i=0;i<n;i++){ let fx=(W/2-pts[i][0])*.01, fy=(W/2-pts[i][1])*.01;
        for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
        pts[i][0]=clamp(pts[i][0]+fx,W*.05,W*.95); pts[i][1]=clamp(pts[i][1]+fy,W*.05,W*.95); } }
      return pts; }
    const pts=recs.map(r=>[r.x*W,r.y*W]), R0=W*(p.overlap==='shift'?.95:.75)/Math.sqrt(n+4), it=p.overlap==='shift'?120:50;
    for(let k=0;k<it;k++) for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*(p.overlap==='shift'?.02:.05), fy=(recs[i].y*W-pts[i][1])*(p.overlap==='shift'?.02:.05);
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.05,W*.95); pts[i][1]=clamp(pts[i][1]+fy,W*.05,W*.95); }
    return pts;
  }

  /* 수채 번짐 한 장(반지름 R): 색은 구역 비중을 부드럽게 섞고, 가장자리는 들쭉날쭉 + 살짝 진하게 맺힘 */
  const SPR=new Map();
  function wash(rec,R,p){
    const key=rec.id+'|'+Math.round(R)+'|'+p.edge; if(SPR.has(key)) return SPR.get(key);
    const Z=zones(rec), P=Math.ceil(R*2.3), c0=P/2, cv=mk(P), x=cv.getContext('2d'), im=x.createImageData(P,P), d=im.data, s1=hash(rec.id)%97/7;
    for(let yy=0;yy<P;yy++) for(let xx=0;xx<P;xx++){
      const dx=(xx-c0+.5)/R, dy=(yy-c0+.5)/R, rho=Math.hypot(dx,dy), ph=Math.atan2(dy,dx);
      const er=1+.05*((fbm(Math.cos(ph)*1.4+s1,Math.sin(ph)*1.4+s1,3)-.5)*2);
      const a=H.ss(er,er-.06,rho); const k=(yy*P+xx)*4; if(a<=0){ d[k+3]=0; continue; }
      const w=zw(Z,dx,dy); let ws=0, c=[0,0,0]; w.forEach((q,i)=>{ ws+=q; Z[i].c.forEach((v,j)=>c[j]+=H.lin(v)*q); }); c=c.map(v=>H.gam(v/ws));
      c=pastel(c,.06,1.15); const edge=1+(p.edge??.35)*H.ss(er-.14,er-.01,rho), g=1-.06*(noise(xx*.35+s1,yy*.35)-.5)*2;
      d[k]=c[0]*255; d[k+1]=c[1]*255; d[k+2]=c[2]*255; d[k+3]=clamp(a*.62*edge*g)*255;
    }
    x.putImageData(im,0,0); const o={cv,P}; SPR.set(key,o); return o;
  }

  function render(ctx,W,recs,p){
    if(p.stack) recs=recs.slice(0,{10:1,50:5,100:20}[recs.length]);
    const n=recs.length, r=rng(hash(p.id)), pos=place(recs,W,p);
    const dens=p.stack?1:Math.pow(10/Math.max(10,n),.3), Rb=W*.17*dens*(p.stack?.9:1);
    const order=recs.map((rec,i)=>i); // 오래된 잔 → 최근 잔
    const recency=i=>n<2?1:i/(n-1);
    const fadeOld=i=>p.overlap==='newest'?(.35+.65*Math.pow(recency(i),1.3)):1;
    // ① 수채 바탕
    if(p.t>0){ const L=mk(W), lx=L.getContext('2d');
      order.forEach(i=>{ const rec=recs[i], R=Rb*(.65+.5*rec.i), s=wash(rec,R,p); lx.globalAlpha=Math.min(1,p.t*1.15)*fadeOld(i)*(p.overlap==='lift'?1/(1+.06*n):1)*(p.stack&&p.overlap!=='lift'?1:1); lx.drawImage(s.cv,pos[i][0]-s.P/2,pos[i][1]-s.P/2); });
      ctx.save(); if(p.soft) ctx.filter=`blur(${Math.round(W*p.soft)}px)`; ctx.drawImage(L,0,0); ctx.restore(); }
    // ② 고운 점(입자): t가 클수록 옅고 작게 → 하나하나 구분되지 않는 결
    if(p.t<1){ const dotA=(1-p.t)*.9+.06, dotS=W*.0025*(1-.35*p.t), dots=[];
      order.forEach(i=>{ const rec=recs[i], Z=zones(rec), Rr=Rb*(.65+.5*rec.i), N=Math.round(2200*(Rr/(W*.11))**2*.9*(p.t>0?.7:1));
        for(let k=0;k<N;k++){ const a=r()*6.2832, rr=Math.sqrt(r())*(1+(r()<.05?r()*.08:0)), dx=Math.cos(a)*rr, dy=Math.sin(a)*rr, w=zw(Z,dx,dy);
          let ws=w.reduce((s,q)=>s+q,0), t=r()*ws, zi=0; for(;zi<w.length-1;zi++){ if(t<w[zi]) break; t-=w[zi]; }
          dots.push({x:pos[i][0]+dx*Rr,y:pos[i][1]+dy*Rr,c:pastel(Z[zi].c,.04,1.15),s:dotS*(.8+.4*rec.i),i,a:fadeOld(i)}); } });
      if(p.overlap!=='newest') for(let k=dots.length-1;k>0;k--){ const j=Math.floor(r()*(k+1)); [dots[k],dots[j]]=[dots[j],dots[k]]; }
      ctx.save(); for(const q of dots){ ctx.globalAlpha=dotA*q.a; ctx.fillStyle=H.rgbStr(q.c); ctx.beginPath(); ctx.arc(q.x,q.y,q.s,0,6.2832); ctx.fill(); } ctx.restore(); }
    // ③ 겹친 만큼 밝게: 겹친 횟수를 세어 많이 겹친 곳의 색을 밝게 들어 올림
    if(p.overlap==='lift'){ const im=ctx.getImageData(0,0,W,W), d=im.data, cnt=new Float32Array(W*W);
      recs.forEach((rec,i)=>{ const R=Rb*(.65+.5*rec.i), x0=Math.max(0,Math.floor(pos[i][0]-R)), x1=Math.min(W-1,Math.ceil(pos[i][0]+R)), y0=Math.max(0,Math.floor(pos[i][1]-R)), y1=Math.min(W-1,Math.ceil(pos[i][1]+R));
        for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if((x-pos[i][0])**2+(y-pos[i][1])**2<R*R) cnt[y*W+x]++; });
      for(let k=0;k<W*W;k++){ const c=cnt[k]; if(c<2) continue; const l=Math.min(.45,Math.log(c)*.14), j=k*4;
        const px=[d[j]/255,d[j+1]/255,d[j+2]/255], lum=H.lum(px); for(let q=0;q<3;q++){ let v=lum+(px[q]-lum)*(1+l*.8); v=v+(1-v)*l; d[j+q]=clamp(v)*255; } }
      ctx.putImageData(im,0,0); }
    H.grain(ctx,W,.035);
  }

  const L=[]; const add=(fam,name,desc,p,labels)=>L.push({fam,name,desc,p,labels});
  // ① 점 ↔ 수채 사이 단계
  [[0,'점만 (1번 시안 그대로)'],[.2,'점이 많고 번짐 조금'],[.4,'점 반 · 번짐 반'],[.6,'번짐 위에 고운 입자'],[.8,'거의 수채 · 입자는 결로만'],[1,'수채 번짐만']]
    .forEach(([t,nm])=>add('점 ↔ 수채',nm,'1번 시안을 기준으로 점과 수채 번짐의 비율만 바꿨어요. 오른쪽으로 갈수록 점이 옅고 작아져, 하나하나 구분되지 않는 종이 결처럼 남아요.',{t,edge:.35}));
  add('점 ↔ 수채','번짐 위 입자 · 가장자리 맺힘 강하게','물이 마르며 가장자리에 색이 맺히는 효과를 키웠어요.',{t:.7,edge:.8});
  add('점 ↔ 수채','번짐 위 입자 · 부드럽게 이어짐','방울끼리 경계를 조금 더 부드럽게 이었어요.',{t:.7,edge:.25,soft:.006});
  // ② 겹침 테스트: 같은 자리에 1잔 → 5잔 → 20잔
  const S={10:'1잔',50:'5잔 겹침',100:'20잔 겹침'};
  [['none','그대로 겹침'],['newest','최근 잔이 위로'],['shift','자리 나눠 갖기'],['lift','겹친 만큼 밝게']]
    .forEach(([ov,nm])=>add('겹침 테스트',nm,'같은 자리에 1잔, 5잔, 20잔을 칠했을 때예요. 색이 살아남는지, 탁해지는지 비교해보세요.',{t:.6,edge:.35,stack:true,overlap:ov},S));
  // ③ 겹침 처리를 실제 캔버스에
  [['none','그대로'],['newest','최근 잔이 위로 · 오래된 잔은 옅게'],['shift','자리 나눠 갖기'],['lift','겹친 만큼 밝게']]
    .forEach(([ov,nm])=>add('겹침 처리',nm,'번짐 위 고운 입자(번짐 60%)에 겹침 처리 방식만 바꿔 칠했어요.',{t:.6,edge:.35,overlap:ov}));

  L.forEach((s,i)=>{ const id='t'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:BG,labels:s.labels,render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
