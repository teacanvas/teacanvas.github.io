/* =========================================================
   블러 그라데이션(아웃포커스 수채) 100종
   방울마다 3D 색 공간의 색을 작은 점 수백 개로 뿌린 뒤(앞면=가운데, 뒷면=바깥),
   낮은 해상도에 크게 칠하고 키워 흐리게 만든다. 설정만 바꿔 100가지를 그린다.
   ========================================================= */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,ss,noise,fbm,mix,pastel}=H;
  const mk=n=>{ const c=document.createElement('canvas'); c.width=c.height=Math.max(2,Math.round(n)); return c; };

  /* 방울 하나 → 점들(상대 좌표, 반지름 1 기준) */
  const DOTS=new Map();
  function dotsOf(rec,N){
    const k=rec.id+'|'+N; if(DOTS.has(k)) return DOTS.get(k);
    const r=rng(hash(k)), yaw=hash(rec.id)%628/100, cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(.25), sp=Math.sin(.25), out=[];
    for(let i=0;i<N;i++){
      const u=r()*2-1, th=r()*6.2832, s=Math.sqrt(1-u*u), x=s*Math.cos(th), y=s*Math.sin(th), z=u;
      const y1=y*cp-z*sp, z1=y*sp+z*cp, qx=x*cy+z1*sy, qz=-x*sy+z1*cy;
      const c=H.dropColorAt(rec,qx*.97,y1*.97,qz*.97), ang=Math.atan2(y,x), g=(r()+r()+r()-1.5)/1.5;
      const rf=Math.sqrt((1-z)/2)*1.15+Math.abs(g)*.45*Math.sqrt((1-z)/2+.15);
      out.push({x:Math.cos(ang)*rf,y:Math.sin(ang)*rf,c});
    }
    DOTS.set(k,out); return out;
  }

  /* 배치: 실제 향·맛 위치 / 고르게 퍼뜨리기 */
  function positions(recs,W,p){
    const n=recs.length, pts=recs.map(r=>[r.x*W,r.y*W]);
    if(p.layout==='pos') return pts;
    const R0=W*(p.fill??.55)/Math.sqrt(n+4);
    for(let it=0;it<50;it++) for(let i=0;i<n;i++){
      let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.04,W*.96); pts[i][1]=clamp(pts[i][1]+fy,W*.04,W*.96);
    }
    return pts;
  }

  const PAPER={cold:'#F8F6F1',white:'#FCFCFA',cream:'#F6EFE2',gray:'#ECEBE7',mist:'#EEF1F0',blush:'#F7EEEC',ink:'#18171C'};

  function render(ctx,W,recs,p){
    const n=recs.length, dark=p.paper==='ink';
    const dens=Math.pow(10/Math.max(10,n),p.shrink??.28), R=W*p.size*dens;
    const pos=positions(recs,W,p);
    // 1) 흐린 색 덩어리: 작은 격자에 점마다 가우스 얼룩을 실수로 더해(색은 밝은 공간 가중 평균), 종이 위에 덮는다
    const m=Math.round(W/5), f=W/m, blurPx=p.blur*W/480*.55, acc=new Float32Array(m*m*3), wt=new Float32Array(m*m);
    const kExp=p.sharp??1.6;
    recs.forEach((rec,i)=>{ const D=dotsOf(rec,p.n), Rr=R*(.6+.55*rec.i)*(p.sizeVar?(.55+p.sizeVar*(hash(rec.id+'s')%100)/100):1), br=Math.max(.7,Math.hypot(Rr*p.dot*.22,blurPx)/f), rad=Math.ceil(br*2.6), wI=(.6+.4*rec.i)*p.a*25*(40/p.n)*Math.pow(10/Math.max(10,recs.length),p.aShrink??.2);
      for(const q of D){ let c=q.c; c=pastel(c,p.lift||0,p.sat??1.05); const L=[H.lin(c[0]),H.lin(c[1]),H.lin(c[2])];
        const cx=(pos[i][0]+q.x*Rr*(p.swirl?1+.08*Math.sin(q.y*9):1))/f, cy=(pos[i][1]+q.y*Rr)/f, x0=Math.max(0,Math.floor(cx-rad)), x1=Math.min(m-1,Math.ceil(cx+rad)), y0=Math.max(0,Math.floor(cy-rad)), y1=Math.min(m-1,Math.ceil(cy+rad)), s2=2*br*br;
        for(let yy=y0;yy<=y1;yy++) for(let xx=x0;xx<=x1;xx++){ const dx=xx+.5-cx, dy=yy+.5-cy, e=wI*Math.exp(-(dx*dx+dy*dy)/s2); if(e<1e-5) continue; const k=yy*m+xx, w=Math.pow(e,kExp); acc[k*3]+=L[0]*w; acc[k*3+1]+=L[1]*w; acc[k*3+2]+=L[2]*w; wt[k]+=e; acc.wsum=acc.wsum; if(!acc.ws) acc.ws=new Float32Array(m*m); acc.ws[k]+=w; } } });
    const ws=acc.ws||new Float32Array(m*m), bgc=H.hex2rgb(PAPER[p.paper]||PAPER.cold).map(H.lin), sm=mk(m), sx=sm.getContext('2d'), im=sx.createImageData(m,m), d=im.data, cov=p.cov??1.4;
    for(let k=0;k<m*m;k++){ const a=dark?1-Math.exp(-wt[k]*cov):1-Math.exp(-wt[k]*cov); const c=ws[k]>0?[acc[k*3]/ws[k],acc[k*3+1]/ws[k],acc[k*3+2]/ws[k]]:bgc;
      for(let j=0;j<3;j++) d[k*4+j]=H.gam(bgc[j]+(c[j]-bgc[j])*Math.min(1,a*(p.alpha??1)))*255; d[k*4+3]=255; }
    sx.putImageData(im,0,0);
    let cur=sm; while(cur.width*2.4<W){ const mm=mk(cur.width*2.4), mx=mm.getContext('2d'); mx.imageSmoothingQuality='high'; mx.drawImage(cur,0,0,mm.width,mm.height); cur=mm; }
    ctx.save(); ctx.imageSmoothingQuality='high'; if(p.post) ctx.filter=`blur(${Math.round(W*p.post)}px)`; const o=p.post?W*.03:0; ctx.drawImage(cur,-o,-o,W+2*o,W+2*o); ctx.restore();
    // 2) 결: 덩어리 위에 옅은 점 / 둥근 결
    if(p.keep){ const r=rng(hash(p.id)); ctx.save(); if(dark) ctx.globalCompositeOperation='screen';
      recs.forEach((rec,i)=>{ const D=dotsOf(rec,p.n), Rr=R*(.6+.55*rec.i); D.forEach(q=>{ if(r()>p.keep) return; ctx.globalAlpha=p.keepA??.55; ctx.fillStyle=H.rgbStr(q.c); ctx.beginPath(); ctx.arc(pos[i][0]+q.x*Rr,pos[i][1]+q.y*Rr,Math.max(.7,W*(p.keepR??.004)),0,6.2832); ctx.fill(); }); }); ctx.restore(); }
    if(p.rings){ ctx.save(); ctx.globalCompositeOperation=dark?'screen':'multiply'; ctx.lineWidth=Math.max(.6,W/600);
      recs.forEach((rec,i)=>{ const Rr=R*(.6+.55*rec.i); for(let k=1;k<=p.rings;k++){ ctx.strokeStyle=H.rgbStr(H.shade(rec.colors[k%rec.colors.length].rgb,-.25),.12); ctx.beginPath(); ctx.arc(pos[i][0],pos[i][1],Rr*k/(p.rings+.5),0,6.2832); ctx.stroke(); } }); ctx.restore(); }
    // 3) 종이·질감
    if(p.paperTex){ const nn=Math.round(W/2), c=mk(nn), cx=c.getContext('2d'), im=cx.createImageData(nn,nn), d=im.data, s=hash(p.id)%50;
      for(let j=0;j<nn;j++) for(let i=0;i<nn;i++){ const v=.5+.5*(fbm(i*.05+s,j*.05,3)-.5)+.35*(noise(i*.6,j*.6)-.5), g=clamp(.9+.2*(v-.5)*p.paperTex*2,0,1)*255, k=(j*nn+i)*4; d[k]=d[k+1]=d[k+2]=g; d[k+3]=255; }
      cx.putImageData(im,0,0); ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=.5; ctx.drawImage(c,0,0,W,W); ctx.restore(); }
    if(p.grain) H.grain(ctx,W,p.grain,dark?'screen':'overlay');
    if(p.vignette){ const g=ctx.createRadialGradient(W/2,W/2,W*.3,W/2,W/2,W*.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,dark?'rgba(0,0,0,.5)':'rgba(255,255,255,.55)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,W); }
    if(p.axes) H.axes(ctx,W,dark?.12:.07,p.axes>1,dark);
  }

  /* ---------- 100가지 설정 ---------- */
  const B={size:.12,blur:13,dot:.62,a:.04,n:260,lift:.12,sat:1.05,paper:'cold',layout:'spread',fill:.55,grain:.05};
  const L=[]; const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});

  // 1. 흐림 정도
  [[8,'아주 또렷'],[11,'또렷'],[14,'조금 흐리게'],[18,'기본'],[22,'흐리게'],[27,'많이 흐리게'],[32,'아주 흐리게'],[18,'기본 + 후처리 흐림',.01],[14,'또렷 + 후처리 흐림',.018],[24,'흐리게 + 후처리 흐림',.012]]
    .forEach(([b,nm,post])=>add('흐림 정도',nm,'덩어리 테두리가 얼마나 흐려지는지만 바꿨어요. 숫자가 클수록 초점이 더 나가요.',{blur:b,post:post||0,a:.04*(b/18)**.6}));
  // 2. 덩어리 크기
  [[.06,'아주 작게'],[.08,'작게'],[.1,'조금 작게'],[.12,'기본'],[.14,'조금 크게'],[.17,'크게'],[.21,'아주 크게'],[.12,'크기 제각각',.9],[.16,'크게 · 제각각',.9],[.09,'작게 · 제각각',1]]
    .forEach(([sz,nm,sv])=>add('덩어리 크기',nm,'한 잔이 차지하는 색 덩어리 크기를 바꿨어요.',{size:sz,sizeVar:sv||0}));
  // 3. 농도
  [[.018,'아주 옅게'],[.025,'옅게'],[.032,'조금 옅게'],[.04,'기본'],[.05,'조금 진하게'],[.065,'진하게'],[.085,'아주 진하게'],[.03,'옅게 · 밝게',.2],[.06,'진하게 · 선명하게',0,1.35],[.045,'중간 · 맑게',.14]]
    .forEach(([a,nm,lift,sat])=>add('농도',nm,'물감 농도를 바꿨어요. 옅을수록 종이가 비치고, 진할수록 색이 꽉 차요.',{a,lift:lift??.06,sat:sat??1.15}));
  // 4. 채움 정도(배치)
  [['pos',.55,'실제 위치 그대로'],['spread',.4,'조금 퍼뜨리기'],['spread',.55,'기본 퍼뜨리기'],['spread',.7,'넓게 퍼뜨리기'],['spread',.85,'캔버스 가득'],['pos',.55,'실제 위치 · 크게'],['spread',.7,'넓게 · 작게'],['spread',.95,'가득 · 옅게'],['pos',.55,'실제 위치 · 흐리게'],['spread',.6,'퍼뜨리기 · 크기 제각각']]
    .forEach(([ly,fl,nm],i)=>add('채움',nm,'덩어리를 실제 향·맛 위치에 둘지, 서로 밀어 캔버스를 채울지 바꿨어요.',{layout:ly,fill:fl,size:[.12,.12,.12,.12,.12,.17,.09,.14,.12,.12][i],blur:i===8?26:18,a:i===7?.028:.04,sizeVar:i===9?.9:0}));
  // 5. 덩어리 속 결(점)
  [[.04,.5,.003,'점 아주 조금'],[.08,.55,.0035,'점 조금'],[.14,.55,.004,'점 보통'],[.22,.6,.004,'점 많이'],[.35,.65,.0045,'점 아주 많이'],[.1,.8,.0028,'작고 진한 점'],[.1,.35,.006,'크고 옅은 점'],[.18,.5,.0025,'고운 점'],[.06,.9,.005,'반짝이는 점'],[.28,.4,.0035,'점묘에 가깝게']]
    .forEach(([k,ka,kr,nm])=>add('덩어리 속 점',nm,'흐린 색 덩어리 위에 방울에서 나온 색 점을 남겨, 가까이 보면 결이 보여요.',{keep:k,keepA:ka,keepR:kr}));
  // 6. 둥근 결(소용돌이·나이테)
  [[0,true,'소용돌이 결'],[2,false,'나이테 2겹'],[4,false,'나이테 4겹'],[7,false,'나이테 7겹'],[3,true,'소용돌이 + 나이테'],[0,true,'소용돌이 · 진하게'],[5,false,'나이테 · 흐리게'],[3,false,'나이테 · 크게'],[6,true,'소용돌이 + 촘촘한 나이테'],[2,true,'은은한 소용돌이']]
    .forEach(([rg,sw,nm],i)=>add('둥근 결',nm,'덩어리 안에 찻잔을 저은 듯한 둥근 결을 더했어요.',{rings:rg,swirl:sw,a:i===5?.06:.04,blur:i===6?26:18,size:i===7?.16:.12}));
  // 7. 색감
  [[.0,1,'그대로'],[.06,1.15,'기본'],[.12,1.2,'밝게'],[.2,1.1,'파스텔'],[.3,1,'아주 파스텔'],[.04,1.4,'선명하게'],[.02,1.6,'아주 선명하게'],[.1,.8,'차분하게'],[.15,.6,'뮤트'],[.25,1.35,'밝고 선명하게']]
    .forEach(([lf,st,nm])=>add('색감',nm,'같은 색을 밝기와 채도만 바꿔서 칠했어요.',{lift:lf,sat:st}));
  // 8. 종이
  [['cold',.5,'수채 종이'],['white',0,'흰 종이 · 매끈'],['cream',.6,'크림 종이'],['gray',.4,'옅은 회색 종이'],['mist',.3,'푸른빛 종이'],['blush',.3,'분홍빛 종이'],['cold',1,'거친 수채 종이'],['white',.2,'흰 종이 · 가장자리 밝게'],['cream',.9,'크림 · 거친 결'],['cold',.4,'수채 종이 · 축 표시']]
    .forEach(([pp,tx,nm],i)=>add('종이',nm,'바탕 종이와 결을 바꿨어요.',{paper:pp,paperTex:tx,vignette:i===7,axes:i===9?2:0}));
  // 9. 어두운 바탕(빛)
  [[18,.04,'먹빛 · 기본'],[24,.035,'먹빛 · 흐리게'],[12,.05,'먹빛 · 또렷'],[18,.06,'먹빛 · 진하게'],[18,.03,'먹빛 · 옅게'],[22,.045,'먹빛 · 점 반짝임'],[18,.04,'먹빛 · 크게'],[16,.04,'먹빛 · 가장자리 어둡게'],[20,.05,'먹빛 · 선명하게'],[18,.04,'먹빛 · 나이테']]
    .forEach(([b,a,nm],i)=>add('어두운 바탕',nm,'어두운 바탕 위에서 색이 빛처럼 번져요.',{paper:'ink',blur:b,a,keep:i===5?.12:0,keepA:.8,size:i===6?.16:.12,vignette:i===7,sat:i===8?1.4:1.15,rings:i===9?4:0,lift:.02}));
  // 10. 조합 추천
  [['보케 수채',{blur:24,a:.045,keep:.06,keepA:.7,size:.14,paperTex:.4}],['안개 낀 꽃밭',{blur:30,a:.035,lift:.15,size:.16,fill:.75}],['맑은 오후',{blur:14,a:.04,lift:.12,sat:1.25,paper:'white',post:.012}],
   ['찻잔 소용돌이',{rings:3,swirl:true,blur:18,a:.045,keep:.05}],['캔버스 가득',{fill:.9,size:.15,blur:22,a:.04}],['점과 번짐 사이',{keep:.25,keepA:.5,blur:20,a:.035}],
   ['종이에 스민 색',{paper:'cream',paperTex:.8,blur:16,a:.05,lift:.03}],['또렷한 꽃잎',{blur:10,a:.05,size:.11,post:.006}],['흐린 사진',{blur:26,post:.01,a:.045,grain:.09}],['실제 위치 · 넓게 번짐',{layout:'pos',size:.16,blur:24,a:.04,axes:1}]]
    .forEach(([nm,o])=>add('추천 조합',nm,'여러 설정을 섞은 조합이에요.',o));

  L.forEach((s,i)=>{ const id='b'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:PAPER[s.p.paper]||PAPER.cold,render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
