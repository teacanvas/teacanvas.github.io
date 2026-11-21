/* =========================================================
   꽃물 수채 — 레퍼런스(젖은 종이 위 꽃 수채) 느낌
   한 잔 = 꽃잎 몇 장 모양의 번짐. 연한 물빛 위에 마르며 생긴 가는 테두리(tide line),
   색이 고인 진한 점(hot spot), 종이 결 입자, 꽃잎 사이 흰 틈이 남는다.
   색은 기록의 찻물 색 + 풍미 색, 비중대로 꽃잎을 나눠 칠한다.
   ========================================================= */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,pastel,shade,rgbStr,noise,fbm}=H;
  const mk=n=>{ const c=document.createElement('canvas'); c.width=c.height=Math.max(2,Math.ceil(n)); return c; };
  const g=r=>(r()+r()+r()-1.5)/1.5;
  function circle(n,cx,cy,rx,ry,rot,r,wob){ const o=[]; for(let i=0;i<n;i++){ const a=i/n*6.283, k=1+wob*g(r), x=Math.cos(a)*rx*k, y=Math.sin(a)*ry*k;
    o.push({x:cx+x*Math.cos(rot)-y*Math.sin(rot),y:cy+x*Math.sin(rot)+y*Math.cos(rot),v:.5+r()}); } return o; }
  function deform(pts,depth,vs,r){ for(let d=0;d<depth;d++){ const out=[]; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length], l=Math.hypot(b.x-a.x,b.y-a.y);
    out.push(a,{x:(a.x+b.x)/2+g(r)*l*vs*a.v,y:(a.y+b.y)/2+g(r)*l*vs*a.v,v:a.v*(.85+r()*.3)}); } pts=out; } return pts; }
  const path=(x,pts)=>{ x.beginPath(); pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y)); x.closePath(); };

  /* 한 잔 스프라이트 */
  const SP=new Map();
  function cup(rec,R,p){
    const key=p.id+rec.id+Math.round(R); if(SP.has(key)) return SP.get(key);
    const r=rng(hash(key)), P=Math.ceil(R*3), c=P/2, cv=mk(P), x=cv.getContext('2d');
    const tot=rec.colors.reduce((s,q)=>s+q.w,0), cs=[...rec.colors].sort((a,b)=>b.w-a.w);
    const nP=p.petals[0]+Math.floor(r()*(p.petals[1]-p.petals[0]+1)), a0=r()*6.283;
    // 꽃잎마다 색: 비중대로 배정(강한 색이 더 많은 꽃잎)
    const petals=[]; for(let i=0;i<nP;i++){ let u=r()*tot, ci=0; for(;ci<cs.length-1;ci++){ if(u<cs[ci].w) break; u-=cs[ci].w; } petals.push(cs[ci]); }
    x.globalCompositeOperation='multiply';
    petals.forEach((col,i)=>{
      const a=a0+i/nP*6.283+g(r)*.4, d=R*(p.spread*(.35+.45*r())), cx=c+Math.cos(a)*d, cy=c+Math.sin(a)*d;
      const rx=R*(.42+.3*r())*p.petalSize, ry=rx*(.55+.4*r()), rot=a+(r()-.5);
      const base=deform(circle(9,cx,cy,rx,ry,rot,r,.15),2,.38,r);
      const tone=pastel(col.rgb,p.lift,p.sat);
      // 물빛 번짐: 옅은 층을 여러 장
      // 꽃잎 안에서도 한쪽으로 색이 고이고 반대쪽은 맑게(젖은 종이 위 물감처럼)
      const ga=r()*6.283, gx=cx+Math.cos(ga)*rx*.45, gy=cy+Math.sin(ga)*ry*.45, grd=x.createRadialGradient(gx,gy,0,gx,gy,Math.max(rx,ry)*1.35);
      grd.addColorStop(0,rgbStr(tone,p.alpha*1.6)); grd.addColorStop(.55,rgbStr(tone,p.alpha*.9)); grd.addColorStop(1,rgbStr(tone,p.alpha*.25));
      for(let l=0;l<p.layers;l++){ path(x,deform(base,2,.2,r)); x.fillStyle=grd; x.fill(); }
      // 마르며 생긴 테두리
      if(p.edge){ x.save(); path(x,deform(base,2,.06,r)); x.strokeStyle=rgbStr(shade(tone,-.35),p.edge); x.lineWidth=Math.max(.7,R*.012); x.stroke(); x.restore(); }
      // 색이 고인 진한 점
      if(p.hot && r()<p.hotP){ const hx=cx+g(r)*rx*.35, hy=cy+g(r)*ry*.35, hr=rx*(.18+.22*r()), hb=deform(circle(8,hx,hy,hr,hr*(.7+.3*r()),r()*3,r,.25),3,.3,r);
        x.save(); if(p.hotBlur) x.filter=`blur(${Math.max(.5,R*p.hotBlur)}px)`; for(let l=0;l<6;l++){ path(x,deform(hb,2,.2,r)); x.fillStyle=rgbStr(pastel(col.rgb,0,1.4),p.hot); x.fill(); } x.restore(); }
      // 종이 결 입자
      if(p.gran){ x.save(); path(x,base); x.clip(); x.fillStyle=rgbStr(shade(tone,-.3),.35);
        for(let k=0;k<Math.min(400,Math.round(rx*ry*p.gran*.03));k++){ const gx=cx+g(r)*rx, gy=cy+g(r)*ry; x.fillRect(gx,gy,Math.max(.6,R*.008),Math.max(.6,R*.008)); } x.restore(); }
    });
    // 젖은 번짐: 전체를 살짝 흐리게 한 장 더
    if(p.wet){ const w=mk(P), wx=w.getContext('2d'); wx.filter=`blur(${R*p.wet}px)`; wx.drawImage(cv,0,0); x.globalCompositeOperation='source-over'; x.globalAlpha=.55; x.drawImage(w,0,0); x.globalAlpha=1; }
    const o={cv,P}; SP.set(key,o); return o;
  }
  function spread(recs,W,fill){ const n=recs.length, pts=recs.map(r=>[r.x*W,r.y*W]), R0=W*fill/Math.sqrt(n+4);
    for(let it=0;it<50;it++) for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.04,W*.96); pts[i][1]=clamp(pts[i][1]+fy,W*.04,W*.96); } return pts; }
  function paperTex(ctx,W,amt){ const nn=Math.round(W/2), c=mk(nn), cx=c.getContext('2d'), im=cx.createImageData(nn,nn), d=im.data;
    for(let j=0;j<nn;j++) for(let i=0;i<nn;i++){ const v=.5+.5*(fbm(i*.05,j*.05,3)-.5)+.4*(noise(i*.7,j*.7)-.5), gg=clamp(.92+.18*(v-.5)*amt*2)*255, k=(j*nn+i)*4; d[k]=d[k+1]=d[k+2]=gg; d[k+3]=255; }
    cx.putImageData(im,0,0); ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=.45; ctx.drawImage(c,0,0,W,W); ctx.restore(); }

  function render(ctx,W,recs,p){
    const pos=spread(recs,W,p.fill), dens=Math.pow(10/Math.max(10,recs.length),p.shrink), R=W*p.size*dens;
    ctx.save(); ctx.globalCompositeOperation='multiply';
    recs.forEach((rec,i)=>{ const s=cup(rec,R*(.7+.45*rec.i),p); ctx.globalAlpha=p.cupA*Math.pow(10/Math.max(10,recs.length),.32); ctx.drawImage(s.cv,pos[i][0]-s.P/2,pos[i][1]-s.P/2); });
    ctx.restore();
    if(p.tex) paperTex(ctx,W,p.tex);
  }

  const B={petals:[3,5],spread:.5,petalSize:1.15,layers:10,alpha:.07,lift:.36,sat:1.2,edge:.28,hot:.1,hotP:.55,hotBlur:.03,gran:.5,wet:.02,size:.16,fill:.72,shrink:.25,cupA:.9,tex:.6};
  const L=[]; const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});
  // 1. 농도
  [[.03,'아주 연하게'],[.045,'연하게'],[.07,'기본'],[.1,'조금 진하게'],[.14,'진하게']].forEach(([a,nm])=>add('농도',nm,'물감 농도만 바꿨어요. 연할수록 물처럼 맑아요.',{alpha:a}));
  // 2. 테두리(마른 자국)
  [[0,'테두리 없음'],[.15,'테두리 은은하게'],[.28,'기본'],[.5,'테두리 또렷하게'],[.28,'테두리 · 흰 틈 많이',{spread:.75,petalSize:.85}]].forEach(([e,nm,o])=>add('마른 자국',nm,'물이 마르며 가장자리에 남는 가는 테두리의 진하기를 바꿨어요.',{edge:e,...(o||{})}));
  // 3. 진한 점(색이 고인 자리)
  [[0,0,'진한 점 없음'],[.08,.5,'진한 점 은은하게'],[.12,.6,'기본'],[.2,.8,'진한 점 또렷하게'],[.25,1,'모든 꽃잎에 진한 점',{hotBlur:.01}]].forEach(([h,hp,nm,o])=>add('진한 점',nm,'꽃잎 안에 색이 고여 진해진 자리를 바꿨어요. 레퍼런스의 빨간 점 같은 부분이에요.',{hot:h,hotP:hp,...(o||{})}));
  // 4. 젖은 번짐
  [[0,'마른 종이'],[.03,'살짝 젖음'],[.06,'젖은 종이'],[.1,'아주 젖음'],[.06,'젖음 · 테두리 또렷',{edge:.45}]].forEach(([w,nm,o])=>add('젖은 번짐',nm,'종이가 젖은 정도를 바꿨어요. 젖을수록 경계가 부드럽게 번져요.',{wet:w,...(o||{})}));
  // 5. 꽃잎 모양·크기
  [[[2,3],1.2,'꽃잎 적고 크게'],[[3,5],1,'기본'],[[5,8],.8,'꽃잎 많고 작게'],[[3,5],1,'한 덩어리처럼 모임',{spread:.3}],[[4,6],.9,'흩어진 꽃잎',{spread:.85}]].forEach(([pt,ps,nm,o])=>add('꽃잎',nm,'한 잔을 이루는 꽃잎의 수와 크기를 바꿨어요.',{petals:pt,petalSize:ps,...(o||{})}));
  // 6. 캔버스 채움
  [[.1,.45,'작은 꽃 · 여백 많이'],[.13,.6,'기본'],[.17,.75,'큰 꽃 · 가득'],[.2,.9,'아주 크게 · 빈틈없이'],[.13,.6,'잔이 많아도 크기 유지',{shrink:.15}]].forEach(([sz,fl,nm,o])=>add('채움',nm,'꽃 크기와 캔버스를 채우는 정도를 바꿨어요.',{size:sz,fill:fl,...(o||{})}));
  // 7. 색감
  [[.45,1,'아주 맑게'],[.3,1.15,'기본'],[.18,1.3,'선명하게'],[.3,.8,'차분하게'],[.38,1.25,'맑고 선명하게']].forEach(([lf,st,nm])=>add('색감',nm,'같은 색을 밝기와 채도만 바꿔 칠했어요.',{lift:lf,sat:st}));
  // 8. 추천 조합
  [['레퍼런스에 가깝게',{alpha:.08,edge:.35,hot:.18,hotP:.75,wet:.03,petals:[3,6],gran:.8}],['맑은 찻물',{alpha:.045,edge:.2,hot:.08,lift:.4,wet:.04}],['또렷한 꽃잎',{alpha:.085,edge:.45,hot:.15,wet:0,petals:[4,6]}],['젖은 꽃밭',{wet:.08,edge:.15,hot:.1,size:.16,fill:.75}],['물빛 가득',{alpha:.055,size:.18,fill:.85,edge:.25,hot:.12,lift:.38}]]
    .forEach(([nm,o])=>add('추천 조합',nm,'여러 설정을 섞은 조합이에요.',o));

  L.forEach((s,i)=>{ const id='f'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:'#FBF8F3',render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
