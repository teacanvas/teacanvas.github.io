/* 유화 시안 — 소용돌이 붓질(H)과 유화 점묘(K)를 공용 틀로 옮김. 붓질 색은 3D 찻방울 색 공간에서 가져온다 */
(function(){
  const H=GALLERY.H; const {rng,hash,clamp,fbm}=H;
  const mk=n=>{ const c=document.createElement('canvas'); c.width=c.height=Math.max(2,Math.ceil(n)); return c; };
  function brush(ctx,pts,width,rgb,rnd,{bristles=8,relief=.5,jit=.09}={}){
    const n=pts.length, nm=pts.map((p,i)=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(n-1,i+1)], dx=b.x-a.x, dy=b.y-a.y, l=Math.hypot(dx,dy)||1; return {x:-dy/l,y:dx/l}; });
    const line=(off,c,lw,s0=0,s1=1)=>{ ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.beginPath(); const i0=Math.floor(s0*(n-1)), i1=Math.ceil(s1*(n-1));
      for(let i=i0;i<=i1;i++){ const q=pts[i], m=nm[i]; i===i0?ctx.moveTo(q.x+m.x*off,q.y+m.y*off):ctx.lineTo(q.x+m.x*off,q.y+m.y*off); } ctx.stroke(); };
    ctx.lineCap='round'; ctx.lineJoin='round'; line(0,H.rgbStr(rgb),width*.92);
    for(let b=0;b<bristles;b++){ const t=b/(bristles-1)-.5, e=Math.abs(t)*2, k=1+(rnd()-.5)*2*jit; line(t*width*.9,H.rgbStr(rgb.map(v=>clamp(v*k)),.9),width/bristles*1.5,e*.18*rnd(),1-e*.18*rnd()); }
    if(relief){ line(-width*.38,`rgba(255,255,255,${.3*relief})`,Math.max(1,width*.07),.1,.85); line(width*.42,`rgba(40,25,10,${.13*relief})`,Math.max(1,width*.07),.15,.95); }
  }
  const col=(r,u,v)=>H.pastel(H.dropDiscColor(r,clamp(u,-1,1),clamp(v,-1,1)),.04,1.15);
  const GEN={
    swirl(r,R,rnd,c){ const out=[]; for(let i=0;i<6;i++){ const ph=rnd()*6.283, rr=.06+.1*rnd(), pts=[]; for(let k=0;k<=10;k++){ const a=ph+k/10*5; pts.push({x:c+Math.cos(a)*rr*R*(1+k*.04),y:c+Math.sin(a)*rr*R*(1+k*.04)}); } out.push({pts,w:R*.13,c:col(r,0,0),t:-1}); }
      for(let i=0,N=Math.round(70+R*.9);i<N;i++){ const rho=.12+Math.sqrt(rnd())*.78, ph=rnd()*6.283, L=(.25+.45*rnd())/Math.max(.3,rho), w=R*(.07+.07*rnd()), pts=[];
        for(let k=0;k<=8;k++){ const a=ph+L*k/8; pts.push({x:c+Math.cos(a)*rho*R,y:c+Math.sin(a)*rho*R}); }
        out.push({pts,w,c:col(r,Math.cos(ph+L/2)*rho,Math.sin(ph+L/2)*rho),t:rho+rnd()*.3}); } return out.sort((a,b)=>a.t-b.t); },
    dabs(r,R,rnd,c){ const out=[]; for(let i=0,N=Math.round(Math.min(420,Math.max(170,R*R/9)));i<N;i++){ let x,y; do{ x=rnd()*2-1; y=rnd()*2-1; }while(x*x+y*y>.86);
        const th=Math.atan2(y,x)+1.57+(rnd()-.5)*.9, w=R*(.055+.03*rnd()), L=w*(1.1+rnd()), pts=[]; for(let k=0;k<=3;k++){ const s=(k/3-.5)*L; pts.push({x:c+x*R+Math.cos(th)*s,y:c+y*R+Math.sin(th)*s}); }
        out.push({pts,w,c:col(r,x,y),t:Math.hypot(x,y)*.6+rnd()*.4,o:{relief:.55,bristles:5}}); } return out.sort((a,b)=>a.t-b.t); },
  };
  let LIN=null;
  function linen(ctx,W){ if(!LIN){ LIN=mk(96); const x=LIN.getContext('2d'), im=x.createImageData(96,96), d=im.data, rr=rng(11);
      for(let y=0;y<96;y++) for(let i=0;i<96;i++){ const w=(Math.sin(i*2.1)*.5+.5)*.55+(Math.sin(y*2.1)*.5+.5)*.45, v=232+w*14+rr()*7, o=(y*96+i)*4; d[o]=v; d[o+1]=v-4; d[o+2]=v-12; d[o+3]=255; } x.putImageData(im,0,0); }
    ctx.fillStyle=ctx.createPattern(LIN,'repeat'); ctx.fillRect(0,0,W,W); }
  function spread(recs,W){ const n=recs.length, pts=recs.map(r=>[r.x*W,r.y*W]), R0=W*.55/Math.sqrt(n+4);
    for(let it=0;it<50;it++) for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
      for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], d=Math.hypot(dx,dy)+.01; if(d<R0*2){ const f=(R0*2-d)/d*.25; fx+=dx*f; fy+=dy*f; } }
      pts[i][0]=clamp(pts[i][0]+fx,W*.06,W*.94); pts[i][1]=clamp(pts[i][1]+fy,W*.06,W*.94); } return pts; }
  [['swirl','소용돌이 붓질','찻잔을 젓듯 동그랗게 도는 붓질로 방울을 채운 유화예요.'],['dabs','유화 점묘','짧은 붓 터치를 촘촘히 찍은 유화예요.']].forEach(([k,nm,ds],i)=>
    GALLERY.add({id:'o00'+(i+1),name:nm,cat:'유화',desc:ds,bg:'#EDE6DA',render(ctx,W,recs){ linen(ctx,W); const pos=spread(recs,W), dens=Math.pow(10/Math.max(10,recs.length),.35);
      recs.forEach((r,j)=>{ const R=W*(.07+.05*r.i)*dens, P=Math.ceil(R*2.5), rnd=rng(hash(r.id+k)), S=GEN[k](r,R,rnd,P/2), cv=mk(P), x=cv.getContext('2d'), rr=rng(7);
        S.forEach(s=>brush(x,s.pts,s.w,s.c,rr,s.o||{})); ctx.drawImage(cv,pos[j][0]-P/2,pos[j][1]-P/2); }); }}));
})();
