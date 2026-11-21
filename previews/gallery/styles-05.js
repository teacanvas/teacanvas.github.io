/* =========================================================
   TEA CANVAS 갤러리 — 시안 s501~s520
   주제: 공간 · 생명 · 데이터
   ========================================================= */
(function(){
const FONT='Pretendard, sans-serif';
const PI=Math.PI, TAU=PI*2, GA=2.39996323;
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const pref=r=>cl((1-r.y)*.6+r.x*.4);                    // 0=아쉬움 1=좋음
const flc=(r,k=0)=>r.fl.length?r.fl[k%r.fl.length].rgb:r.tea;
const rgba=(c,a=1)=>`rgba(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)},${a})`;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const lift=(c,t)=>mix(c,[1,1,1],t);
const dark=(c,t)=>c.map(v=>v*(1-t));
const sm=(a,b,x)=>{ const t=cl((x-a)/(b-a)); return t*t*(3-2*t); };
const sizeK=n=>n>60?.68:n>25?.84:1;                      // 기록이 많을수록 조금씩 작게
const groupBy=(recs,f)=>{ const m=new Map(); recs.forEach(r=>{ const k=f(r); if(!m.has(k)) m.set(k,[]); m.get(k).push(r); }); return m; };
const sq2disc=(u,v)=>[u*Math.sqrt(1-v*v/2), v*Math.sqrt(1-u*u/2)];
function text(ctx,s,x,y,size,col,align='center',base='middle'){ ctx.save(); ctx.font=`${size}px ${FONT}`; ctx.fillStyle=col; ctx.textAlign=align; ctx.textBaseline=base; ctx.fillText(s,x,y); ctx.restore(); }
function circle(ctx,x,y,r){ ctx.beginPath(); ctx.arc(x,y,Math.max(.1,r),0,TAU); }
// 겹치지 않게 살짝 밀어내기 (P: {x,y,r})
function relax(P,iters,x0,y0,x1,y1){
  for(let it=0;it<iters;it++){ let moved=false;
    for(let a=0;a<P.length;a++) for(let b=a+1;b<P.length;b++){ const A=P[a],B=P[b]; let dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy); const m=A.r+B.r;
      if(d<m){ if(d<1e-6){ dx=Math.cos(a*7.1+b); dy=Math.sin(a*3.3+b); d=1; } const k=(m-d)/d*.25; A.x-=dx*k; A.y-=dy*k; B.x+=dx*k; B.y+=dy*k; moved=true; } }
    for(const p of P){ p.x=cl(p.x,x0+p.r*.5,x1-p.r*.5); p.y=cl(p.y,y0+p.r*.5,y1-p.r*.5); }
    if(!moved) break; }
  return P;
}
const typeCol=(H,t)=>H.hex2rgb(H.TEAS[t].color);

/* ---------- 501 취향의 나무 ---------- */
GALLERY.add({ id:'s501', name:'취향의 나무', cat:'생명',
  desc:'기록 하나가 잎 하나예요. 차 종류마다 큰 가지가 나뉘고, 새 기록일수록 가지 끝에, 좋았던 차일수록 큰 잎으로 달려요.',
  render(ctx,W,recs,H){
    const R=H.rng(501), G=groupBy(recs,r=>r.type), types=H.TK.filter(t=>G.has(t)), N=recs.length;
    const gy=W*.88, tx=W*.5, ty=W*(.63-.06*Math.sqrt(N/100)), bark='rgba(128,108,90,';
    ctx.lineCap='round';
    ctx.strokeStyle='rgba(0,0,0,.09)'; ctx.lineWidth=Math.max(1,W/480);
    ctx.beginPath(); ctx.moveTo(W*.26,gy); ctx.lineTo(W*.74,gy); ctx.stroke();
    const tw=W*(.009+.01*Math.sqrt(N/100));
    ctx.fillStyle=bark+'.8)'; ctx.beginPath(); ctx.moveTo(tx-tw*1.7,gy); ctx.quadraticCurveTo(tx-tw*.5,gy-W*.1,tx-tw*.55,ty+tw); ctx.lineTo(tx+tw*.55,ty+tw); ctx.quadraticCurveTo(tx+tw*.5,gy-W*.1,tx+tw*1.7,gy); ctx.fill();
    const leaves=[], ends=[];
    types.forEach((t,k)=>{
      const list=G.get(t), n=list.length, a=-PI/2+((k+.5)/types.length-.5)*PI*.82;
      const L=W*Math.min(.19,.09+.02*Math.sqrt(n)), depth=n<3?1:n<9?2:3, slots=[];
      (function grow(x,y,ang,len,d,w){
        const ex=x+Math.cos(ang)*len, ey=y+Math.sin(ang)*len, bend=(R()-.5)*.35*len, cx=(x+ex)/2-Math.sin(ang)*bend, cy=(y+ey)/2+Math.cos(ang)*bend;
        ctx.strokeStyle=bark+'.75)'; ctx.lineWidth=Math.max(.7,w); ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(cx,cy,ex,ey); ctx.stroke();
        const m=Math.max(3,Math.round(len/(W*.01)));
        for(let i=1;i<=m;i++){ const u=i/m; if(u<.25) continue;
          const px=(1-u)*(1-u)*x+2*u*(1-u)*cx+u*u*ex, py=(1-u)*(1-u)*y+2*u*(1-u)*cy+u*u*ey;
          const dx=2*(1-u)*(cx-x)+2*u*(ex-cx), dy=2*(1-u)*(cy-y)+2*u*(ey-cy);
          slots.push({x:px,y:py,a:Math.atan2(dy,dx),o:Math.hypot(px-tx,py-ty)+d*0}); }
        if(d>0){ const s=.32+R()*.22; grow(ex,ey,ang-s,len*.74,d-1,w*.6); grow(ex,ey,ang+s*.95,len*.7,d-1,w*.6);
          if(d>1&&R()<.6){ const u=.5, mx=(1-u)*(1-u)*x+2*u*(1-u)*cx+u*u*ex, my=(1-u)*(1-u)*y+2*u*(1-u)*cy+u*u*ey; grow(mx,my,ang+(R()<.5?-.9:.9),len*.45,d-2,w*.5); } }
      })(tx,ty,a,L,depth,tw*.8);
      slots.sort((p,q)=>p.o-q.o);
      const srt=list.slice().sort((p,q)=>p.idx-q.idx);
      srt.forEach((r,j)=>{ const s=slots[Math.min(slots.length-1,Math.floor((j+.5)/n*slots.length))], side=(j%2?1:-1);
        leaves.push({r,x:s.x,y:s.y,a:s.a+side*(.55+R()*.5)}); });
      ends.push({t,x:tx+Math.cos(a)*L*.35,y:ty+Math.sin(a)*L*.35});
    });
    const sc=sizeK(N);
    for(const l of leaves){ const r=l.r, p=pref(r), len=W*(.04+.04*p)*sc, wd=len*.34;
      ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(l.a);
      const g=ctx.createLinearGradient(0,0,len,0); g.addColorStop(0,rgba(lift(r.tea,.08),.93)); g.addColorStop(1,rgba(lift(flc(r),.12),.93));
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(len*.42,-wd,len,0); ctx.quadraticCurveTo(len*.42,wd,0,0); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=Math.max(.5,W/800); ctx.beginPath(); ctx.moveTo(len*.12,0); ctx.lineTo(len*.82,0); ctx.stroke();
      if(r.stars>=3){ ctx.fillStyle=rgba(lift(flc(r,1),.35),.95); circle(ctx,len*1.02,0,len*.09); ctx.fill(); }
      ctx.restore(); }
  }});

/* ---------- 502 해바라기 ---------- */
GALLERY.add({ id:'s502', name:'해바라기 씨앗', cat:'생명',
  desc:'기록이 황금각 나선을 따라 씨앗처럼 박혀요. 가운데일수록 좋았던 차이고, 꽃잎 색은 마신 차 종류의 비율이에요.',
  render(ctx,W,recs,H){
    const N=recs.length, cx=W/2, cy=W/2;
    const Rd=W*(.13+.16*Math.sqrt(N/100)), c=Rd/Math.sqrt(N), sr=c*.8;
    const srt=recs.slice().sort((a,b)=>pref(b)-pref(a));
    const G=groupBy(recs,r=>r.type), tl=H.TK.filter(t=>G.has(t)), cum=[]; let acc=0; tl.forEach(t=>{ acc+=G.get(t).length/N; cum.push([acc,t]); });
    const pick=f=>{ for(const [a,t] of cum) if(f<=a) return t; return tl[tl.length-1]; };
    const layer=(P,len,wid,off,alpha)=>{ for(let k=0;k<P;k++){ const a=(k+off)/P*TAU, col=lift(typeCol(H,pick((k*.618034+off*.3)%1)),.22);
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(a); const b=Rd*.92;
      ctx.beginPath(); ctx.moveTo(b,-wid*.35); ctx.bezierCurveTo(b+len*.35,-wid, b+len*.8,-wid*.6, b+len,0); ctx.bezierCurveTo(b+len*.8,wid*.6, b+len*.35,wid, b,wid*.35); ctx.closePath();
      ctx.fillStyle=rgba(col,alpha); ctx.fill(); ctx.strokeStyle=rgba(dark(col,.25),.25); ctx.lineWidth=Math.max(.6,W/700); ctx.stroke(); ctx.restore(); } };
    const P=N<20?21:34, Lp=W*.1+Rd*.28, wp=Math.min(Lp*.42,TAU*Rd/P*.95);
    layer(P,Lp,wp,.5,.55); layer(P,Lp*.86,wp*.95,0,.8);
    ctx.fillStyle='rgba(96,78,60,.14)'; circle(ctx,cx,cy,Rd*1.04); ctx.fill();
    srt.forEach((r,k)=>{ const rad=c*Math.sqrt(k+.5), th=k*GA, x=cx+Math.cos(th)*rad, y=cy+Math.sin(th)*rad, s=sr*(.78+.3*r.i);
      const g=ctx.createRadialGradient(x-s*.3,y-s*.35,s*.05,x,y,s); g.addColorStop(0,rgba(lift(flc(r),.35))); g.addColorStop(.55,rgba(flc(r))); g.addColorStop(1,rgba(mix(flc(r),r.tea,.7)));
      ctx.fillStyle=g; circle(ctx,x,y,s); ctx.fill(); });
  }});

/* ---------- 503 기록의 시계 ---------- */
GALLERY.add({ id:'s503', name:'기록의 시계', cat:'데이터',
  desc:'첫 잔부터 오늘까지를 시계 한 바퀴로 감았어요. 마신 날짜에 꽃잎이 하나씩 돋고, 좋았던 차일수록 길게 뻗어요.',
  render(ctx,W,recs,H){
    const N=recs.length, cx=W/2, cy=W/2, R0=W*.15, R1=W*.4, lw=Math.max(1,W/480);
    const t0=+recs[0].date, tl=+recs[N-1].date, span=Math.max(tl-t0,14*864e5)*1.06+864e5;
    const ang=t=>-PI/2+(t-t0+864e5*.5)/span*TAU;
    ctx.strokeStyle='rgba(0,0,0,.07)'; ctx.lineWidth=lw;
    [R0,(R0+R1)/2,R1].forEach(r=>{ circle(ctx,cx,cy,r); ctx.stroke(); });
    const ticks=[]; const d=new Date(t0); d.setDate(1);
    for(let k=0;k<14;k++){ d.setMonth(d.getMonth()+1); if(+d>t0+span*.95) break; if(+d-t0<span*.04) continue; ticks.push([+d,(d.getMonth()+1)+'월']); }
    const sd=new Date(t0); ticks.unshift([t0,(sd.getMonth()+1)+'.'+sd.getDate()]);
    ticks.forEach(([t,s],k)=>{ const a=ang(t)-(k?0:864e5*.5/span*TAU); ctx.strokeStyle=k?'rgba(0,0,0,.1)':'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*R0*.88,cy+Math.sin(a)*R0*.88); ctx.lineTo(cx+Math.cos(a)*(R1+W*.02),cy+Math.sin(a)*(R1+W*.02)); ctx.stroke();
      text(ctx,s,cx+Math.cos(a)*(R1+W*.05),cy+Math.sin(a)*(R1+W*.05),Math.round(W/40),k?'rgba(0,0,0,.34)':'rgba(0,0,0,.5)'); });
    const w0=Math.min(W*.017,R0*TAU/N*.5);
    recs.forEach(r=>{ const a=ang(+r.date), len=(R1-R0)*(.22+.78*pref(r)), w=w0*(.6+.5*r.i);
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
      const g=ctx.createLinearGradient(R0,0,R0+len,0); g.addColorStop(0,rgba(lift(r.tea,.1),.85)); g.addColorStop(1,rgba(lift(flc(r),.05),.9));
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(R0,0); ctx.quadraticCurveTo(R0+len*.55,-w*2,R0+len,0); ctx.quadraticCurveTo(R0+len*.55,w*2,R0,0); ctx.fill();
      ctx.fillStyle=rgba(flc(r,1),.9); circle(ctx,R0+len+W*.01,0,W*(.0028+.0016*r.stars)); ctx.fill();
      ctx.restore(); });
    const fd=new Date(tl);
    text(ctx,N+'잔',cx,cy-W*.012,Math.round(W/20),'rgba(0,0,0,.5)');
    text(ctx,(sd.getMonth()+1)+'.'+sd.getDate()+' – '+(fd.getMonth()+1)+'.'+fd.getDate(),cx,cy+W*.035,Math.round(W/40),'rgba(0,0,0,.32)');
  }});

/* ---------- 504 차의 태양계 ---------- */
GALLERY.add({ id:'s504', name:'차의 태양계', cat:'공간', bg:'#12141C',
  desc:'차 종류마다 행성이 하나씩 돌고, 그 차를 마신 기록이 위성이 되어 둘레를 돌아요. 위성 색은 느낀 풍미예요.',
  render(ctx,W,recs,H){
    const R=H.rng(504), cx=W/2, cy=W/2, G=groupBy(recs,r=>r.type), types=H.TK.filter(t=>G.has(t)), lw=Math.max(1,W/480);
    for(let i=0;i<150;i++){ ctx.fillStyle=`rgba(255,255,255,${.12+R()*.35})`; circle(ctx,R()*W,R()*W,W*(.0008+R()*.0022)); ctx.fill(); }
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.09); sg.addColorStop(0,'rgba(255,240,205,.55)'); sg.addColorStop(1,'rgba(255,240,205,0)');
    ctx.fillStyle=sg; circle(ctx,cx,cy,W*.09); ctx.fill(); ctx.fillStyle='#F6E8C6'; circle(ctx,cx,cy,W*.024); ctx.fill();
    const T=types.length, r0=W*.11, r1=W*.45, step=(r1-r0)/Math.max(1,T);
    types.forEach((t,k)=>{
      const list=G.get(t), n=list.length, rad=r0+step*(k+.6), a=(H.hash(t+'o')%628)/100, col=typeCol(H,t);
      ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=lw; circle(ctx,cx,cy,rad); ctx.stroke();
      for(let s=0;s<24;s++){ const a0=a-.9+s/24*.9; ctx.strokeStyle=rgba(lift(col,.2),.02+.22*(s/24)**2); ctx.lineWidth=lw*1.4; ctx.beginPath(); ctx.arc(cx,cy,rad,a0,a0+.9/24+.005); ctx.stroke(); }
      const px=cx+Math.cos(a)*rad, py=cy+Math.sin(a)*rad, pr=W*Math.min(.03,.011+.0035*Math.sqrt(n));
      const pg=ctx.createRadialGradient(px-pr*.4,py-pr*.4,pr*.1,px,py,pr); pg.addColorStop(0,rgba(lift(col,.45))); pg.addColorStop(1,rgba(dark(col,.15)));
      ctx.fillStyle=pg; circle(ctx,px,py,pr); ctx.fill();
      const ms=W*.016*(n>25?.85:1); let placed=0, ring=0;
      const srt=list.slice().sort((p,q)=>p.idx-q.idx);
      while(placed<n){ const rr=pr+W*.011+ring*ms*1.05, cap=Math.max(5,Math.floor(TAU*rr/ms)), cnt=Math.min(cap,n-placed), off=R()*TAU;
        ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=lw*.8; circle(ctx,px,py,rr); ctx.stroke();
        for(let j=0;j<cnt;j++){ const r=srt[placed+j], b=off+j/cnt*TAU, mr=W*(.0038+.0038*r.i)*(n>25?.85:1);
          ctx.fillStyle=rgba(lift(flc(r),.12),.95); circle(ctx,px+Math.cos(b)*rr,py+Math.sin(b)*rr,mr); ctx.fill(); }
        placed+=cnt; ring++; }
      const lr=pr+W*.016+ring*ms;
      text(ctx,H.TEAS[t].label,px,py+lr+W*.016,Math.round(W/46),'rgba(255,255,255,.42)');
    });
  }});

/* ---------- 505 별자리 지도 ---------- */
GALLERY.add({ id:'s505', name:'취향 별자리', cat:'공간', bg:'#0F1421',
  desc:'기록이 별이 되어 둥근 성도 위에 떠요. 위쪽은 맛, 오른쪽은 향이 좋았던 별이고, 같은 차 종류끼리 별자리로 이어져요.',
  render(ctx,W,recs,H){
    const R=H.rng(505), cx=W/2, cy=W/2, RR=W*.45, lw=Math.max(1,W/480), N=recs.length;
    ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=lw;
    [1,.66,.33].forEach(k=>{ circle(ctx,cx,cy,RR*k); ctx.stroke(); });
    for(let k=0;k<12;k++){ const a=k/12*TAU; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*RR*.08,cy+Math.sin(a)*RR*.08); ctx.lineTo(cx+Math.cos(a)*RR,cy+Math.sin(a)*RR); ctx.stroke(); }
    ctx.strokeStyle='rgba(255,255,255,.2)'; circle(ctx,cx,cy,RR*1.03); ctx.stroke();
    for(let k=0;k<72;k++){ const a=k/72*TAU, l=k%6?W*.008:W*.016; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*RR*1.03,cy+Math.sin(a)*RR*1.03); ctx.lineTo(cx+Math.cos(a)*(RR*1.03-l),cy+Math.sin(a)*(RR*1.03-l)); ctx.stroke(); }
    for(let i=0;i<110;i++){ const a=R()*TAU, d=Math.sqrt(R())*RR; ctx.fillStyle=`rgba(255,255,255,${.08+R()*.25})`; circle(ctx,cx+Math.cos(a)*d,cy+Math.sin(a)*d,W*(.0007+R()*.0015)); ctx.fill(); }
    const P=recs.map(r=>{ const [u,v]=sq2disc((r.x-.5)*2,(r.y-.5)*2); return {r,x:cx+u*RR*.92,y:cy+v*RR*.92}; });
    const G=groupBy(P,p=>p.r.type);
    ctx.lineWidth=Math.max(.7,W/640);
    for(const [t,ps] of G){ // 최소 신장 트리
      const inT=new Set([0]), edges=[];
      while(inT.size<ps.length){ let best=null,bd=1e9; for(const a of inT) for(let b=0;b<ps.length;b++){ if(inT.has(b)) continue; const d=Math.hypot(ps[a].x-ps[b].x,ps[a].y-ps[b].y); if(d<bd){ bd=d; best=[a,b]; } } inT.add(best[1]); edges.push([...best,bd]); }
      ctx.strokeStyle=rgba(lift(typeCol(H,t),.4),.32);
      for(const [a,b,d] of edges){ if(d>RR*.5) continue; ctx.beginPath(); ctx.moveTo(ps[a].x,ps[a].y); ctx.lineTo(ps[b].x,ps[b].y); ctx.stroke(); }
    const k=N>50?.8:1;
    for(const p of P){ const r=p.r, s=W*(.0028+.0022*r.stars+.0018*r.i)*k, col=lift(r.tea,.25);
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,s*5); g.addColorStop(0,rgba(col,.5)); g.addColorStop(.3,rgba(lift(flc(r),.2),.16)); g.addColorStop(1,rgba(col,0));
      ctx.fillStyle=g; circle(ctx,p.x,p.y,s*5); ctx.fill();
      if(r.stars>=3){ ctx.strokeStyle=rgba(lift(col,.5),.45); ctx.lineWidth=Math.max(.5,W/900); ctx.beginPath(); ctx.moveTo(p.x-s*4,p.y); ctx.lineTo(p.x+s*4,p.y); ctx.moveTo(p.x,p.y-s*4); ctx.lineTo(p.x,p.y+s*4); ctx.stroke(); }
      ctx.fillStyle=rgba(lift(col,.6)); circle(ctx,p.x,p.y,s); ctx.fill(); }
  }});

/* ---------- 506 취향 산맥 ---------- */
GALLERY.add({ id:'s506', name:'취향 산맥', cat:'공간',
  desc:'취향 지도를 비스듬히 내려다본 산맥이에요. 좋았던 차가 모인 곳일수록 높이 솟고, 능선 색은 그 자리의 차 색이에요.',
  render(ctx,W,recs,H){
    const N=recs.length, F=H.field(recs,72), M=46, P=90, m=W*.07, A=W*.2;
    const s2=2*Math.pow(.05+.05*Math.sqrt(10/Math.max(10,N)),2);
    const hg=new Float32Array(M*P); let mx=0;
    for(let j=0;j<M;j++) for(let i=0;i<P;i++){ const u=i/(P-1), v=j/(M-1); let h=0;
      for(const r of recs){ const dx=u-r.x, dy=v-r.y, d=dx*dx+dy*dy; if(d>s2*5) continue; h+=Math.exp(-d/s2)*(.25+.75*pref(r)); }
      hg[j*P+i]=h; if(h>mx) mx=h; }
    const nrm=Math.max(mx,N<20?1.2:2);
    const bg=H.hex2rgb('#F7F5F0'), gray=[.62,.6,.57], lw=Math.max(1,W/480);
    for(let j=0;j<M;j++){ const v=j/(M-1), base=W*(.24+.66*v), xs=[], ys=[];
      for(let i=0;i<P;i++){ const u=i/(P-1), h=hg[j*P+i]/nrm, e=Math.pow(h,1.1)*(1-Math.pow(Math.abs(u-.5)*2,6)*.0);
        xs.push(m+u*(W-2*m)); ys.push(base-e*A); }
      ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<P;i++) ctx.lineTo(xs[i],ys[i]); ctx.lineTo(xs[P-1],base+W*.03); ctx.lineTo(xs[0],base+W*.03); ctx.closePath();
      ctx.fillStyle=rgba(bg); ctx.fill();
      const g=ctx.createLinearGradient(m,0,W-m,0);
      for(let s=0;s<=16;s++){ const u=s/16, c=H.sample(F,u,v), h=hg[j*P+Math.round(u*(P-1))]/nrm, k=sm(.03,.45,Math.max(c[3]*.8,h));
        g.addColorStop(u,rgba(mix(gray,H.pastel(c,0,1.3),k),.22+.7*k)); }
      ctx.strokeStyle=g; ctx.lineWidth=lw*1.1; ctx.beginPath(); ctx.moveTo(xs[0],ys[0]); for(let i=1;i<P;i++) ctx.lineTo(xs[i],ys[i]); ctx.stroke();
    }
  }});

/* ---------- 507 취향 일기도 ---------- */
GALLERY.add({ id:'s507', name:'취향 일기도', cat:'데이터',
  desc:'기록이 몰린 곳을 기압처럼 그린 일기도예요. 등압선이 겹겹일수록 기록이 많고, 고기압(H) 옆엔 그 자리에서 가장 많이 마신 차를 적었어요.',
  render(ctx,W,recs,H){
    const N=recs.length, F=H.field(recs,80,{spread:1.6}), n=90, Lv=10, bg=H.hex2rgb('#F7F5F0'), lw=Math.max(1,W/480);
    const s2=2*Math.pow(.055+.05*Math.sqrt(10/Math.max(10,N)),2), p=new Float32Array(n*n); let mx=0;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const u=(i+.5)/n, v=(j+.5)/n; let h=0; for(const r of recs){ const d=(u-r.x)**2+(v-r.y)**2; if(d<s2*6) h+=Math.exp(-d/s2)*(.5+.5*r.i); } p[j*n+i]=h; if(h>mx) mx=h; }
    for(let k=0;k<p.length;k++) p[k]=Math.pow(p[k]/mx,.7);
    const at=(i,j)=>p[cl(j,0,n-1)*n+cl(i,0,n-1)];
    const cv=document.createElement('canvas'); cv.width=cv.height=n; const x=cv.getContext('2d'), im=x.createImageData(n,n), D=im.data;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const v=at(i,j), q=Math.floor(Math.min(.999,v)*Lv)/Lv, c=H.sample(F,(i+.5)/n,(j+.5)/n), o=(j*n+i)*4;
      const col=mix(bg,H.pastel(c,.3,1.1),q*.75); D[o]=col[0]*255; D[o+1]=col[1]*255; D[o+2]=col[2]*255; D[o+3]=255; }
    x.putImageData(im,0,0); ctx.save(); ctx.imageSmoothingQuality='high'; ctx.filter=`blur(${Math.max(1,Math.round(W/200))}px)`; ctx.drawImage(cv,0,0,W,W); ctx.restore();
    const sx=W/n;
    for(let L=1;L<Lv;L++){ const lv=L/Lv; ctx.strokeStyle=`rgba(70,62,54,${L%3===0?.42:.2})`; ctx.lineWidth=lw*(L%3===0?1.1:.8); ctx.beginPath();
      for(let j=-1;j<n;j++) for(let i=-1;i<n;i++){
        const a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1), A=a>lv,B=b>lv,C=c>lv,Dd=d>lv; if(A===B&&B===C&&C===Dd) continue;
        const X=t=>(t+.5)*sx, pts=[], ip=(v0,v1)=>(lv-v0)/(v1-v0);
        if(A!==B) pts.push([X(i+ip(a,b)),X(j)]);
        if(B!==C) pts.push([X(i+1),X(j+ip(b,c))]);
        if(Dd!==C) pts.push([X(i+ip(d,c)),X(j+1)]);
        if(A!==Dd) pts.push([X(i),X(j+ip(a,d))]);
        for(let k=0;k+1<pts.length;k+=2){ ctx.moveTo(pts[k][0],pts[k][1]); ctx.lineTo(pts[k+1][0],pts[k+1][1]); } }
      ctx.stroke(); }
    const peaks=[];
    for(let j=2;j<n-2;j++) for(let i=2;i<n-2;i++){ const v=at(i,j); if(v<.45) continue; let ok=true;
      for(let dj=-4;dj<=4&&ok;dj++) for(let di=-4;di<=4;di++){ if(!di&&!dj) continue; const w=at(i+di,j+dj); if(w>v||(w===v&&(dj<0||(dj===0&&di<0)))){ ok=false; break; } }
      if(ok) peaks.push({i,j,v}); }
    const shown=[];
    peaks.sort((a,b)=>b.v-a.v).forEach(pk=>{ if(shown.length>=4||shown.some(q=>Math.hypot(q.i-pk.i,q.j-pk.j)<n*.15)) return; shown.push(pk);
      const u=(pk.i+.5)/n, v=(pk.j+.5)/n, X=u*W, Y=v*W, near=recs.filter(r=>Math.hypot(r.x-u,r.y-v)<.12), cnt={}; near.forEach(r=>cnt[r.type]=(cnt[r.type]||0)+1);
      const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
      ctx.save(); ctx.font=`600 ${Math.round(W/24)}px ${FONT}`; ctx.fillStyle='rgba(60,52,46,.62)'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('H',X,Y); ctx.restore();
      if(top) text(ctx,H.TEAS[top].label,X,Y+W*.035,Math.round(W/44),'rgba(60,52,46,.5)'); });
  }});

/* ---------- 508 현미경 속 세포 ---------- */
GALLERY.add({ id:'s508', name:'현미경 속 세포', cat:'생명',
  desc:'기록 하나하나가 세포가 되어 둥근 접시 안에 자라요. 세포질은 찻물 색, 핵은 가장 강하게 느낀 풍미의 색이에요.',
  render(ctx,W,recs,H){
    const N=recs.length, RR=.45, res=Math.min(300,Math.round(W*.62));
    const d=Math.sqrt(PI*RR*RR/(N+26))*.95;
    const S=recs.map(r=>{ const [u,v]=sq2disc((r.x-.5)*2,(r.y-.5)*2); return {x:.5+u*RR*.82,y:.5+v*RR*.82,r:d*.5,rec:r}; });
    for(let it=0;it<40;it++){ relax(S,1,0,0,1,1); for(const p of S){ const dx=p.x-.5, dy=p.y-.5, q=Math.hypot(dx,dy), lim=RR-d*.45; if(q>lim){ p.x=.5+dx/q*lim; p.y=.5+dy/q*lim; } } }
    const fill=H.poisson(600,d*600*1.05,508).map(([x,y])=>({x:x/600,y:y/600})).filter(p=>Math.hypot(p.x-.5,p.y-.5)<RR-d*.2&&S.every(s=>Math.hypot(s.x-p.x,s.y-p.y)>d*.9));
    const A=[...S,...fill], K=A.length, ax=new Float32Array(K), ay=new Float32Array(K);
    A.forEach((p,k)=>{ ax[k]=p.x; ay[k]=p.y; });
    const cols=A.map(p=>p.rec?{c:lift(p.rec.tea,.4),n:lift(flc(p.rec),.05),n2:lift(flc(p.rec,1),.25),s:.15+.11*p.rec.i}:null);
    const SD=new Float32Array(K*K); for(let a=0;a<K;a++) for(let b=0;b<K;b++) SD[a*K+b]=Math.max(1e-5,Math.hypot(ax[a]-ax[b],ay[a]-ay[b]));
    const cv=document.createElement('canvas'); cv.width=cv.height=res; const x=cv.getContext('2d'), im=x.createImageData(res,res), D=im.data;
    const empty=[.935,.925,.9], dish=[.965,.958,.94], R2=RR*RR, tau=d*.035, gap=d*.035;
    for(let j=0;j<res;j++) for(let i=0;i<res;i++){ const u=(i+.5)/res, v=(j+.5)/res, dd=(u-.5)**2+(v-.5)**2; if(dd>R2) continue;
      let b1=1e9,k1=0; for(let k=0;k<K;k++){ const e=(u-ax[k])**2+(v-ay[k])**2; if(e<b1){ b1=e; k1=k; } }
      let S2=0; const row=k1*K; for(let k=0;k<K;k++){ if(k===k1) continue; const e=(u-ax[k])**2+(v-ay[k])**2, bd=(e-b1)/(2*SD[row+k]); if(bd<tau*7) S2+=Math.exp(-bd/tau); }
      const edge=S2>0?-tau*Math.log(S2):1, d1=Math.sqrt(b1), C=cols[k1]; let c;
      if(C){ const nr=d*C.s; c=mix(C.c,C.n,1-sm(nr*.75,nr*1.1,d1)); const o=Math.hypot(u-ax[k1]-d*.2,v-ay[k1]+d*.14); c=mix(c,C.n2,(1-sm(d*.035,d*.055,o))*.9); }
      else c=empty;
      c=mix(c,dark(c,.16),1-sm(gap,gap*4,edge));
      c=mix(dish,c,sm(gap*.4,gap*1.3,edge));
      const q=Math.sqrt(dd), o=(j*res+i)*4; c=mix(c,[.85,.83,.79],sm(RR-.01,RR,q)*.5);
      D[o]=c[0]*255; D[o+1]=c[1]*255; D[o+2]=c[2]*255; D[o+3]=255*(1-sm(RR-.003,RR,q)); }
    x.putImageData(im,0,0); ctx.imageSmoothingQuality='high'; ctx.drawImage(cv,0,0,W,W);
    ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=Math.max(1,W/480); circle(ctx,W/2,W/2,W*(RR+.018)); ctx.stroke();
  }});

/* ---------- 509 차 벌집 ---------- */
GALLERY.add({ id:'s509', name:'차 벌집', cat:'생명',
  desc:'기록이 벌집 칸을 하나씩 채워요. 가운데부터 좋았던 차 순서로 차오르고, 칸은 찻물 색, 안쪽 칸은 풍미 색이에요.',
  render(ctx,W,recs,H){
    const N=recs.length; let K=0; while(1+3*K*(K+1)<N) K++; const Kt=K+1, s=W*.46/(Math.sqrt(3)*(Kt+.6)), cx=W/2, cy=W/2;
    const dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]], cells=[[0,0]];
    for(let k=1;k<=Kt;k++){ let q=dirs[4][0]*k, r=dirs[4][1]*k; for(let i=0;i<6;i++) for(let j=0;j<k;j++){ cells.push([q,r]); q+=dirs[i][0]; r+=dirs[i][1]; } }
    const pos=([q,r])=>[cx+s*Math.sqrt(3)*(q+r/2), cy+s*1.5*r];
    const hex=(x,y,rr)=>{ ctx.beginPath(); for(let k=0;k<6;k++){ const a=PI/6+k*PI/3; ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } ctx.closePath(); };
    const lw=Math.max(1,W/480), srt=recs.slice().sort((a,b)=>pref(b)-pref(a));
    cells.forEach((c,k)=>{ const [x,y]=pos(c); const r=srt[k];
      if(!r){ hex(x,y,s*.9); ctx.strokeStyle='rgba(160,128,80,.2)'; ctx.lineWidth=lw; ctx.stroke(); return; }
      const g=ctx.createLinearGradient(x,y-s,x,y+s); g.addColorStop(0,rgba(lift(r.tea,.3))); g.addColorStop(1,rgba(lift(r.tea,.05)));
      hex(x,y,s*.9); ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle=rgba(dark(r.tea,.25),.35); ctx.lineWidth=lw; ctx.stroke();
      const ir=s*(.28+.36*r.i); hex(x,y,ir); ctx.fillStyle=rgba(lift(flc(r),.12),.95); ctx.fill();
      if(r.fl.length>1){ hex(x,y,ir*.45); ctx.fillStyle=rgba(lift(flc(r,1),.15),.95); ctx.fill(); } });
  }});

/* ---------- 510 계단식 차밭 ---------- */
GALLERY.add({ id:'s510', name:'계단식 차밭', cat:'공간', bg:'#F3F2EA',
  desc:'위에서 내려다본 계단식 차밭 언덕이에요. 오래된 기록은 바깥 이랑에, 최근 기록은 꼭대기 쪽 이랑에 한 그루씩 물들어요.',
  render(ctx,W,recs,H){
    const N=recs.length, Kr=10, cx=W*.5, cy=W*.52, Rmax=W*.385, Rmin=W*.05, gapR=(Rmax-Rmin)/(Kr-1), th=gapR*.58, lw=Math.max(1,W/480);
    const f=(a,k)=>1+.085*Math.sin(2*a+1+k*.06)+.055*Math.sin(3*a+2.3-k*.09)+.03*Math.sin(5*a+.7+k*.12);
    const rings=[];
    for(let k=0;k<Kr;k++){ const R=Rmax-gapR*k, ox=cx+k*W*.007, oy=cy-k*W*.009, pts=[]; let L=0;
      for(let s=0;s<=180;s++){ const a=s/180*TAU, rr=R*f(a,k)*(k===Kr-1?.9:1), p=[ox+Math.cos(a)*rr,oy+Math.sin(a)*rr*.94]; if(s) L+=Math.hypot(p[0]-pts[s-1][0],p[1]-pts[s-1][1]); p.push(L); pts.push(p); }
      rings.push({pts,L,k}); }
    rings.forEach(({pts,k})=>{ const g=k%2?[.7,.77,.6]:[.64,.72,.55];
      ctx.strokeStyle=rgba(g,.5); ctx.lineWidth=th; ctx.lineJoin='round'; ctx.beginPath(); pts.forEach(p=>ctx.lineTo(p[0],p[1])); ctx.closePath(); ctx.stroke();
      ctx.save(); ctx.setLineDash([th*.35,th*.55]); ctx.lineDashOffset=k*th*.3; ctx.strokeStyle=rgba(dark(g,.12),.28); ctx.lineWidth=th*.55; ctx.beginPath(); pts.forEach(p=>ctx.lineTo(p[0],p[1])); ctx.closePath(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle='rgba(120,110,85,.13)'; ctx.lineWidth=lw*.8; ctx.beginPath(); pts.forEach(p=>{ const dx=p[0]-cx, dy=p[1]-cy, q=Math.hypot(dx,dy)||1; ctx.lineTo(p[0]+dx/q*th*.85,p[1]+dy/q*th*.85); }); ctx.closePath(); ctx.stroke(); });
    const step=th*1.3, slots=[];
    rings.forEach(({pts,L})=>{ const c=Math.max(3,Math.floor(L/step)), off=(H.hash('t'+L.toFixed(0))%100)/100; let q=0;
      for(let s=0;s<c;s++){ const t=(s+off)/c*L; while(q<pts.length-2&&pts[q+1][2]<t) q++; const A=pts[q],B=pts[q+1], u=(t-A[2])/Math.max(1e-6,B[2]-A[2]); slots.push([A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u]); } });
    const S=slots.length;
    recs.forEach((r,j)=>{ const [x,y]=slots[Math.min(S-1,Math.floor((j+.5)/N*S))], rr=th*(.62+.22*r.i);
      const g=ctx.createRadialGradient(x-rr*.25,y-rr*.3,rr*.05,x,y,rr);
      g.addColorStop(0,rgba(lift(flc(r),.3))); g.addColorStop(.6,rgba(lift(mix(flc(r),r.tea,.4),.1))); g.addColorStop(1,rgba(r.tea));
      ctx.fillStyle=g; circle(ctx,x,y,rr); ctx.fill();
      if(r.fl.length>1){ ctx.fillStyle=rgba(lift(flc(r,1),.1),.9); circle(ctx,x+rr*.35,y-rr*.3,rr*.22); ctx.fill(); } });
  }});

/* ---------- 511 찻잔 수족관 ---------- */
GALLERY.add({ id:'s511', name:'취향 수족관', cat:'생명',
  desc:'기록 하나가 물고기 한 마리예요. 맛이 좋았던 물고기는 위로 헤엄치고, 향이 좋았던 물고기는 오른쪽을 바라봐요.',
  render(ctx,W,recs,H){
    const N=recs.length, R=H.rng(511), lw=Math.max(1,W/480);
    const bg=ctx.createLinearGradient(0,0,0,W); bg.addColorStop(0,'#EEF4F2'); bg.addColorStop(1,'#DDE8E5'); ctx.fillStyle=bg; ctx.fillRect(0,0,W,W);
    for(let k=0;k<4;k++){ const x=W*(.15+k*.25+R()*.08), w=W*(.04+R()*.05); const g=ctx.createLinearGradient(0,0,0,W*.8); g.addColorStop(0,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+w,0); ctx.lineTo(x+w*.2+W*.12,W*.8); ctx.lineTo(x+W*.12-w*.4,W*.8); ctx.fill(); }
    for(let k=0;k<9;k++){ const x=W*(.05+k*.11+R()*.04), h=W*(.08+R()*.12); ctx.strokeStyle=`rgba(120,150,110,${.18+R()*.15})`; ctx.lineWidth=W*.005;
      ctx.beginPath(); ctx.moveTo(x,W); ctx.bezierCurveTo(x+W*.03,W-h*.4,x-W*.03,W-h*.7,x+W*.01,W-h); ctx.stroke(); }
    ctx.fillStyle='rgba(232,224,206,.9)'; ctx.beginPath(); ctx.moveTo(0,W); for(let x=0;x<=W;x+=W/30) ctx.lineTo(x,W*.955+Math.sin(x/W*9)*W*.006); ctx.lineTo(W,W); ctx.fill();
    const sc=sizeK(N);
    const F=recs.map(r=>{ const L=W*(.065+.05*r.i)*(N>60?.6:N>25?.75:1); return {r,L,x:W*(.1+.8*r.x),y:W*(.1+.76*r.y),rx:L*.55}; });
    F.forEach(f=>{ f.r_=f.r; f.r=f.rx; });
    relax(F,60,W*.04,W*.05,W*.96,W*.92);
    for(const f of F){ const r=f.r_, L=f.L, dir=r.x>=.5?1:-1, c1=lift(r.tea,.15), c2=lift(flc(r),.08), c3=lift(flc(r,1),.1);
      ctx.save(); ctx.translate(f.x,f.y); ctx.scale(dir,1); ctx.rotate(((H.hash(r.id)%100)/100-.5)*.25);
      ctx.fillStyle=rgba(c3,.8); ctx.beginPath(); ctx.moveTo(-L*.3,0); ctx.lineTo(-L*.56,-L*.2); ctx.quadraticCurveTo(-L*.47,0,-L*.56,L*.2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(L*.05,-L*.17); ctx.quadraticCurveTo(-L*.1,-L*.32,-L*.2,-L*.27); ctx.lineTo(-L*.15,-L*.12); ctx.closePath(); ctx.fill();
      const g=ctx.createLinearGradient(L*.5,0,-L*.35,0); g.addColorStop(0,rgba(c1)); g.addColorStop(.55,rgba(mix(c1,c2,.6))); g.addColorStop(1,rgba(c2));
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(L*.5,0); ctx.bezierCurveTo(L*.32,-L*.27,-L*.22,-L*.22,-L*.34,0); ctx.bezierCurveTo(-L*.22,L*.22,L*.32,L*.27,L*.5,0); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=Math.max(.5,W/900); ctx.beginPath(); ctx.moveTo(L*.22,-L*.15); ctx.quadraticCurveTo(L*.28,0,L*.22,L*.15); ctx.stroke();
      ctx.fillStyle='rgba(40,40,40,.55)'; circle(ctx,L*.34,-L*.045,L*.03); ctx.fill();
      ctx.restore();
      if(r.stars>=3){ ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=Math.max(.6,W/700); for(let b=0;b<3;b++){ circle(ctx,f.x+dir*L*(.55+b*.08),f.y-L*(.15+b*.25),L*(.04+b*.015)); ctx.stroke(); } } }
  }});

/* ---------- 512 해파리 ---------- */
GALLERY.add({ id:'s512', name:'해파리 떼', cat:'생명',
  desc:'차 종류마다 해파리가 한 마리씩 떠다녀요. 그 차를 마신 기록이 촉수가 되고, 좋았던 기록일수록 촉수가 길게 늘어져요.',
  render(ctx,W,recs,H){
    const R=H.rng(512), G=groupBy(recs,r=>r.type), types=H.TK.filter(t=>G.has(t)), T=types.length, N=recs.length;
    const bg=ctx.createLinearGradient(0,0,0,W); bg.addColorStop(0,'#F2F5F6'); bg.addColorStop(1,'#E3EAEE'); ctx.fillStyle=bg; ctx.fillRect(0,0,W,W);
    for(let i=0;i<70;i++){ ctx.fillStyle=`rgba(255,255,255,${.4+R()*.5})`; circle(ctx,R()*W,R()*W,W*(.001+R()*.003)); ctx.fill(); }
    const order=types.slice().sort((a,b)=>G.get(b).length-G.get(a).length);
    const slotX=types.map((t,k)=>(k+.5)/T);
    types.forEach((t,k)=>{
      const list=G.get(t).slice().sort((p,q)=>p.idx-q.idx), n=list.length, col=typeCol(H,t);
      const br=W*Math.min(.1,(.032+.011*Math.sqrt(n))*(T>4?1:1.15)), x=W*(.08+.84*slotX[k])+(R()-.5)*W*.02, y=W*(.13+(k%2)*.13+R()*.04)+br*.6;
      // 촉수
      list.forEach((r,j)=>{ const ax=x+br*.85*((n===1?.5:j/(n-1))*2-1)*.92, len=W*(.12+.42*pref(r))*(T>4?.9:1), amp=W*(.008+.01*R()), fq=4+R()*4, ph=R()*TAU;
        const c=lift(flc(r),.05), g=ctx.createLinearGradient(0,y,0,y+len); g.addColorStop(0,rgba(c,.85)); g.addColorStop(1,rgba(c,.12));
        ctx.strokeStyle=g; ctx.lineWidth=Math.max(.6,W*(.0012+.0022*r.i)); ctx.beginPath();
        for(let s=0;s<=28;s++){ const u=s/28; ctx.lineTo(ax+Math.sin(u*fq+ph)*amp*u+(ax-x)*u*.25,y+u*len); } ctx.stroke();
        ctx.fillStyle=rgba(lift(flc(r,1),.1),.75); circle(ctx,ax+Math.sin(fq+ph)*amp+(ax-x)*.25,y+len,W*.0035); ctx.fill(); });
      // 입팔
      for(let a=0;a<3;a++){ ctx.strokeStyle=rgba(lift(col,.2),.35); ctx.lineWidth=br*.12; ctx.beginPath(); const ox=(a-1)*br*.2;
        for(let s=0;s<=16;s++){ const u=s/16; ctx.lineTo(x+ox+Math.sin(u*5+a)*br*.18,y+u*br*1.4); } ctx.stroke(); }
      // 갓
      const g=ctx.createRadialGradient(x,y-br*.8,br*.1,x,y-br*.2,br*1.2); g.addColorStop(0,rgba(lift(col,.55),.9)); g.addColorStop(1,rgba(lift(col,.12),.55));
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-br+x,y); ctx.bezierCurveTo(x-br*1.02,y-br*1.35,x+br*1.02,y-br*1.35,x+br,y);
      const sc=9; for(let s=sc;s>0;s--){ const x1=x-br+2*br*(s-1)/sc; ctx.quadraticCurveTo(x-br+2*br*(s-.5)/sc,y+br*.14,x1,y); }
      ctx.fill(); ctx.strokeStyle=rgba(dark(col,.2),.3); ctx.lineWidth=Math.max(.6,W/700); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(x,y-br*.42,br*.42,br*.22,0,PI*1.05,PI*1.95); ctx.stroke();
      text(ctx,H.TEAS[t].label,x,y-br*1.2,Math.round(W/46),'rgba(0,0,0,.33)');
    });
  }});

/* ---------- 513 풍미의 능선 ---------- */
GALLERY.add({ id:'s513', name:'풍미의 능선', cat:'데이터',
  desc:'풍미마다 한 줄씩, 시간에 따라 얼마나 자주 느꼈는지를 능선으로 그렸어요. 아래쪽 눈금 하나하나가 그 풍미를 느낀 기록이에요.',
  render(ctx,W,recs,H){
    const N=recs.length, used=H.FK.filter(k=>recs.some(r=>r.fl.some(f=>f.k===k))), rows=used.length;
    const L=W*.2, Rm=W*.06, top=W*.14, bot=W*.88, gap=(bot-top)/rows, bg=H.hex2rgb('#F7F5F0'), lw=Math.max(1,W/480);
    const ts=recs.map(r=>+r.date), t0=Math.min(...ts), t1=Math.max(...ts,t0+20*864e5), span=t1-t0, pad=span*.05;
    const T0=t0-pad, T1=t1+pad, sig=span*(N<20?.07:N<60?.045:.035), P=110;
    const X=t=>L+(t-T0)/(T1-T0)*(W-L-Rm);
    const curves=used.map(k=>{ const ys=new Float32Array(P); for(let i=0;i<P;i++){ const t=T0+(T1-T0)*i/(P-1); let s=0; recs.forEach(r=>{ const f=r.fl.find(f=>f.k===k); if(f) s+=f.w*Math.exp(-((t-+r.date)**2)/(2*sig*sig)); }); ys[i]=s; } return ys; });
    const mx=Math.max(...curves.map(c=>Math.max(...c)));
    used.forEach((k,j)=>{ const base=top+(j+1)*gap, c=H.hex2rgb(H.FLAVORS[k].color), ys=curves[j], A=gap*2.3/mx;
      ctx.beginPath(); ctx.moveTo(X(T0),base); for(let i=0;i<P;i++) ctx.lineTo(X(T0+(T1-T0)*i/(P-1)),base-ys[i]*A); ctx.lineTo(X(T1),base); ctx.closePath();
      const g=ctx.createLinearGradient(0,base-gap*2,0,base); g.addColorStop(0,rgba(mix(bg,lift(c,.05),.92))); g.addColorStop(1,rgba(mix(bg,lift(c,.3),.8)));
      ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle=rgba(dark(c,.2),.8); ctx.lineWidth=lw; ctx.beginPath(); for(let i=0;i<P;i++) ctx.lineTo(X(T0+(T1-T0)*i/(P-1)),base-ys[i]*A); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.08)'; ctx.beginPath(); ctx.moveTo(X(T0),base); ctx.lineTo(X(T1),base); ctx.stroke();
      ctx.strokeStyle=rgba(dark(c,.25),.6); ctx.beginPath(); recs.forEach(r=>{ if(r.fl.some(f=>f.k===k)){ const x=X(+r.date); ctx.moveTo(x,base); ctx.lineTo(x,base+gap*.18); } }); ctx.stroke();
      text(ctx,H.FLAVORS[k].label,L-W*.025,base-gap*.15,Math.round(W/42),'rgba(0,0,0,.5)','right'); });
    for(let d=new Date(T0); d<=T1; d.setMonth(d.getMonth()+1)){ const m=new Date(d.getFullYear(),d.getMonth()+1,1); if(+m>T1) break; const x=X(+m);
      ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x,bot+W*.025); ctx.lineTo(x,bot+W*.04); ctx.stroke();
      text(ctx,(m.getMonth()+1)+'월',x,bot+W*.065,Math.round(W/44),'rgba(0,0,0,.38)'); }
  }});

/* ---------- 514 풍미의 고리 ---------- */
GALLERY.add({ id:'s514', name:'풍미의 고리', cat:'데이터',
  desc:'한 잔에서 함께 느낀 풍미끼리 띠로 이었어요. 띠가 굵을수록 자주 같이 느낀 짝이고, 바깥 호의 길이는 그 풍미를 느낀 양이에요.',
  render(ctx,W,recs,H){
    const cx=W/2, cy=W/2, ri=W*.33, lw=Math.max(1,W/480);
    const tot={}, link={}; recs.forEach(r=>{ r.fl.forEach(f=>tot[f.k]=(tot[f.k]||0)+f.w);
      for(const a of r.fl) for(const b of r.fl){ if(a===b) continue; link[a.k+'|'+b.k]=(link[a.k+'|'+b.k]||0)+a.w/(r.fl.length-1); } });
    const fl=H.FK.filter(k=>tot[k]), T=fl.reduce((s,k)=>s+tot[k],0), pad=.045, avail=TAU-pad*fl.length;
    const arc={}; let a=-PI/2; fl.forEach(k=>{ const sp=tot[k]/T*avail; arc[k]={a0:a,a1:a+sp,cur:a}; a+=sp+pad; });
    const seg={};
    fl.forEach(k=>{ const outs=fl.filter(o=>o!==k&&link[k+'|'+o]).sort((p,q)=>{ const d=x=>((arc[x].a0-arc[k].a0)+TAU)%TAU; return d(q)-d(p); });
      const sp=arc[k].a1-arc[k].a0, sc=sp/tot[k]; outs.forEach(o=>{ const w=link[k+'|'+o]*sc; seg[k+'|'+o]=[arc[k].cur,arc[k].cur+w]; arc[k].cur+=w; }); });
    const P=(ang,r)=>[cx+Math.cos(ang)*r,cy+Math.sin(ang)*r];
    fl.forEach(k=>fl.forEach(o=>{ if(k>=o||!seg[k+'|'+o]||!seg[o+'|'+k]) return; const [s0,s1]=seg[k+'|'+o], [t0,t1]=seg[o+'|'+k];
      const ca=H.hex2rgb(H.FLAVORS[k].color), cb=H.hex2rgb(H.FLAVORS[o].color), A=P((s0+s1)/2,ri), B=P((t0+t1)/2,ri);
      const g=ctx.createLinearGradient(A[0],A[1],B[0],B[1]); g.addColorStop(0,rgba(ca,.5)); g.addColorStop(1,rgba(cb,.5));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,ri,s0,s1); const q1=P(t0,ri); ctx.quadraticCurveTo(cx,cy,q1[0],q1[1]); ctx.arc(cx,cy,ri,t0,t1); const q2=P(s0,ri); ctx.quadraticCurveTo(cx,cy,q2[0],q2[1]); ctx.fill(); }));
    fl.forEach(k=>{ const c=H.hex2rgb(H.FLAVORS[k].color), A=arc[k];
      ctx.strokeStyle=rgba(c,.95); ctx.lineWidth=W*.02; ctx.lineCap='butt'; ctx.beginPath(); ctx.arc(cx,cy,ri+W*.016,A.a0,A.a1); ctx.stroke();
      const m=(A.a0+A.a1)/2, [x,y]=P(m,ri+W*.065), al=Math.cos(m)>.3?'left':Math.cos(m)<-.3?'right':'center';
      text(ctx,H.FLAVORS[k].label,x,y,Math.round(W/42),'rgba(0,0,0,.5)',al); });
    ctx.strokeStyle='rgba(0,0,0,.06)'; ctx.lineWidth=lw; circle(ctx,cx,cy,ri+W*.032); ctx.stroke();
  }});

/* ---------- 515 차에서 풍미로 ---------- */
GALLERY.add({ id:'s515', name:'차에서 풍미로', cat:'데이터',
  desc:'왼쪽의 차 종류에서 오른쪽의 풍미로 흐르는 물줄기예요. 물줄기가 굵을수록 그 차에서 그 풍미를 자주, 진하게 느꼈어요.',
  render(ctx,W,recs,H){
    const flow={}, tv={}, fv={}; recs.forEach(r=>r.fl.forEach(f=>{ const key=r.type+'|'+f.k; flow[key]=(flow[key]||0)+f.w; tv[r.type]=(tv[r.type]||0)+f.w; fv[f.k]=(fv[f.k]||0)+f.w; }));
    const ts=H.TK.filter(t=>tv[t]), fs=H.FK.filter(k=>fv[k]), T=ts.reduce((s,t)=>s+tv[t],0);
    const top=W*.08, Hh=W*.84, gL=W*.03, gR=W*.016, sc=Math.min((Hh-gL*(ts.length-1))/T,(Hh-gR*(fs.length-1))/T);
    const hL=T*sc+gL*(ts.length-1), hR=T*sc+gR*(fs.length-1), bw=W*.012, xL=W*.2, xR=W*.78;
    const nodeL={}, nodeR={}; let y=top+(Hh-hL)/2; ts.forEach(t=>{ nodeL[t]={y,cur:y}; y+=tv[t]*sc+gL; });
    y=top+(Hh-hR)/2; fs.forEach(k=>{ nodeR[k]={y,cur:y}; y+=fv[k]*sc+gR; });
    ts.forEach(t=>fs.forEach(k=>{ const v=flow[t+'|'+k]; if(!v) return; const h=v*sc, a=nodeL[t].cur, b=nodeR[k].cur; nodeL[t].cur+=h; nodeR[k].cur+=h;
      const c1=typeCol(H,t), c2=H.hex2rgb(H.FLAVORS[k].color), x0=xL+bw, x1=xR, mx=(x0+x1)/2;
      const g=ctx.createLinearGradient(x0,0,x1,0); g.addColorStop(0,rgba(c1,.55)); g.addColorStop(1,rgba(c2,.55));
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x0,a); ctx.bezierCurveTo(mx,a,mx,b,x1,b); ctx.lineTo(x1,b+h); ctx.bezierCurveTo(mx,b+h,mx,a+h,x0,a+h); ctx.closePath(); ctx.fill(); }));
    const fsz=Math.round(W/40);
    ts.forEach(t=>{ const n=nodeL[t], h=tv[t]*sc; ctx.fillStyle=rgba(dark(typeCol(H,t),.05)); ctx.fillRect(xL,n.y,bw,h); text(ctx,H.TEAS[t].label,xL-W*.02,n.y+h/2,fsz,'rgba(0,0,0,.55)','right'); });
    fs.forEach(k=>{ const n=nodeR[k], h=fv[k]*sc; ctx.fillStyle=rgba(H.hex2rgb(H.FLAVORS[k].color)); ctx.fillRect(xR,n.y,bw,h); if(h>W*.012||fs.length<9) text(ctx,H.FLAVORS[k].label,xR+bw+W*.02,n.y+h/2,Math.round(W/44),'rgba(0,0,0,.5)','left'); });
  }});

/* ---------- 516 차 조각보 ---------- */
GALLERY.add({ id:'s516', name:'차 조각보', cat:'데이터',
  desc:'차 종류별로 구역을 나누고, 기록 하나를 조각 천 하나로 이어 붙였어요. 좋았던 차일수록 조각이 넓고, 조각의 결은 찻물에서 풍미로 번져요.',
  render(ctx,W,recs,H){
    function squarify(items,x,y,w,h){ const out=[], tot=items.reduce((s,v)=>s+v.v,0); const A=items.map(o=>({o,a:o.v/tot*w*h})); let i=0;
      while(i<A.length){ const short=Math.min(w,h); let row=[A[i]], j=i+1;
        const worst=rw=>{ const s=rw.reduce((t,a)=>t+a.a,0); let mx=0,mn=1e18; rw.forEach(a=>{ mx=Math.max(mx,a.a); mn=Math.min(mn,a.a); }); return Math.max(short*short*mx/(s*s),s*s/(short*short*mn)); };
        while(j<A.length){ const nr=row.concat([A[j]]); if(worst(nr)<=worst(row)){ row=nr; j++; } else break; }
        const s=row.reduce((t,a)=>t+a.a,0);
        if(w>=h){ const cw=s/h; let yy=y; row.forEach(a=>{ const ch=a.a/cw; out.push({o:a.o,x,y:yy,w:cw,h:ch}); yy+=ch; }); x+=cw; w-=cw; }
        else { const ch=s/w; let xx=x; row.forEach(a=>{ const cw=a.a/ch; out.push({o:a.o,x:xx,y,w:cw,h:ch}); xx+=cw; }); y+=ch; h-=ch; }
        i=j; }
      return out; }
    const G=groupBy(recs,r=>r.type), m=W*.06, g1=W*.014, g2=W*.005;
    const groups=[...G.entries()].map(([t,l])=>({t,l,v:l.reduce((s,r)=>s+.35+pref(r),0)})).sort((a,b)=>b.v-a.v);
    squarify(groups,m,m,W-2*m,W-2*m).forEach(gr=>{ const items=gr.o.l.map(r=>({r,v:.35+pref(r)})).sort((a,b)=>b.v-a.v);
      squarify(items,gr.x+g1/2,gr.y+g1/2,gr.w-g1,gr.h-g1).forEach(c=>{ const r=c.o.r, x=c.x+g2/2, y=c.y+g2/2, w=Math.max(1,c.w-g2), h=Math.max(1,c.h-g2);
        const ang=(H.hash(r.id)%4)*PI/2+PI/4, d=Math.hypot(w,h)/2, cx=x+w/2, cy=y+h/2;
        const g=ctx.createLinearGradient(cx-Math.cos(ang)*d,cy-Math.sin(ang)*d,cx+Math.cos(ang)*d,cy+Math.sin(ang)*d);
        g.addColorStop(0,rgba(lift(r.tea,.22))); g.addColorStop(1,rgba(lift(r.tea,.42)));
        ctx.save(); ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,Math.min(W*.006,w/3,h/3)):ctx.rect(x,y,w,h); ctx.clip(); ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
        const rr=H.rng(H.hash(r.id+'q')), M=Math.max(w,h);
        r.fl.forEach(fl=>{ const px=x+w*rr(), py=y+h*rr(), R=M*(.45+.45*fl.w), rg=ctx.createRadialGradient(px,py,0,px,py,R); rg.addColorStop(0,rgba(lift(fl.rgb,.18),.9)); rg.addColorStop(.5,rgba(lift(fl.rgb,.25),.45)); rg.addColorStop(1,rgba(lift(fl.rgb,.3),0)); ctx.fillStyle=rg; ctx.fillRect(x,y,w,h); });
        ctx.restore();
        if(r.stars>=3&&w>W*.03&&h>W*.03){ ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=Math.max(.6,W/700); circle(ctx,x+w-W*.012,y+W*.012,W*.004); ctx.stroke(); } }); });
  }});

/* ---------- 517 방울 행성 ---------- */
GALLERY.add({ id:'s517', name:'방울 행성', cat:'공간',
  desc:'모든 기록의 3D 찻방울을 모아 하나의 행성을 빚었어요. 좋았던 차일수록 앞쪽 가운데에 크게 놓이고, 덜 좋았던 차는 가장자리로 물러나요.',
  render(ctx,W,recs,H){
    const N=recs.length, cx=W/2, cy=W*.48, R=W*(.25+.1*Math.sqrt(N/100)), lw=Math.max(1,W/480);
    const srt=recs.slice().sort((a,b)=>pref(b)-pref(a));
    const tilt=.3, ct=Math.cos(tilt), st=Math.sin(tilt);
    const P=srt.map((r,k)=>{ const z=1-(k+.5)/N*.96, q=Math.sqrt(1-z*z), th=k*GA, x=Math.cos(th)*q, y=Math.sin(th)*q; return {r,x,y,z}; });
    const g=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R*1.05); g.addColorStop(0,'rgba(255,255,255,.7)'); g.addColorStop(1,'rgba(222,214,200,.35)');
    ctx.fillStyle=g; circle(ctx,cx,cy,R*1.04); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.1)'; ctx.lineWidth=lw; ctx.beginPath(); ctx.ellipse(cx,cy,R*1.5,R*.3,-.12,PI*1.02,PI*1.98); ctx.stroke();
    const base=R*Math.sqrt(2*PI/N)*.62;
    P.sort((a,b)=>a.z-b.z).forEach(p=>{ const d=base*(.55+.45*p.z)*(.85+.3*p.r.i), px=Math.max(8,Math.ceil(d*1.1)), X=cx+p.x*R*.92, Y=cy+p.y*R*.92;
      const s=H.dropSnapshot(p.r,px); ctx.globalAlpha=.55+.45*p.z;
      if(s) ctx.drawImage(s,X-d/2,Y-d/2,d,d); else { ctx.fillStyle=rgba(lift(flc(p.r),.2)); circle(ctx,X,Y,d/2); ctx.fill(); }
      ctx.globalAlpha=1; });
    ctx.strokeStyle='rgba(0,0,0,.13)'; ctx.lineWidth=lw; ctx.beginPath(); ctx.ellipse(cx,cy,R*1.5,R*.3,-.12,-PI*.02,PI*1.02); ctx.stroke();
    text(ctx,N+'잔의 행성',cx,W*.93,Math.round(W/38),'rgba(0,0,0,.36)');
  }});

/* ---------- 518 방울 표본함 ---------- */
GALLERY.add({ id:'s518', name:'방울 표본함', cat:'데이터',
  desc:'기록마다 3D 찻방울 하나를 표본처럼 칸에 담았어요. 마신 순서대로 놓이고, 진하게 마신 차일수록 방울이 커요.',
  render(ctx,W,recs,H){
    const N=recs.length, cols=Math.ceil(Math.sqrt(N*1.0)), rows=Math.ceil(N/cols), m=W*.06, cw=(W-2*m)/cols, ch=Math.min(cw*1.08,(W-2*m)/rows), gy=(W-ch*rows)/2, lw=Math.max(1,W/480);
    ctx.strokeStyle='rgba(0,0,0,.07)'; ctx.lineWidth=lw;
    for(let i=0;i<=cols;i++){ ctx.beginPath(); ctx.moveTo(m+i*cw,gy); ctx.lineTo(m+i*cw,gy+rows*ch); ctx.stroke(); }
    for(let j=0;j<=rows;j++){ ctx.beginPath(); ctx.moveTo(m,gy+j*ch); ctx.lineTo(W-m,gy+j*ch); ctx.stroke(); }
    const label=cw>W*.1, fs=Math.max(8,Math.round(cw*.1));
    recs.forEach((r,k)=>{ const i=k%cols, j=Math.floor(k/cols), x=m+(i+.5)*cw, y=gy+j*ch+ch*(label?.44:.5), d=cw*(.48+.28*r.i), px=Math.max(8,Math.ceil(d*1.15));
      const s=H.dropSnapshot(r,px);
      if(s) ctx.drawImage(s,x-d/2,y-d/2,d,d); else { const g=ctx.createRadialGradient(x-d*.15,y-d*.15,0,x,y,d/2); g.addColorStop(0,rgba(lift(flc(r),.3))); g.addColorStop(1,rgba(r.tea)); ctx.fillStyle=g; circle(ctx,x,y,d/2); ctx.fill(); }
      if(label){ text(ctx,String(k+1).padStart(3,'0'),x,gy+j*ch+ch*.9,fs,'rgba(0,0,0,.35)'); } });
  }});

/* ---------- 519 밤하늘 불꽃 ---------- */
GALLERY.add({ id:'s519', name:'밤하늘 불꽃', cat:'공간', bg:'#141827',
  desc:'기록 하나가 불꽃 하나로 터져요. 맛이 좋았던 차일수록 높이, 크게 터지고, 오래된 기록일수록 희미하게 스러져요. 불티 색은 느낀 풍미예요.',
  render(ctx,W,recs,H){
    const N=recs.length, R=H.rng(519), sc=N>60?.58:N>25?.75:1;
    for(let i=0;i<60;i++){ ctx.fillStyle=`rgba(255,255,255,${.08+R()*.25})`; circle(ctx,R()*W,R()*W*.8,W*(.0006+R()*.0012)); ctx.fill(); }
    ctx.fillStyle='rgba(255,255,255,.035)'; ctx.beginPath(); ctx.moveTo(0,W); for(let x=0;x<=W;x+=W/40) ctx.lineTo(x,W*.93-H.fbm(x/W*3,1.3,3)*W*.05); ctx.lineTo(W,W); ctx.fill();
    const recent=recs.slice(-5);
    const B=recs.map((r,k)=>{ const fresh=N<2?1:k/(N-1), Rr=W*(.03+.06*pref(r))*sc*(.5+.5*fresh); return {rec:r,fresh,Rr,x:W*(.1+.8*r.x),y:W*(.1+.66*r.y),r:Rr*.5}; });
    relax(B,40,W*.05,W*.05,W*.95,W*.84);
    const lw=Math.max(.6,W/600);
    B.forEach(b=>{ const r=b.rec, x=b.x, y=b.y, Rr=b.Rr, f=b.fresh, rr=H.rng(H.hash(r.id)), nr=Math.round((8+12*r.i)*(.5+.5*f)), cols=r.colors.map(c=>lift(c.rgb,.3)), al=(.22+.7*f*f);
      if(recent.includes(r)){ ctx.strokeStyle='rgba(255,240,220,.1)'; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x+(rr()-.5)*W*.05,W*.95); ctx.quadraticCurveTo(x+(rr()-.5)*W*.03,(y+W)/2,x,y+Rr*.2); ctx.stroke(); }
      const off=rr()*TAU;
      for(let j=0;j<nr;j++){ const a=off+j/nr*TAU+(rr()-.5)*.15, len=Rr*(.75+.35*rr()), c=cols[1+j%(cols.length-1)]||cols[0], droop=Rr*(.12+.35*(1-f));
        const x0=x+Math.cos(a)*len*.25, y0=y+Math.sin(a)*len*.25, x1=x+Math.cos(a)*len, y1=y+Math.sin(a)*len+droop, mx=x+Math.cos(a)*len*.62, my=y+Math.sin(a)*len*.62+droop*.2;
        const g=ctx.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,rgba(c,0)); g.addColorStop(1,rgba(c,al));
        ctx.strokeStyle=g; ctx.lineWidth=lw*(.7+.7*r.i)*(.6+.4*f); ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(mx,my,x1,y1); ctx.stroke();
        ctx.fillStyle=rgba(lift(c,.2),al); circle(ctx,x1,y1,W*(.0014+.0016*r.i)*(.6+.4*f)); ctx.fill(); }
      ctx.fillStyle=rgba(lift(r.tea,.5),.3+.5*f); circle(ctx,x,y,W*.003*(.6+.4*f)); ctx.fill(); });
  }});

/* ---------- 520 차꽃 화단 ---------- */
GALLERY.add({ id:'s520', name:'차꽃 화단', cat:'생명', bg:'#F4F3EC',
  desc:'기록 하나가 꽃 한 송이로 피어요. 꽃잎은 느낀 풍미, 꽃술은 찻물 색이고, 좋았던 차일수록 크게, 별 셋 받은 차는 겹꽃으로 피어요.',
  render(ctx,W,recs,H){
    const N=recs.length, sc=sizeK(N), R=H.rng(520);
    const P=recs.map(r=>{ const fr=W*(.034+.034*pref(r))*sc*(N<20?1.35:1); return {rec:r,fr,x:W*(.08+.84*r.x),y:W*(.08+.84*r.y),r:fr*.82}; });
    relax(P,80,W*.03,W*.03,W*.97,W*.97);
    for(const p of P){ const rr=H.rng(H.hash(p.rec.id)); for(let k=0;k<2;k++){ const a=rr()*TAU, L=p.fr*1.5;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.fillStyle=`rgba(${140+rr()*20|0},${170+rr()*15|0},${115},.5)`;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(L*.5,-L*.28,L,0); ctx.quadraticCurveTo(L*.5,L*.28,0,0); ctx.fill(); ctx.restore(); } }
    const petals=(p,n,len,wid,off,colf,al)=>{ for(let k=0;k<n;k++){ const a=off+k/n*TAU; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a);
      ctx.fillStyle=rgba(colf(k),al); ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(len*.3,-wid,len*.9,-wid*.8,len,0); ctx.bezierCurveTo(len*.9,wid*.8,len*.3,wid,0,0); ctx.fill(); ctx.restore(); } };
    for(const p of P){ const r=p.rec, n=5+Math.min(3,r.fl.length), off=(H.hash(r.id)%100)/100*TAU;
      petals(p,n,p.fr,p.fr*.42*(6/n)**.5,off,k=>lift(flc(r,k),.2),.9);
      if(r.stars>=3) petals(p,n,p.fr*.62,p.fr*.25,off+PI/n,k=>lift(flc(r,k+1),.4),.95);
      ctx.fillStyle=rgba(r.tea); circle(ctx,p.x,p.y,p.fr*.2); ctx.fill();
      ctx.fillStyle=rgba(dark(r.tea,.35),.6); for(let k=0;k<6;k++){ const a=k/6*TAU+off; circle(ctx,p.x+Math.cos(a)*p.fr*.27,p.y+Math.sin(a)*p.fr*.27,Math.max(.5,p.fr*.035)); ctx.fill(); } }
  }});

})();
