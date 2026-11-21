/* =========================================================
   TEA CANVAS 갤러리 — 묶음 04 : 오브젝트·스티커·그래픽
   기록 하나 = 물건(스티커·우표·찻잔·구슬·보석…) 하나.
   ========================================================= */
(function(){
const H0=GALLERY.H, PI=Math.PI, PI2=PI*2, FONT='Pretendard, sans-serif';
const TORD=['green','white','oolong','black','dark','herb'];

/* ---------- 공용 도구 ---------- */
// N개가 화면의 cov 비율을 덮을 때의 반지름
const unit=(W,N,cov)=>W*Math.sqrt(cov/(Math.max(N,1)*PI));
// 원끼리 겹침 풀기 (ox,oy 로 약하게 당김)
function relax(items,{iters=70,overlap=0,pad=0,pull=.015,box=null,circle=null}={}){
  const n=items.length;
  items.forEach((A,k)=>{ A.x+=Math.sin(k*12.9898)*.01; A.y+=Math.cos(k*78.233)*.01; });
  for(let it=0;it<iters;it++){
    for(let a=0;a<n;a++){ const A=items[a];
      for(let b=a+1;b<n;b++){ const B=items[b], dx=B.x-A.x, dy=B.y-A.y, m=(A.r+B.r)*(1-overlap)+pad;
        if(Math.abs(dx)>m||Math.abs(dy)>m) continue; const d=Math.hypot(dx,dy)||1e-3; if(d<m){ const k=(m-d)/d*.5; A.x-=dx*k; A.y-=dy*k; B.x+=dx*k; B.y+=dy*k; } } }
    for(const A of items){ A.x+=(A.ox-A.x)*pull; A.y+=(A.oy-A.y)*pull;
      if(box){ A.x=Math.max(box[0]+A.r,Math.min(box[2]-A.r,A.x)); A.y=Math.max(box[1]+A.r,Math.min(box[3]-A.r,A.y)); }
      if(circle){ const dx=A.x-circle[0], dy=A.y-circle[1], d=Math.hypot(dx,dy), lim=circle[2]-A.r; if(d>lim){ A.x=circle[0]+dx/d*lim; A.y=circle[1]+dy/d*lim; } } }
  }
  return items;
}
// 기록 → 화면 좌표 아이템
function place(recs,W,R,{margin=0,size=r=>1}={}){
  return recs.map(rec=>{ const r=R*size(rec), m=margin+r, x=m+rec.x*(W-2*m), y=m+rec.y*(W-2*m); return {rec,r,x,y,ox:x,oy:y}; });
}
// 격자 맞추기: 가로세로비 asp(w/h)인 칸 N개를 aw×ah 안에 가장 크게
function fitGrid(N,aw,ah,asp=1){
  let best=null;
  for(let c=1;c<=N;c++){ const rows=Math.ceil(N/c), cw=aw/c, ch=ah/rows, w=Math.min(cw,ch*asp);
    if(!best||w>best.w) best={cols:c,rows,cw,ch,w,h:w/asp}; }
  return best;
}
function rrect(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function polar(ctx,cx,cy,R,fn,n=72,rot=0){ ctx.beginPath(); for(let k=0;k<=n;k++){ const a=k/n*PI2, r=R*fn(a); const x=cx+Math.cos(a+rot)*r, y=cy+Math.sin(a+rot)*r; k?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.closePath(); }
const C=(c,a=1)=>H0.rgbStr(c,a);
const flav=(rec,k)=>rec.fl[k]?rec.fl[k].rgb:null;
const fl0=rec=>flav(rec,0)||H0.shade(rec.tea,-.25);
const teaP=(rec,l=.08,s=1.05)=>H0.pastel(rec.tea,l,s);
const hueOf=c=>{ const [r,g,b]=c, mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn; if(d<1e-4) return 0; let h= mx===r?((g-b)/d)%6: mx===g?(b-r)/d+2:(r-g)/d+4; return (h*60+360)%360; };
const sortByTea=recs=>recs.slice().sort((a,b)=>TORD.indexOf(a.type)-TORD.indexOf(b.type)||hueOf(fl0(a))-hueOf(fl0(b))||a.idx-b.idx);
const LW=W=>W/480;

/* =========================================================
   s401 스티커 노트
   ========================================================= */
const STK={ green:a=>1+.07*Math.cos(10*a), white:a=>1, oolong:a=>Math.pow(Math.pow(Math.abs(Math.cos(a)),4)+Math.pow(Math.abs(Math.sin(a)),4),-.25)*.9,
  black:a=>.78+.22*Math.abs(Math.cos(2.5*a)), dark:a=>1+.06*Math.sin(3*a)+.05*Math.cos(5*a+1), herb:a=>.82+.18*Math.pow(Math.abs(Math.cos(3*a)),.5) };
GALLERY.add({ id:'s401', name:'스티커 노트', cat:'스티커',
  desc:'기록 하나가 흰 테두리를 두른 스티커 한 장이에요. 모양은 차 종류, 무늬는 풍미이고, 향·맛이 좋았던 차일수록 오른쪽·위쪽에 붙어요.',
  bg:'#FAF9F5',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), g=W/22;
    ctx.fillStyle='rgba(70,80,100,.16)'; for(let y=g/2;y<W;y+=g) for(let x=g/2;x<W;x+=g){ ctx.beginPath(); ctx.arc(x,y,lw*1.1,0,PI2); ctx.fill(); }
    const R0=unit(W,N,N<20?.3:.46);
    const items=relax(place(recs,W,R0,{margin:W*.02,size:r=>.82+.3*r.i}),{overlap:.14,box:[W*.01,W*.01,W*.99,W*.99]});
    for(const it of items){
      const rec=it.rec, rr=H.rng(H.hash(rec.id+'s')), f=STK[rec.type], rot=(rr()-.5)*1.1, R=it.r, b=Math.max(1.6*lw,R*.15);
      polar(ctx,it.x,it.y,R+b,f,72,rot); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(40,40,50,.16)'; ctx.lineWidth=lw*.9; ctx.stroke();
      ctx.save(); polar(ctx,it.x,it.y,R,f,72,rot); ctx.fillStyle=C(teaP(rec,.05)); ctx.fill(); ctx.clip();
      const v=H.hash(rec.id)%3, F=rec.fl;
      if(v===0){ // 동심
        F.forEach((q,k)=>{ polar(ctx,it.x,it.y,R*(.66-k*.2),f,48,rot); ctx.fillStyle=C(H.pastel(q.rgb,.04,1.05)); ctx.fill(); });
      } else if(v===1){ // 사선 나눔
        ctx.translate(it.x,it.y); ctx.rotate(rot+.7);
        F.forEach((q,k)=>{ ctx.fillStyle=C(H.pastel(q.rgb,.04,1.05)); ctx.fillRect(-R*1.5,R*(.05+k*.3),R*3,R*(k===F.length-1?2:.3)); });
      } else { // 물방울 점
        F.forEach((q,k)=>{ const a=rot+k*2.2+.6, d=R*(k?.42:.12); ctx.beginPath(); ctx.arc(it.x+Math.cos(a)*d,it.y+Math.sin(a)*d,R*(.48-k*.12)*(.6+.5*q.w),0,PI2); ctx.fillStyle=C(H.pastel(q.rgb,.04,1.05)); ctx.fill(); });
      }
      ctx.restore();
      // 은은한 광택
      ctx.beginPath(); ctx.arc(it.x,it.y,R*.72,PI*1.1,PI*1.45); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=Math.max(lw,R*.09); ctx.lineCap='round'; ctx.stroke();
      if(rec.stars>=3&&R>W*.02){ // 별 세 개 = 작은 금별 스티커
        const sx=it.x+R*.72, sy=it.y-R*.72, s=Math.max(R*.3,W*.012);
        ctx.beginPath(); for(let k=0;k<10;k++){ const a=-PI/2+k*PI/5, q=k%2?s*.48:s; ctx.lineTo(sx+Math.cos(a)*q,sy+Math.sin(a)*q); } ctx.closePath();
        ctx.lineJoin='round'; ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=s*.45; ctx.stroke(); ctx.fillStyle='#E2B24F'; ctx.fill();
      }
    }
  }});

/* =========================================================
   s402 우표 수집첩
   ========================================================= */
GALLERY.add({ id:'s402', name:'우표 수집첩', cat:'오브젝트',
  desc:'마신 차를 한 장씩 우표로 모은 수집첩이에요. 찻물 색 하늘에 풍미가 해와 언덕으로 그려지고, 오래된 기록일수록 소인이 찍혀 있어요.',
  bg:'#2E3936',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), pad=W*.05;
    const G=fitGrid(N,W-pad*2,W-pad*2,.8), sw=G.w*.84, sh=G.h*.84;
    const gw=G.cols*G.cw, gh=G.rows*G.h/.84*.84; const rowH=G.h, top=(W-G.rows*rowH)/2, left=(W-gw)/2;
    // 수집첩 띠
    for(let rw=0;rw<G.rows;rw++){ const y=top+rw*rowH+rowH*.45; ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(W*.03,y,W*.94,rowH*.48); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(W*.03,y,W*.94,Math.max(1,lw*.8)); }
    const L=document.createElement('canvas'); L.width=L.height=W; const x=L.getContext('2d');
    recs.forEach((rec,k)=>{
      const cx=left+(k%G.cols+.5)*G.cw, cy=top+(Math.floor(k/G.cols)+.5)*rowH, r=H.rng(H.hash(rec.id+'st'));
      x.save(); x.translate(cx,cy); x.rotate((r()-.5)*.06);
      x.globalCompositeOperation='source-over'; x.fillStyle='#FBF9F3'; x.fillRect(-sw/2,-sh/2,sw,sh);
      const m=sw*.1, iw=sw-2*m, ih=sh-2*m-sh*.08, ix=-iw/2, iy=-sh/2+m;
      x.save(); x.beginPath(); x.rect(ix,iy,iw,ih); x.clip();
      const sky=x.createLinearGradient(0,iy,0,iy+ih); sky.addColorStop(0,C(H.pastel(rec.tea,.35,1))); sky.addColorStop(1,C(H.pastel(rec.tea,.02,1.1))); x.fillStyle=sky; x.fillRect(ix,iy,iw,ih);
      const F=rec.fl, v=H.hash(rec.id)%3, c1=F[0]?F[0].rgb:H.shade(rec.tea,-.3), c2=F[1]?F[1].rgb:H.shade(rec.tea,-.2), c3=F[2]?F[2].rgb:H.shade(c2,-.2);
      if(v===0){ // 해와 언덕
        x.beginPath(); x.arc(ix+iw*(.3+r()*.4),iy+ih*.42,iw*.2,0,PI2); x.fillStyle=C(H.pastel(c1,.05,1.1)); x.fill();
        [[c2,.62],[c3,.78]].forEach(([c,h],j)=>{ x.beginPath(); x.moveTo(ix,iy+ih); for(let t=0;t<=20;t++){ const px=ix+iw*t/20; x.lineTo(px,iy+ih*h+Math.sin(t/20*PI*(1.4+j)+r()*0.2+j)*ih*.07); } x.lineTo(ix+iw,iy+ih); x.closePath(); x.fillStyle=C(H.pastel(c,.02,1.05)); x.fill(); });
      } else if(v===1){ // 무지개 아치
        const cols=[c1,c2,c3,rec.tea]; for(let j=0;j<4;j++){ x.beginPath(); x.arc(0,iy+ih,iw*(.46-j*.1),PI,0); x.closePath(); x.fillStyle=C(H.pastel(cols[j],.03+j*.04,1.05)); x.fill(); }
      } else { // 찻잎
        x.save(); x.translate(0,iy+ih*.55); x.rotate(-.6+r()*.3); const lh=ih*.42, lw2=iw*.28;
        x.beginPath(); x.moveTo(0,-lh); x.quadraticCurveTo(lw2*1.4,0,0,lh); x.quadraticCurveTo(-lw2*1.4,0,0,-lh); x.fillStyle=C(H.pastel(c1,.02,1.1)); x.fill();
        x.beginPath(); x.moveTo(0,-lh*.9); x.lineTo(0,lh*1.15); x.strokeStyle=C(H.pastel(c2,.1,1),.9); x.lineWidth=Math.max(.6,iw*.03); x.stroke(); x.restore();
      }
      x.restore();
      x.strokeStyle='rgba(60,50,40,.18)'; x.lineWidth=Math.max(.5,lw*.6); x.strokeRect(ix,iy,iw,ih);
      // 액면가 = 별점
      if(sw>W*.07){ x.fillStyle='rgba(60,50,40,.7)'; x.font=`600 ${Math.max(5,sh*.08)}px ${FONT}`; x.textAlign='left'; x.textBaseline='alphabetic'; x.fillText(String((rec.stars+1)*100),ix,sh/2-m*.55); x.textAlign='right'; x.fillText(rec.teaLabel,ix+iw,sh/2-m*.55); }
      else { x.fillStyle='rgba(60,50,40,.55)'; for(let s=0;s<rec.stars;s++){ x.beginPath(); x.arc(ix+m*.3+s*m*.9,sh/2-m*.95,Math.max(.6,m*.28),0,PI2); x.fill(); } }
      // 소인 (오래된 기록)
      if(rec.daysAgo>120 && H.hash(rec.id+'pm')%3!==0){ x.strokeStyle='rgba(40,40,60,.38)'; x.lineWidth=Math.max(.5,sw*.025); const ox=sw*.18*(r()-.3);
        x.beginPath(); x.arc(ox+sw*.2,-sh*.12,sw*.26,0,PI2); x.stroke();
        for(let j=0;j<3;j++){ x.beginPath(); for(let t=0;t<=12;t++){ const px=ox-sw*.75+sw*1.0*t/12; x.lineTo(px,-sh*.24+j*sh*.09+Math.sin(t*.9)*sh*.025); } x.stroke(); } }
      // 톱니 구멍
      x.globalCompositeOperation='destination-out'; x.fillStyle='#000';
      const per=Math.max(4,Math.round(sw/Math.max(2.2,sw/9))), sp=sw/per, hr=sp*.32;
      for(let j=0;j<=per;j++){ const px=-sw/2+j*sp; x.beginPath(); x.arc(px,-sh/2,hr,0,PI2); x.arc(px,sh/2,hr,0,PI2); x.fill(); }
      const pv=Math.round(sh/sp); for(let j=0;j<=pv;j++){ const py=-sh/2+j*sh/pv; x.beginPath(); x.arc(-sw/2,py,hr,0,PI2); x.arc(sw/2,py,hr,0,PI2); x.fill(); }
      x.restore();
    });
    ctx.drawImage(L,0,0);
  }});

/* =========================================================
   s403 찻잔이 놓인 테이블
   ========================================================= */
GALLERY.add({ id:'s403', name:'찻잔이 놓인 테이블', cat:'오브젝트',
  desc:'위에서 내려다본 찻잔들이에요. 잔에 담긴 찻물 색 위로 풍미가 소용돌이치고, 향·맛이 좋았던 잔일수록 오른쪽·위쪽에 놓여요.',
  bg:'#E7E0D4',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W);
    // 나뭇결
    for(let k=0;k<7;k++){ const y=W*(k+1)/7.5; ctx.strokeStyle='rgba(120,95,70,.10)'; ctx.lineWidth=lw; ctx.beginPath(); for(let t=0;t<=40;t++){ const x=W*t/40; ctx.lineTo(x,y+(H.noise(t*.25,k*3)-.5)*W*.01); } ctx.stroke(); }
    for(let k=0;k<60;k++){ const r=H.rng(k+9), y=r()*W, x=r()*W; ctx.strokeStyle='rgba(120,95,70,.06)'; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+W*(.05+r()*.15),y+(r()-.5)*W*.004); ctx.stroke(); }
    const R0=unit(W,N,N<20?.33:.5);
    const items=relax(place(recs,W,R0,{margin:W*.02,size:r=>.85+.25*r.i}),{overlap:.04,box:[0,0,W,W],iters:90});
    for(const it of items){
      const rec=it.rec, Rs=it.r, r=H.rng(H.hash(rec.id+'c')), ha=-PI/4+(r()-.5)*.8;
      const Rc=Rs*.7, Rl=Rs*.58;
      // 받침
      ctx.beginPath(); ctx.arc(it.x,it.y,Rs,0,PI2); ctx.fillStyle='#FBF9F5'; ctx.fill(); ctx.strokeStyle='rgba(90,70,50,.18)'; ctx.lineWidth=lw*.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(it.x,it.y,Rs*.8,0,PI2); ctx.strokeStyle='rgba(90,70,50,.07)'; ctx.stroke();
      // 손잡이
      ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(ha); rrect(ctx,Rc*.8,-Rs*.09,Rc*.55,Rs*.18,Rs*.09); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(90,70,50,.22)'; ctx.stroke(); ctx.restore();
      // 잔
      ctx.beginPath(); ctx.arc(it.x,it.y,Rc,0,PI2); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(90,70,50,.22)'; ctx.stroke();
      // 찻물
      ctx.save(); ctx.beginPath(); ctx.arc(it.x,it.y,Rl,0,PI2); ctx.clip();
      const g=ctx.createRadialGradient(it.x-Rl*.25,it.y-Rl*.25,0,it.x,it.y,Rl); const t=H.pastel(rec.tea,.02,1.1);
      g.addColorStop(0,C(H.shade(t,.25))); g.addColorStop(.75,C(t)); g.addColorStop(1,C(H.shade(t,-.18))); ctx.fillStyle=g; ctx.fillRect(it.x-Rl,it.y-Rl,Rl*2,Rl*2);
      const a0=r()*PI2;
      rec.fl.forEach((q,k)=>{ ctx.beginPath(); const turns=1.3;
        for(let s=0;s<=50;s++){ const u=s/50, a=a0+k*PI2/rec.fl.length+u*turns*PI2*(H.hash(rec.id)%2?1:-1), rad=Rl*(.08+.82*u); ctx.lineTo(it.x+Math.cos(a)*rad,it.y+Math.sin(a)*rad); }
        ctx.strokeStyle=C(H.pastel(q.rgb,.12,1.05),.6); ctx.lineWidth=Math.max(lw*.8,Rl*(.06+.07*q.w)); ctx.lineCap='round'; ctx.stroke(); });
      ctx.restore();
      ctx.beginPath(); ctx.arc(it.x,it.y,Rl,0,PI2); ctx.strokeStyle=C(H.shade(rec.tea,-.3),.25); ctx.lineWidth=lw*.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(it.x,it.y,Rl*.86,PI*1.05,PI*1.4); ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=Math.max(lw*.8,Rl*.07); ctx.lineCap='round'; ctx.stroke();
    }
  }});

/* =========================================================
   s404 티백 태그
   ========================================================= */
GALLERY.add({ id:'s404', name:'티백 태그', cat:'오브젝트',
  desc:'위에서 늘어뜨린 티백 꼬리표예요. 맛이 좋았던 차일수록 실이 짧아 위에 걸리고, 향이 좋았던 차일수록 오른쪽에 매달려요.',
  bg:'#F6F3EC',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W);
    const R0=unit(W,N,N<20?.26:.4), tw=R0*1.25, th=R0*1.6;
    const items=relax(recs.map(rec=>{ const x=W*.06+rec.x*W*.88, y=W*.14+rec.y*W*.8; return {rec,r:R0*.95,x,y,ox:x,oy:y}; }),{overlap:.02,box:[0,W*.06,W,W],iters:80,pull:.03});
    // 줄
    ctx.lineCap='round';
    for(const it of items){ const r=H.rng(H.hash(it.rec.id+'t')), ax=it.x+(r()-.5)*W*.12;
      ctx.beginPath(); ctx.moveTo(ax,-2); ctx.quadraticCurveTo((ax+it.x)/2+(r()-.5)*W*.02,(it.y-th/2)*.55,it.x,it.y-th/2+th*.08);
      ctx.strokeStyle='rgba(120,100,80,.32)'; ctx.lineWidth=Math.max(.5,lw*.8); ctx.stroke(); it.sw=(r()-.5)*.25; }
    for(const it of items){ const rec=it.rec;
      ctx.save(); ctx.translate(it.x,it.y-th/2); ctx.rotate(it.sw); ctx.translate(0,th/2);
      const ch=tw*.22; // 깎인 모서리
      const path=()=>{ ctx.beginPath(); ctx.moveTo(-tw/2+ch,-th/2); ctx.lineTo(tw/2-ch,-th/2); ctx.lineTo(tw/2,-th/2+ch); ctx.lineTo(tw/2,th/2); ctx.lineTo(-tw/2,th/2); ctx.lineTo(-tw/2,-th/2+ch); ctx.closePath(); };
      path(); ctx.fillStyle='#FFFDF8'; ctx.fill(); ctx.save(); ctx.clip();
      const bh=th*(rec.fl.length?.58:.86); ctx.fillStyle=C(teaP(rec,.06)); ctx.fillRect(-tw/2,-th/2+th*.14,tw,bh*(.6+.4*rec.i)+th*.1);
      let y=th/2; const tot=rec.fl.reduce((s,q)=>s+q.w,0)||1, band=th*.3;
      rec.fl.slice().reverse().forEach(q=>{ const h=band*q.w/tot; ctx.fillStyle=C(H.pastel(q.rgb,.05,1.05)); ctx.fillRect(-tw/2,y-h,tw,h); y-=h; });
      ctx.restore();
      path(); ctx.strokeStyle='rgba(90,70,50,.22)'; ctx.lineWidth=lw*.8; ctx.stroke();
      // 스테이플
      ctx.fillStyle='rgba(150,150,155,.9)'; ctx.fillRect(-tw*.18,-th/2+th*.05,tw*.36,Math.max(1,th*.035));
      // 별점 점
      ctx.fillStyle='rgba(255,255,255,.9)'; for(let s=0;s<rec.stars;s++){ ctx.beginPath(); ctx.arc(-tw*.28+s*tw*.18,-th/2+th*.25,Math.max(.6,tw*.05),0,PI2); ctx.fill(); }
      ctx.restore(); }
  }});

/* =========================================================
   s405 찻잎 모래병 선반
   ========================================================= */
GALLERY.add({ id:'s405', name:'모래병 선반', cat:'오브젝트',
  desc:'차 종류마다 유리병이 하나씩 있고, 마실 때마다 그 병에 색모래가 한 겹씩 쌓여요. 찻물 색 위에 풍미 색이 얇게 얹혀요.',
  bg:'#F4F0E8',
  render(ctx,W,recs,H){
    const lw=LW(W), by={}; TORD.forEach(t=>by[t]=[]); recs.forEach(r=>by[r.type].push(r));
    const thick=r=>.6+.6*r.i, sums=TORD.map(t=>by[t].reduce((s,r)=>s+thick(r),0)), cap=Math.max(8,...sums)*1.08;
    const jw=W*.27, jh=W*.235, shelfY=[W*.3,W*.6,W*.9];
    shelfY.forEach(y=>{ ctx.fillStyle='#D8C6A8'; ctx.fillRect(W*.04,y,W*.92,W*.022); ctx.fillStyle='rgba(120,90,60,.25)'; ctx.fillRect(W*.04,y+W*.022-lw,W*.92,lw); });
    TORD.forEach((t,k)=>{ const sx=k%2, sy=Math.floor(k/2), cx=W*(sx?.7:.3), base=shelfY[sy], x0=cx-jw/2, y0=base-jh, rr=jw*.12;
      const ix=x0+jw*.06, iw=jw*.88, ib=base-jh*.05, itop=y0+jh*.2, ih=ib-itop;
      // 내용물
      ctx.save(); rrect(ctx,x0+lw,y0+jh*.14,jw-2*lw,jh*.86-lw,rr); ctx.clip();
      let level=ib; const rs=by[t], r=H.rng(H.hash(t));
      const wav=(xx,amp,ph)=>Math.sin(xx/iw*PI*2*(.6+r()*0)+ph)*amp+(H.noise(xx*.03,ph)-.5)*amp*1.5;
      const bands=[];
      rs.forEach((rec,j)=>{ const h=thick(rec)/cap*ih, ph=j*1.7, amp=Math.min(h*.45,W*.008);
        const layers=[[rec.tea,h*(rec.fl.length?.62:1)]].concat(rec.fl.map(q=>[q.rgb,h*.38*q.w/rec.fl.reduce((s,z)=>s+z.w,0)]));
        layers.forEach(([c,hh],m)=>{ const yTop=level-hh, pts=[]; for(let s=0;s<=24;s++){ const xx=x0+jw*s/24; pts.push([xx,yTop+wav(xx-x0,amp,ph+m*.7)]); }
          bands.push([pts,C(H.pastel(c,m?.05:.1,1.05))]); level=yTop; }); });
      for(let j=bands.length-1;j>=0;j--){ const [pts,fs]=bands[j]; ctx.beginPath(); ctx.moveTo(x0,ib+W); pts.forEach(p=>ctx.lineTo(p[0],p[1])); ctx.lineTo(x0+jw,ib+W); ctx.closePath(); ctx.fillStyle=fs; ctx.fill(); }
      ctx.restore();
      // 유리
      rrect(ctx,x0,y0+jh*.14,jw,jh*.86,rr); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fill(); ctx.strokeStyle='rgba(80,90,90,.35)'; ctx.lineWidth=lw*1.1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.45)'; rrect(ctx,x0+jw*.07,y0+jh*.24,jw*.035,jh*.55,jw*.02); ctx.fill();
      // 뚜껑
      rrect(ctx,x0+jw*.1,y0,jw*.8,jh*.13,jw*.03); ctx.fillStyle='#CDB28A'; ctx.fill(); ctx.strokeStyle='rgba(110,80,50,.35)'; ctx.lineWidth=lw*.8; ctx.stroke();
      for(let q=1;q<5;q++){ ctx.beginPath(); ctx.moveTo(x0+jw*.1+jw*.8*q/5,y0+jh*.02); ctx.lineTo(x0+jw*.1+jw*.8*q/5,y0+jh*.11); ctx.strokeStyle='rgba(110,80,50,.18)'; ctx.stroke(); }
      // 라벨
      ctx.fillStyle='rgba(60,50,40,.55)'; ctx.font=`${Math.round(W/34)}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText(`${H.TEAS[t].label}  ${rs.length}`,cx,base+W*.028);
    });
  }});

/* =========================================================
   s406 마카롱 상자
   ========================================================= */
GALLERY.add({ id:'s406', name:'마카롱 상자', cat:'오브젝트',
  desc:'마신 순서대로 상자에 채운 마카롱이에요. 꼬끄는 찻물 색, 가운데 필링은 가장 강한 풍미, 위에 뿌린 점은 그 밖의 풍미예요.',
  bg:'#F1E9E4',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), pad=W*.07;
    const G=fitGrid(N,W-2*pad,W-2*pad,1.25), mw=G.w*.82, mh=mw*.74;
    const gx=(W-G.cols*G.w)/2, gy=(W-G.rows*G.h)/2;
    rrect(ctx,gx-W*.025,gy-W*.025,G.cols*G.w+W*.05,G.rows*G.h+W*.05,W*.02); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(120,90,80,.15)'; ctx.lineWidth=lw; ctx.stroke();
    for(let rw=1;rw<G.rows;rw++){ ctx.fillStyle='rgba(150,110,100,.12)'; ctx.fillRect(gx,gy+rw*G.h-lw*.5,G.cols*G.w,lw); }
    recs.forEach((rec,k)=>{ const cx=gx+(k%G.cols+.5)*G.w, cy=gy+(Math.floor(k/G.cols)+.5)*G.h;
      const shell=H.pastel(rec.tea,.22,1.05), dark=H.shade(shell,-.12), fill=H.pastel(fl0(rec),.12,1.05), w=mw, h=mh;
      const ol='rgba(110,80,70,.18)';
      // 아래 꼬끄
      ctx.beginPath(); ctx.moveTo(cx-w/2,cy+h*.12); ctx.lineTo(cx+w/2,cy+h*.12); ctx.bezierCurveTo(cx+w/2,cy+h*.48,cx-w/2,cy+h*.48,cx-w/2,cy+h*.12); ctx.closePath(); ctx.fillStyle=C(shell); ctx.fill(); ctx.strokeStyle=ol; ctx.lineWidth=lw*.7; ctx.stroke();
      // 필링
      rrect(ctx,cx-w*.47,cy-h*.1,w*.94,h*.22,h*.11); ctx.fillStyle=C(fill); ctx.fill();
      // 위 꼬끄
      ctx.beginPath(); ctx.moveTo(cx-w/2,cy-h*.1); ctx.bezierCurveTo(cx-w/2,cy-h*.62,cx+w/2,cy-h*.62,cx+w/2,cy-h*.1); ctx.closePath(); ctx.fillStyle=C(shell); ctx.fill(); ctx.stroke();
      // 피에(발)
      [cy-h*.1,cy+h*.12].forEach(fy=>{ ctx.beginPath(); const n=Math.max(6,Math.round(w/(W*.012))); for(let s=0;s<=n;s++){ const xx=cx-w*.48+w*.96*s/n; ctx.lineTo(xx,fy+(s%2?1:-1)*h*.025); } ctx.strokeStyle=C(dark,.8); ctx.lineWidth=Math.max(.6,h*.05); ctx.stroke(); });
      // 광택
      ctx.beginPath(); ctx.ellipse(cx-w*.18,cy-h*.36,w*.16,h*.05,-.15,0,PI2); ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fill();
      // 토핑 점
      const r=H.rng(H.hash(rec.id+'m'));
      rec.fl.slice(1).forEach(q=>{ for(let s=0;s<4;s++){ const a=r(); ctx.beginPath(); ctx.arc(cx+(a-.5)*w*.6,cy-h*(.26+r()*.12),Math.max(.6,w*.022),0,PI2); ctx.fillStyle=C(H.pastel(q.rgb,0,1.1)); ctx.fill(); } });
    });
  }});

/* =========================================================
   s407 단추 깡통
   ========================================================= */
GALLERY.add({ id:'s407', name:'단추 깡통', cat:'오브젝트',
  desc:'둥근 깡통에 모아 둔 단추들이에요. 단추 색은 찻물, 구멍에 꿴 실은 풍미 색이고, 구멍이 넷인 단추는 풍미가 둘 이상인 차예요.',
  bg:'#F3EFE9',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), cx=W/2, cy=W/2, Rt=W*.47, Ri=Rt*.88;
    // 깡통
    ctx.beginPath(); ctx.arc(cx,cy,Rt,0,PI2); ctx.fillStyle='#B9C9CF'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,Rt*.955,0,PI2); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=W*.006; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,Ri,0,PI2); ctx.fillStyle='#CBD8DC'; ctx.fill(); ctx.strokeStyle='rgba(60,80,90,.25)'; ctx.lineWidth=lw; ctx.stroke();
    const area=PI*Ri*Ri, r0=Math.sqrt((N<20?.42:.66)*area/(N*PI));
    const items=recs.map(rec=>{ const a=rec.x*PI2*0+0, u=(rec.x-.5)*2*Ri*.75, v=(rec.y-.5)*2*Ri*.75; return {rec,r:r0*(.78+.38*rec.i),x:cx+u,y:cy+v,ox:cx+u,oy:cy+v}; });
    relax(items,{overlap:0,pad:lw*.5,circle:[cx,cy,Ri-lw*2],iters:140,pull:.01});
    for(const it of items){ const rec=it.rec, R=it.r, base=teaP(rec,.06,1.05), d=H.shade(base,-.16), rot=H.hash(rec.id)%628/100;
      ctx.beginPath(); ctx.arc(it.x,it.y,R,0,PI2); ctx.fillStyle=C(base); ctx.fill(); ctx.strokeStyle=C(H.shade(base,-.3),.5); ctx.lineWidth=lw*.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(it.x,it.y,R*.72,0,PI2); ctx.strokeStyle=C(d,.8); ctx.lineWidth=Math.max(lw*.7,R*.09); ctx.stroke();
      ctx.beginPath(); ctx.arc(it.x,it.y,R*.88,PI*1.1,PI*1.5); ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=Math.max(lw*.6,R*.06); ctx.lineCap='round'; ctx.stroke();
      const four=rec.fl.length>=2, hs=R*.22, hr=Math.max(.7*lw,R*.085), holes=four?[[-1,-1],[1,-1],[1,1],[-1,1]]:[[-1.2,0],[1.2,0]];
      const P=holes.map(([a,b])=>[it.x+(a*Math.cos(rot)-b*Math.sin(rot))*hs,it.y+(a*Math.sin(rot)+b*Math.cos(rot))*hs]);
      P.forEach(p=>{ ctx.beginPath(); ctx.arc(p[0],p[1],hr,0,PI2); ctx.fillStyle=C(H.shade(base,-.45)); ctx.fill(); });
      const th=Math.max(lw*.9,R*.1); ctx.lineCap='round'; ctx.lineWidth=th;
      if(four){ ctx.strokeStyle=C(H.pastel(rec.fl[0].rgb,0,1.15)); ctx.beginPath(); ctx.moveTo(...P[0]); ctx.lineTo(...P[2]); ctx.stroke();
        ctx.strokeStyle=C(H.pastel(rec.fl[1].rgb,0,1.15)); ctx.beginPath(); ctx.moveTo(...P[1]); ctx.lineTo(...P[3]); ctx.stroke(); }
      else { ctx.strokeStyle=C(H.pastel(fl0(rec),0,1.15)); ctx.beginPath(); ctx.moveTo(...P[0]); ctx.lineTo(...P[1]); ctx.stroke(); }
    }
  }});

/* =========================================================
   s408 구슬 목걸이
   ========================================================= */
GALLERY.add({ id:'s408', name:'구슬 목걸이', cat:'오브젝트',
  desc:'한 잔에 구슬 하나씩, 마신 순서대로 꿴 목걸이예요. 구슬은 찻물 색, 가운데 띠는 풍미이고, 기록이 늘면 바깥으로 줄이 한 가닥씩 늘어나요.',
  bg:'#EFEBE4',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), S=Math.max(1,Math.ceil(N/26)), y0=W*.07, strands=[];
    for(let s=0;s<S;s++){ const t=S===1?1:s/(S-1), hw=W*(S===1?.3:.2+.21*t), dep=W*(S===1?.66:.42+.44*t);
      const P0=[W/2-hw,y0], P3=[W/2+hw,y0], P1=[W/2-hw*1.12,y0+dep*1.33], P2=[W/2+hw*1.12,y0+dep*1.33];
      const cv=t=>{ const u=1-t; return [u*u*u*P0[0]+3*u*u*t*P1[0]+3*u*t*t*P2[0]+t*t*t*P3[0], u*u*u*P0[1]+3*u*u*t*P1[1]+3*u*t*t*P2[1]+t*t*t*P3[1]]; };
      const tab=[]; let L=0, prev=cv(0); tab.push([0,prev]); for(let k=1;k<=240;k++){ const p=cv(k/240); L+=Math.hypot(p[0]-prev[0],p[1]-prev[1]); tab.push([L,p]); prev=p; }
      strands.push({tab,L,A:P0,B:P3}); }
    const totL=strands.reduce((a,s)=>a+s.L*.88,0); let left=N; const cnt=strands.map((s,k)=>{ const c=k===S-1?left:Math.round(N*s.L*.88/totL); left-=c; return c; });
    const sp=Math.min(...strands.map((s,k)=>s.L*.88/Math.max(1,cnt[k]))), Rb=Math.min(sp*.43,W*.05);
    let idx=0;
    strands.forEach((st,s)=>{ const {tab,L}=st, n=cnt[s], rs=recs.slice(idx,idx+n); idx+=n;
      ctx.beginPath(); tab.forEach(([,p],k)=>k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.strokeStyle='rgba(120,105,90,.45)'; ctx.lineWidth=lw*.9; ctx.stroke();
      const at=l=>{ let lo=0,hi=tab.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; tab[m][0]<l?lo=m:hi=m; } return tab[lo][1]; };
      const l0=L/2-sp*n/2;
      for(let k=0;k<=n;k++){ const p=at(l0+sp*k); ctx.beginPath(); ctx.arc(p[0],p[1],Rb*.26,0,PI2); ctx.fillStyle='#D2B477'; ctx.fill(); }
      rs.forEach((rec,k)=>{ const l=l0+sp*(k+.5), p=at(l), q=at(l+1), ang=Math.atan2(q[1]-p[1],q[0]-p[0]), R=Rb*(.78+.22*rec.i), base=teaP(rec,.05,1.08);
        ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(ang);
        ctx.beginPath(); ctx.arc(0,0,R,0,PI2); ctx.fillStyle=C(base); ctx.fill(); ctx.save(); ctx.clip();
        const F=rec.fl, tot=F.reduce((a,z)=>a+z.w,0)||1; let x=-R*.42; F.forEach(z=>{ const bw=R*.84*z.w/tot; ctx.fillStyle=C(H.pastel(z.rgb,.03,1.1)); ctx.fillRect(x,-R,bw,R*2); x+=bw; });
        const g=ctx.createRadialGradient(-R*.35,-R*.35,0,0,0,R); g.addColorStop(0,'rgba(255,255,255,.35)'); g.addColorStop(.6,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(0,0,0,.08)'); ctx.fillStyle=g; ctx.fillRect(-R,-R,2*R,2*R);
        ctx.restore(); ctx.beginPath(); ctx.arc(0,0,R,0,PI2); ctx.strokeStyle=C(H.shade(base,-.35),.35); ctx.lineWidth=lw*.7; ctx.stroke();
        ctx.beginPath(); ctx.arc(-R*.38,-R*.38,R*.16,0,PI2); ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fill();
        ctx.restore(); });
      [st.A,st.B].forEach(p=>{ ctx.beginPath(); ctx.arc(p[0],p[1]-W*.012,W*.008,0,PI2); ctx.strokeStyle='#C8A764'; ctx.lineWidth=W*.0035; ctx.stroke(); });
    });
  }});

/* =========================================================
   s409 보석 상자
   ========================================================= */
function gemOutline(kind,R,n=16){
  const pts=[];
  if(kind==='emerald'){ const w=R*.95,h=R*.72,c=R*.22; return [[-w+c,-h],[w-c,-h],[w,-h+c],[w,h-c],[w-c,h],[-w+c,h],[-w,h-c],[-w,-h+c]]; }
  for(let k=0;k<n;k++){ const a=-PI/2+k/n*PI2; let x=Math.cos(a), y=Math.sin(a);
    if(kind==='oval'){ x*=.78; } else if(kind==='cushion'){ const s=Math.pow(Math.pow(Math.abs(x),4)+Math.pow(Math.abs(y),4),-.25)*.85; x*=s; y*=s; }
    else if(kind==='pear'){ const t=(1-y)/2; x*=.55+.45*Math.pow(t,.6)*1.05; x*=.8; } else if(kind==='marquise'){ x*=.55*Math.pow(1-y*y,.25)/1; }
    pts.push([x*R,y*R]); }
  return pts;
}
GALLERY.add({ id:'s409', name:'보석 상자', cat:'오브젝트',
  desc:'기록 하나가 보석 한 알이에요. 차 종류마다 컷이 다르고, 면마다 찻물 색과 풍미 색이 번갈아 빛나요. 별 세 개 차에는 반짝임이 있어요.',
  bg:'#2A2B31',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), pad=W*.05, G=fitGrid(N,W-2*pad,W-2*pad,1), s=G.w, gx=(W-G.cols*s)/2, gy=(W-G.rows*s)/2;
    const KIND={green:'round',white:'oval',oolong:'cushion',black:'emerald',dark:'pear',herb:'marquise'};
    for(let k=0;k<G.cols*G.rows;k++){ const x=gx+(k%G.cols)*s, y=gy+Math.floor(k/G.cols)*s; rrect(ctx,x+s*.04,y+s*.04,s*.92,s*.92,s*.08); ctx.fillStyle='#32333A'; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=lw; ctx.stroke(); }
    const L=[-.6,-.8];
    sortByTea(recs).forEach((rec,k)=>{ const cx=gx+(k%G.cols+.5)*s, cy=gy+(Math.floor(k/G.cols)+.5)*s, R=s*.4*(.82+.2*rec.i), kind=KIND[rec.type];
      const O=gemOutline(kind,R), T=O.map(p=>[p[0]*.55,p[1]*.55]), n=O.length, base=H.pastel(rec.tea,0,1.2), F=rec.fl;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(kind==='emerald'||kind==='round'?0:(H.hash(rec.id)%100/100-.5)*.6);
      const facet=(pts,c,l)=>{ ctx.beginPath(); pts.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fillStyle=C(l>0?H.shade(c,l):H.shade(c,l)); ctx.fill(); };
      for(let j=0;j<n;j++){ const a=O[j], b=O[(j+1)%n], ta=T[j], tb=T[(j+1)%n], m=[(a[0]+b[0])/2,(a[1]+b[1])/2], nl=Math.hypot(m[0],m[1])||1, d=(m[0]*L[0]+m[1]*L[1])/nl;
        const c=F.length&&j%3===1?H.mix(base,H.pastel(F[(j>>1)%F.length].rgb,0,1.2),.75):base;
        facet([a,b,tb],c,d*.38+.06); facet([a,tb,ta],c,d*.38-.12); }
      const tg=ctx.createLinearGradient(-R*.5,-R*.5,R*.5,R*.5); tg.addColorStop(0,C(H.shade(base,.35))); tg.addColorStop(1,C(H.shade(base,-.05)));
      ctx.beginPath(); T.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fillStyle=tg; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=Math.max(.4,lw*.6); ctx.stroke();
      ctx.beginPath(); for(let j=0;j<n;j++){ ctx.moveTo(O[j][0],O[j][1]); ctx.lineTo(T[j][0],T[j][1]); } ctx.stroke();
      ctx.beginPath(); O.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.strokeStyle=C(H.shade(base,-.5),.6); ctx.stroke();
      ctx.restore();
      if(rec.stars>=3){ const sx=cx-R*.35, sy=cy-R*.4, q=R*.4; ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(sx,sy-q); ctx.quadraticCurveTo(sx,sy,sx+q*.7,sy); ctx.quadraticCurveTo(sx,sy,sx,sy+q); ctx.quadraticCurveTo(sx,sy,sx-q*.7,sy); ctx.quadraticCurveTo(sx,sy,sx,sy-q); ctx.fill(); }
    });
  }});

/* =========================================================
   s410 캡슐 블리스터
   ========================================================= */
GALLERY.add({ id:'s410', name:'캡슐 블리스터', cat:'오브젝트',
  desc:'열 잔마다 한 장씩 채워지는 알약 판이에요. 캡슐 한쪽은 찻물 색, 다른 쪽은 풍미 색이고, 아직 마시지 않은 칸은 비어 있어요.',
  bg:'#EDEFF0',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), S=Math.ceil(N/10), pad=W*.05;
    const G=fitGrid(S,W-2*pad,W-2*pad,.62), sw=G.w*.9, sh=G.h*.9, gx=(W-G.cols*G.w)/2, gy=(W-G.rows*G.h)/2;
    for(let s=0;s<S;s++){ const cx=gx+(s%G.cols+.5)*G.w, cy=gy+(Math.floor(s/G.cols)+.5)*G.h, x0=cx-sw/2, y0=cy-sh/2;
      rrect(ctx,x0,y0,sw,sh,sw*.06); ctx.fillStyle='#DCE0E3'; ctx.fill(); ctx.strokeStyle='rgba(90,100,110,.3)'; ctx.lineWidth=lw; ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.setLineDash([lw*3,lw*2]); ctx.beginPath(); ctx.moveTo(cx,y0+sh*.13); ctx.lineTo(cx,y0+sh*.97); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='rgba(80,90,100,.5)'; ctx.font=`600 ${Math.max(5,sw*.075)}px ${FONT}`; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText('TEA '+String(s+1).padStart(2,'0'),x0+sw*.08,y0+sh*.065);
      for(let k=0;k<10;k++){ const col=k%2, row=Math.floor(k/2), px=x0+sw*(col?.74:.26), py=y0+sh*(.2+row*.165), pw=sw*.4, ph=sh*.11, rec=recs[s*10+k];
        rrect(ctx,px-pw/2,py-ph/2,pw,ph,ph/2); ctx.fillStyle=rec?'rgba(255,255,255,.55)':'rgba(255,255,255,.25)'; ctx.fill(); ctx.strokeStyle='rgba(120,130,140,.35)'; ctx.lineWidth=lw*.8; ctx.stroke();
        if(!rec){ ctx.strokeStyle='rgba(120,130,140,.35)'; ctx.beginPath(); ctx.moveTo(px-pw*.3,py-ph*.1); ctx.lineTo(px-pw*.1,py+ph*.15); ctx.lineTo(px+pw*.05,py-ph*.12); ctx.lineTo(px+pw*.28,py+ph*.1); ctx.stroke(); continue; }
        const cw=pw*.84, chh=ph*.7, a=pastelC(rec.tea), b=pastelC(fl0(rec));
        ctx.save(); rrect(ctx,px-cw/2,py-chh/2,cw,chh,chh/2); ctx.clip();
        ctx.fillStyle=C(a); ctx.fillRect(px-cw/2,py-chh/2,cw*.52,chh); ctx.fillStyle=C(b); ctx.fillRect(px+cw*.02,py-chh/2,cw*.5,chh);
        rec.fl.slice(1).forEach((q,j)=>{ for(let d=0;d<3;d++){ ctx.beginPath(); ctx.arc(px+cw*(.12+.1*d+.04*j),py+chh*(j?.18:-.12),Math.max(.5,chh*.08),0,PI2); ctx.fillStyle=C(H.pastel(q.rgb,0,1.1)); ctx.fill(); } });
        ctx.fillStyle='rgba(255,255,255,.45)'; rrect(ctx,px-cw*.4,py-chh*.36,cw*.8,chh*.14,chh*.07); ctx.fill();
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(px+cw*.02,py-chh/2); ctx.lineTo(px+cw*.02,py+chh/2); ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=lw*.7; ctx.stroke();
        rrect(ctx,px-cw/2,py-chh/2,cw,chh,chh/2); ctx.strokeStyle='rgba(0,0,0,.14)'; ctx.stroke(); }
    }
    function pastelC(c){ return H.pastel(c,.06,1.1); }
  }});

/* =========================================================
   s411 종이 오리기 콜라주
   ========================================================= */
GALLERY.add({ id:'s411', name:'종이 오리기', cat:'그래픽',
  desc:'마티스의 종이 오리기처럼, 풍미 색 색종이 위에 찻물 색 종이를 해초·잎·별 모양으로 오려 붙였어요. 향·맛이 좋았던 차일수록 오른쪽 위에 붙어요.',
  bg:'#F3EEE4',
  render(ctx,W,recs,H){
    const N=recs.length, R0=unit(W,N,N<20?.3:.4);
    const items=relax(place(recs,W,R0,{margin:W*.03,size:r=>.82+.3*r.i}),{overlap:.08,box:[0,0,W,W]});
    for(const it of items){ const rec=it.rec, r=H.rng(H.hash(rec.id+'m')), kind=H.hash(rec.id)%3, R=it.r, rot=(r()-.5)*.3;
      const card=rec.fl[0]?H.pastel(rec.fl[0].rgb,.1,1.05):H.pastel(rec.tea,.6,1), w=R*1.75*(.85+r()*.3), h=R*3.1/ (w/R);
      ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(rot);
      ctx.fillStyle=C(card); ctx.fillRect(-w/2,-h/2,w,h);
      ctx.fillStyle=C(H.pastel(rec.tea,0,1.2)); const s=Math.min(w,h)*.46, ph=r()*6;
      if(kind===0){ const k=5+Math.floor(r()*4); polar(ctx,0,0,s,a=>.42+.58*Math.pow(Math.abs(Math.cos(a*k/2+ph)),.7),120,0); ctx.fill(); }
      else if(kind===1){ ctx.rotate((r()-.5)*.8); const lb=4+Math.floor(r()*2), hh=Math.max(w,h)*.42, ww=s*.75; ctx.beginPath(); ctx.moveTo(0,-hh);
        for(let j=0;j<lb;j++){ const y=-hh+2*hh*j/lb; ctx.quadraticCurveTo(ww*1.3,y+hh/lb,ww*.12,y+2*hh/lb); }
        for(let j=lb;j>0;j--){ const y=-hh+2*hh*j/lb; ctx.quadraticCurveTo(-ww*1.3,y-hh/lb,-ww*.12,y-2*hh/lb); }
        ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); const k=4+Math.floor(r()*3); for(let j=0;j<k*2;j++){ const a=ph+j*PI/k, q=j%2?s*.4:s*1.05; ctx.lineTo(Math.cos(a)*q,Math.sin(a)*q); } ctx.closePath(); ctx.fill(); }
      ctx.restore();
      rec.fl.slice(1).forEach((q,k)=>{ const a=r()*PI2, d=R*(1.05+r()*.3), z=R*(.12+.1*q.w); ctx.fillStyle=C(H.pastel(q.rgb,0,1.15)); ctx.beginPath();
        if(k) ctx.arc(it.x+Math.cos(a)*d,it.y+Math.sin(a)*d,z,0,PI2); else ctx.ellipse(it.x+Math.cos(a)*d,it.y+Math.sin(a)*d,z*1.6,z*.6,a,0,PI2); ctx.fill(); });
    }
    H.grain(ctx,W,.05);
  }});

/* =========================================================
   s412 리소 포스터
   ========================================================= */
GALLERY.add({ id:'s412', name:'리소 포스터', cat:'그래픽',
  desc:'리소그래프로 찍은 포스터예요. 기록마다 찻물 색 망점 해가 하나씩 찍히고, 풍미 색 판이 살짝 어긋나 겹쳐 찍혀요.',
  bg:'#F2EEE6',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), R0=unit(W,N,N<20?.3:.42), sp=W/105;
    const items=relax(place(recs,W,R0,{margin:W*.05,size:r=>.8+.35*r.i}),{overlap:.06,box:[W*.02,W*.02,W*.98,W*.98]});
    const layer=(ang,colFn,offFn,scale,pow)=>{ const e1=[Math.cos(ang),Math.sin(ang)], e2=[-Math.sin(ang),Math.cos(ang)];
      for(const it of items){ const c=colFn(it.rec); if(!c) continue; const o=offFn(it), cx=it.x+o[0], cy=it.y+o[1], R=it.r*scale, ci=(cx*e1[0]+cy*e1[1])/sp, cj=(cx*e2[0]+cy*e2[1])/sp, n=Math.ceil(R/sp)+1;
        ctx.fillStyle=C(c); ctx.beginPath();
        for(let i=Math.floor(ci-n);i<=ci+n;i++) for(let j=Math.floor(cj-n);j<=cj+n;j++){ const x=(i*e1[0]+j*e2[0])*sp, y=(i*e1[1]+j*e2[1])*sp, d=Math.hypot(x-cx,y-cy)/R; if(d>=1) continue;
          const den=Math.pow(1-d*d,pow)*(.6+.4*it.rec.i), rad=sp*.62*Math.sqrt(den); if(rad<.25) continue; ctx.moveTo(x+rad,y); ctx.arc(x,y,rad,0,PI2); }
        ctx.fill(); } };
    ctx.save(); ctx.globalCompositeOperation='multiply';
    layer(.26,rec=>H.pastel(rec.tea,.06,1.25),()=>[0,0],1,.55);
    layer(1.05,rec=>rec.fl[0]?H.pastel(rec.fl[0].rgb,0,1.3):null,it=>[it.r*.3+W*.004,-it.r*.24-W*.003],.6,.9);
    layer(.65,rec=>rec.fl[1]?H.pastel(rec.fl[1].rgb,0,1.3):null,it=>[-it.r*.34,it.r*.3],.36,1.2);
    const ink=[.2,.33,.48];
    ctx.fillStyle=C(ink,.9); ctx.font=`800 ${Math.round(W*.04)}px ${FONT}`; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.fillText('TEA CANVAS',W*.05,W*.075);
    ctx.font=`600 ${Math.round(W*.022)}px ${FONT}`; ctx.textAlign='right'; ctx.fillText(`${N} CUPS · 2026`,W*.95,W*.955);
    ctx.restore();
    H.grain(ctx,W,.07);
  }});

/* =========================================================
   s413 바우하우스 타일
   ========================================================= */
GALLERY.add({ id:'s413', name:'바우하우스 타일', cat:'그래픽',
  desc:'기록 하나가 정사각 타일 하나예요. 바탕은 찻물 색, 도형은 풍미 색으로, 마신 순서대로 왼쪽 위부터 채워요.',
  bg:'#F1ECE2',
  render(ctx,W,recs,H){
    const N=recs.length, pad=W*.06, cols=Math.ceil(Math.sqrt(N)), rows=Math.ceil(N/cols), s=Math.min((W-2*pad)/cols,(W-2*pad)/rows), gx=(W-cols*s)/2, gy=(W-rows*s)/2, g=Math.max(1,s*.04);
    recs.forEach((rec,k)=>{ const row=Math.floor(k/cols), inRow=row===rows-1?N-row*cols:cols, x=gx+(k%cols)*s+(cols-inRow)*s/2, y=gy+row*s;
      const bg=H.pastel(rec.tea,.12,1.05), F=rec.fl.map(q=>H.pastel(q.rgb,.02,1.12)), a=F[0]||H.shade(bg,-.3), b=F[1]||H.shade(bg,.6), c=F[2]||'#2B2A29';
      const X=x+g/2, Y=y+g/2, S=s-g, v=H.hash(rec.id)%8, rot=(H.hash(rec.id+'r')%4)*PI/2;
      ctx.save(); ctx.beginPath(); ctx.rect(X,Y,S,S); ctx.clip(); ctx.fillStyle=C(bg); ctx.fillRect(X,Y,S,S);
      ctx.translate(X+S/2,Y+S/2); ctx.rotate(rot); ctx.translate(-S/2,-S/2);
      const fc=col=>ctx.fillStyle=typeof col==='string'?col:C(col);
      if(v===0){ fc(a); ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,S,0,PI/2); ctx.fill(); fc(b); ctx.beginPath(); ctx.arc(S*.72,S*.72,S*.14,0,PI2); ctx.fill(); }
      else if(v===1){ fc(a); ctx.beginPath(); ctx.arc(S/2,S,S/2,PI,0); ctx.fill(); fc(b); ctx.fillRect(S*.35,S*.12,S*.3,S*.3); }
      else if(v===2){ fc(a); ctx.beginPath(); ctx.arc(S/2,S/2,S*.36,0,PI2); ctx.fill(); fc(b); ctx.beginPath(); ctx.arc(S/2,S/2,S*.36,-PI/2,PI/2); ctx.fill(); }
      else if(v===3){ fc(a); ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,S*.62,0,PI/2); ctx.fill(); fc(b); ctx.beginPath(); ctx.moveTo(S,S); ctx.arc(S,S,S*.62,PI,PI*1.5); ctx.fill(); }
      else if(v===4){ fc(a); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(S,0); ctx.lineTo(0,S); ctx.fill(); fc(b); ctx.beginPath(); ctx.arc(S*.7,S*.7,S*.16,0,PI2); ctx.fill(); }
      else if(v===5){ fc(a); for(let j=0;j<3;j++) ctx.fillRect(S*(.14+j*.26),0,S*.12,S); fc(b); ctx.beginPath(); ctx.arc(S/2,S/2,S*.2,0,PI2); ctx.fill(); }
      else if(v===6){ [a,b,a].forEach((col,j)=>{ fc(col); ctx.beginPath(); ctx.arc(S/2,S/2,S*(.42-j*.13),0,PI2); ctx.fill(); }); }
      else { fc(a); ctx.beginPath(); ctx.arc(0,S/2,S/2,-PI/2,PI/2); ctx.fill(); fc(b); ctx.beginPath(); ctx.arc(S,S/2,S/2,PI/2,PI*1.5); ctx.fill(); }
      if(rec.stars>=3){ fc('#2B2A29'); ctx.beginPath(); ctx.arc(S*.84,S*.16,S*.055,0,PI2); ctx.fill(); }
      ctx.restore(); });
  }});

/* =========================================================
   s414 멤피스 패턴
   ========================================================= */
GALLERY.add({ id:'s414', name:'멤피스 패턴', cat:'그래픽',
  desc:'80년대 멤피스 디자인처럼 기록마다 도형·물결·지그재그가 하나씩 흩어져요. 면은 찻물 색, 무늬는 풍미 색이에요.',
  bg:'#F6F1E8',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), ink='#2F2B3A';
    { const r=H.rng(7); for(let k=0;k<140;k++){ const x=r()*W, y=r()*W, a=r()*PI; ctx.strokeStyle='rgba(47,43,58,.16)'; ctx.lineWidth=lw*1.2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(a)*W*.01,y+Math.sin(a)*W*.01); ctx.stroke(); } }
    const R0=unit(W,N,N<20?.24:.36);
    const items=relax(place(recs,W,R0,{margin:W*.03,size:r=>.8+.35*r.i}),{overlap:.1,box:[0,0,W,W]});
    ctx.lineJoin='round'; ctx.lineCap='round';
    for(const it of items){ const rec=it.rec, r=H.rng(H.hash(rec.id+'mp')), v=H.hash(rec.id)%6, R=it.r, rot=r()*PI2, F=rec.fl.map(q=>H.pastel(q.rgb,.02,1.12)), fill=H.pastel(rec.tea,.05,1.1), p1=F[0]||H.shade(fill,-.3);
      ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(rot); ctx.lineWidth=Math.max(lw,R*.07); ctx.strokeStyle=ink;
      const pattern=(fn)=>{ ctx.save(); fn(); ctx.clip(); ctx.fillStyle=C(fill); ctx.fillRect(-R*1.5,-R*1.5,R*3,R*3);
        if(F.length){ ctx.fillStyle=C(p1); const st=R*.32; if(r()<.5){ for(let y=-R*1.5;y<R*1.5;y+=st) for(let x=-R*1.5;x<R*1.5;x+=st){ ctx.beginPath(); ctx.arc(x+(Math.round(y/st)%2)*st/2,y,R*.06,0,PI2); ctx.fill(); } }
          else { for(let x=-R*1.5;x<R*1.5;x+=st) ctx.fillRect(x,-R*1.5,st*.38,R*3); } }
        ctx.restore(); fn(); ctx.stroke(); };
      if(v===0) pattern(()=>{ ctx.beginPath(); ctx.moveTo(0,-R); ctx.lineTo(R*.95,R*.7); ctx.lineTo(-R*.95,R*.7); ctx.closePath(); });
      else if(v===1) pattern(()=>{ ctx.beginPath(); ctx.arc(0,0,R*.85,0,PI2); });
      else if(v===2){ ctx.beginPath(); for(let t=0;t<=40;t++){ const x=-R+2*R*t/40; ctx.lineTo(x,Math.sin(t/40*PI*3)*R*.35); } ctx.strokeStyle=C(fill); ctx.lineWidth=R*.28; ctx.stroke(); ctx.strokeStyle=C(p1); ctx.lineWidth=R*.08; ctx.stroke(); }
      else if(v===3){ ctx.beginPath(); for(let t=0;t<=6;t++) ctx.lineTo(-R+2*R*t/6,(t%2?-1:1)*R*.3); ctx.strokeStyle=ink; ctx.lineWidth=R*.3; ctx.stroke(); ctx.strokeStyle=C(fill); ctx.lineWidth=R*.18; ctx.stroke(); }
      else if(v===4) pattern(()=>{ ctx.beginPath(); ctx.arc(0,R*.25,R*.95,PI,0); ctx.closePath(); });
      else pattern(()=>{ ctx.beginPath(); ctx.rect(-R*.75,-R*.75,R*1.5,R*1.5); });
      if(F[1]){ ctx.beginPath(); ctx.arc(R*.85,-R*.75,R*.16,0,PI2); ctx.fillStyle=C(F[1]); ctx.fill(); ctx.lineWidth=Math.max(lw*.8,R*.05); ctx.strokeStyle=ink; ctx.stroke(); }
      ctx.restore(); }
  }});

/* =========================================================
   s415 스테인드글라스
   ========================================================= */
function clipHP(poly,nx,ny,c){ // n·p <= c 쪽만 남김
  const out=[]; for(let i=0;i<poly.length;i++){ const a=poly[i], b=poly[(i+1)%poly.length], da=nx*a[0]+ny*a[1]-c, db=nx*b[0]+ny*b[1]-c;
    if(da<=0) out.push(a); if((da<0)!==(db<0)&&da!==db){ const t=da/(da-db); out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]); } } return out; }
GALLERY.add({ id:'s415', name:'스테인드글라스', cat:'그래픽',
  desc:'아치 창의 유리 한 조각이 기록 한 잔이에요. 조각은 찻물 색과 풍미 색으로 다시 나뉘고, 향·맛이 좋은 차일수록 창의 오른쪽 위에 박혀요.',
  bg:'#2C2927',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), x0=W*.14, x1=W*.86, y0=W*.06, y1=W*.95, aw=x1-x0, ar=aw/2, yA=y0+ar;
    const arch=()=>{ ctx.beginPath(); ctx.moveTo(x0,y1); ctx.lineTo(x0,yA); ctx.arc(W/2,yA,ar,PI,0); ctx.lineTo(x1,y1); ctx.closePath(); };
    const R0=Math.sqrt(aw*(y1-y0)*.5/(N*PI));
    const items=relax(recs.map(rec=>{ const x=x0+R0*.5+rec.x*(aw-R0), y=y0+R0*.5+rec.y*(y1-y0-R0); return {rec,r:R0,x,y,ox:x,oy:y}; }),{box:[x0,y0,x1,y1],iters:60,pull:.02});
    // 아치 밖으로 나간 점은 안으로
    items.forEach(it=>{ if(it.y<yA){ const dx=it.x-W/2, dy=it.y-yA, d=Math.hypot(dx,dy), lim=ar-R0*.6; if(d>lim){ it.x=W/2+dx/d*lim; it.y=yA+dy/d*lim; } } });
    ctx.save(); arch(); ctx.fillStyle='#F4EFE6'; ctx.fill(); ctx.clip();
    const box=[[x0-5,y0-5],[x1+5,y0-5],[x1+5,y1+5],[x0-5,y1+5]], lead=Math.max(1.2,W*.0075);
    items.forEach((A,i)=>{ let poly=box;
      for(let j=0;j<items.length&&poly.length;j++){ if(j===i) continue; const B=items[j], nx=B.x-A.x, ny=B.y-A.y; poly=clipHP(poly,nx,ny,nx*(A.x+B.x)/2+ny*(A.y+B.y)/2); }
      if(poly.length<3) return; const rec=A.rec, cols=rec.colors, k=cols.length, a0=(H.hash(rec.id)%628)/100, pieces=[];
      if(k===1) pieces.push([poly,cols[0].rgb]);
      else for(let p=0;p<k;p++){ const s=a0+p*PI2/k, e=a0+(p+1)*PI2/k; let q=clipHP(poly,-Math.sin(s),Math.cos(s),-Math.sin(s)*A.x+Math.cos(s)*A.y);
        q=clipHP(q,-Math.sin(e+PI),Math.cos(e+PI),-Math.sin(e+PI)*A.x+Math.cos(e+PI)*A.y); if(k===2) q=clipHP(poly,-Math.sin(s),Math.cos(s),-Math.sin(s)*A.x+Math.cos(s)*A.y);
        if(q.length>2) pieces.push([q,cols[p].rgb]); }
      pieces.forEach(([q,c])=>{ ctx.beginPath(); q.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath();
        const cc=H.pastel(c,.08,1.15), g=ctx.createLinearGradient(A.x-R0,A.y-R0,A.x+R0,A.y+R0); g.addColorStop(0,C(H.shade(cc,.3))); g.addColorStop(1,C(H.shade(cc,-.08)));
        ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#34302D'; ctx.lineWidth=lead*.55; ctx.lineJoin='round'; ctx.stroke(); });
      ctx.beginPath(); poly.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.strokeStyle='#34302D'; ctx.lineWidth=lead; ctx.stroke();
    });
    const glow=ctx.createRadialGradient(W/2,y0+ar*.6,0,W/2,y0+ar*.6,W*.7); glow.addColorStop(0,'rgba(255,250,235,.22)'); glow.addColorStop(1,'rgba(255,250,235,0)'); ctx.fillStyle=glow; ctx.fillRect(0,0,W,W);
    H.grain(ctx,W,.06);
    ctx.restore();
    arch(); ctx.strokeStyle='#4A4440'; ctx.lineWidth=W*.018; ctx.stroke(); arch(); ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=lw; ctx.stroke();
  }});

/* =========================================================
   s416 테라조 바닥
   ========================================================= */
GALLERY.add({ id:'s416', name:'테라조', cat:'그래픽',
  desc:'기록마다 찻물 색 큰 조각과 풍미 색 작은 조각이 박힌 테라조 바닥이에요. 향·맛이 좋았던 차는 오른쪽 위에 박혀요.',
  bg:'#ECE8E0',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), r=H.rng(11);
    const all=recs.flatMap(x=>x.colors.map(c=>c.rgb));
    for(let k=0;k<2200;k++){ const x=r()*W, y=r()*W, s=W*(.002+r()*.004); const c=r()<.55?[.55+r()*.3,.53+r()*.3,.5+r()*.3]:H.pastel(all[Math.floor(r()*all.length)],.1,1); ctx.fillStyle=C(c,.75); ctx.fillRect(x,y,s,s*(.6+r()*.6)); }
    const R0=unit(W,N,N<20?.2:.34);
    const items=relax(place(recs,W,R0,{margin:W*.01,size:q=>.75+.4*q.i}),{overlap:-.12,box:[-W*.02,-W*.02,W*1.02,W*1.02]});
    const chip=(cx,cy,R,c,seed)=>{ const q=H.rng(seed), n=5+Math.floor(q()*4), a0=q()*PI2, pts=[];
      for(let k=0;k<n;k++){ const a=a0+k/n*PI2+(q()-.5)*.5, d=R*(.6+q()*.45); pts.push([cx+Math.cos(a)*d,cy+Math.sin(a)*d*(.75+q()*.3)]); }
      ctx.beginPath(); pts.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fillStyle=C(c); ctx.fill(); };
    for(const it of items){ const rec=it.rec, q=H.rng(H.hash(rec.id+'tz'));
      for(let k=0;k<5;k++){ const a=q()*PI2, d=it.r*(1.2+q()*1.6); chip(it.x+Math.cos(a)*d,it.y+Math.sin(a)*d,it.r*(.1+q()*.14),H.pastel(rec.tea,.12,1),H.hash(rec.id+'s'+k)); }
      chip(it.x,it.y,it.r*.9,H.pastel(rec.tea,.05,1.08),H.hash(rec.id));
      rec.fl.concat(rec.fl).forEach((f,k)=>{ const a=q()*PI2, d=it.r*(1.05+q()*.8); chip(it.x+Math.cos(a)*d,it.y+Math.sin(a)*d,it.r*(.22+.25*f.w),H.pastel(f.rgb,.03,1.1),H.hash(rec.id+k)); }); }
    H.grain(ctx,W,.05);
  }});

/* =========================================================
   s417 과일 단면
   ========================================================= */
GALLERY.add({ id:'s417', name:'과일 단면', cat:'오브젝트',
  desc:'잘라 놓은 과일 단면이에요. 과육은 찻물 색, 껍질과 씨는 풍미 색이고, 진한 차일수록 큼직하게 잘려요.',
  bg:'#F5F1EA',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), R0=unit(W,N,N<20?.32:.48);
    const items=relax(place(recs,W,R0,{margin:W*.015,size:r=>.75+.4*r.i}),{overlap:.03,box:[0,0,W,W],iters:90});
    for(const it of items){ const rec=it.rec, R=it.r, q=H.rng(H.hash(rec.id+'f')), rind=H.pastel(fl0(rec),.02,1.1), flesh=H.pastel(rec.tea,.1,1.1), seed=rec.fl[1]?H.shade(H.pastel(rec.fl[1].rgb,0,1.1),-.15):H.shade(rind,-.35), rot=q()*PI2;
      const kiwi=rec.type==='dark'||rec.type==='herb'||rec.type==='green'&&H.hash(rec.id)%2;
      ctx.beginPath(); ctx.arc(it.x,it.y,R,0,PI2); ctx.fillStyle=C(rind); ctx.fill();
      ctx.beginPath(); ctx.arc(it.x,it.y,R*.9,0,PI2); ctx.fillStyle='#FBF8F0'; ctx.fill();
      if(!kiwi){ const n=8+Math.floor(q()*4), gap=Math.max(lw*.6,R*.045);
        for(let k=0;k<n;k++){ const a=rot+k/n*PI2, b=rot+(k+1)/n*PI2, ri=R*.12, ro=R*.84, m=(a+b)/2, dg=gap/ro, dgi=gap/ri;
          ctx.beginPath(); ctx.arc(it.x,it.y,ro,a+dg,b-dg); ctx.lineTo(it.x+Math.cos(m)*ri*1.4,it.y+Math.sin(m)*ri*1.4); ctx.closePath(); ctx.fillStyle=C(flesh); ctx.fill();
          if(R>W*.025){ ctx.strokeStyle=C(H.shade(flesh,.35),.7); ctx.lineWidth=Math.max(.4,R*.02); for(let s=0;s<3;s++){ const aa=a+(b-a)*(.3+.2*s); ctx.beginPath(); ctx.moveTo(it.x+Math.cos(aa)*R*.4,it.y+Math.sin(aa)*R*.4); ctx.lineTo(it.x+Math.cos(aa)*R*.72,it.y+Math.sin(aa)*R*.72); ctx.stroke(); } }
          if(rec.fl[1]&&k%3===0){ ctx.save(); ctx.translate(it.x+Math.cos(m)*R*.3,it.y+Math.sin(m)*R*.3); ctx.rotate(m); ctx.beginPath(); ctx.ellipse(0,0,R*.08,R*.04,0,0,PI2); ctx.fillStyle=C(seed); ctx.fill(); ctx.restore(); } } }
      else { ctx.beginPath(); ctx.arc(it.x,it.y,R*.86,0,PI2); ctx.fillStyle=C(flesh); ctx.fill();
        ctx.strokeStyle=C(H.shade(flesh,.4),.8); ctx.lineWidth=Math.max(.4,R*.02); for(let k=0;k<24;k++){ const a=rot+k/24*PI2; ctx.beginPath(); ctx.moveTo(it.x+Math.cos(a)*R*.3,it.y+Math.sin(a)*R*.3); ctx.lineTo(it.x+Math.cos(a)*R*.8,it.y+Math.sin(a)*R*.8); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(it.x,it.y,R*.26,R*.2,rot,0,PI2); ctx.fillStyle=C(H.shade(flesh,.55)); ctx.fill();
        for(let k=0;k<14;k++){ const a=rot+k/14*PI2; ctx.save(); ctx.translate(it.x+Math.cos(a)*R*.36,it.y+Math.sin(a)*R*.36); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0,0,R*.055,R*.025,0,0,PI2); ctx.fillStyle=C(seed); ctx.fill(); ctx.restore(); } }
      ctx.beginPath(); ctx.arc(it.x,it.y,R,0,PI2); ctx.strokeStyle=C(H.shade(rind,-.3),.35); ctx.lineWidth=lw*.7; ctx.stroke();
    }
  }});

/* =========================================================
   s418 컬러 팬덱
   ========================================================= */
GALLERY.add({ id:'s418', name:'컬러 팬덱', cat:'그래픽',
  desc:'페인트 색상견본 팬덱처럼, 기록 하나가 날개 한 장이에요. 날개 끝부터 찻물 색, 풍미 색 칩이 이어지고 차 종류 순서로 펼쳐져요.',
  bg:'#F4F1EC',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), px=W/2, py=W*.76, L=W*.5, bw=W*.095, span=PI*.8;
    const rs=sortByTea(recs);
    const mid=(N-1)/2, order=rs.map((_,k)=>k).sort((a,b)=>Math.abs(b-mid)-Math.abs(a-mid));
    order.forEach(k=>{ const rec=rs[k], ang=-span/2+span*(N===1?.5:k/(N-1));
      ctx.save(); ctx.translate(px,py); ctx.rotate(ang);
      rrect(ctx,-bw/2,-L,bw,L+W*.05,bw*.12); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(60,50,40,.16)'; ctx.lineWidth=lw*.8; ctx.stroke();
      const cs=[rec.tea,...rec.fl.map(f=>f.rgb)], ch=L*.19, g=bw*.07;
      cs.forEach((c,j)=>{ const y=-L+g+j*(ch+g*.6); rrect(ctx,-bw/2+g,y,bw-2*g,ch,bw*.05); ctx.fillStyle=C(H.pastel(c,j?.04:.02,1.08)); ctx.fill(); });
      for(let j=cs.length;j<4;j++){ const y=-L+g+j*(ch+g*.6); rrect(ctx,-bw/2+g,y,bw-2*g,ch,bw*.05); ctx.fillStyle=C(H.pastel(rec.tea,.55+j*.1,1)); ctx.fill(); }
      ctx.restore(); });
    ctx.beginPath(); ctx.arc(px,py,W*.022,0,PI2); ctx.fillStyle='#CFCBC4'; ctx.fill(); ctx.strokeStyle='rgba(60,50,40,.35)'; ctx.lineWidth=lw; ctx.stroke();
    ctx.beginPath(); ctx.arc(px,py,W*.009,0,PI2); ctx.fillStyle='#A9A49C'; ctx.fill();
    ctx.fillStyle='rgba(60,50,40,.55)'; ctx.font=`600 ${Math.round(W*.026)}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText(`TEA CANVAS · ${N} COLORS`,W/2,W*.965);
  }});

/* =========================================================
   s419 찻집 영수증
   ========================================================= */
GALLERY.add({ id:'s419', name:'찻집 영수증', cat:'오브젝트',
  desc:'마신 차를 한 줄씩 적은 영수증이에요. 줄마다 날짜·차 이름·색 칩·별점이 찍히고, 맨 아래 바코드는 그 영수증 속 찻물 색이에요.',
  bg:'#E8E4DC',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W), K=N<=30?1:N<=66?2:3, per=Math.ceil(N/K);
    const rw=K===1?W*.56:K===2?W*.45:W*.3, head=W*.13, foot=W*.12, maxH=W*.92, rowH=Math.min(W*.05,(maxH-head-foot)/per), rh=head+foot+rowH*per;
    for(let k=0;k<K;k++){ const rs=recs.slice(k*per,(k+1)*per), cx=W*(K===1?.5:K===2?(.29+.42*k):(.17+.33*k)), top=(W-rh)/2+(K>1?(k%2?W*.015:-W*.01):0), rot=K===1?-.02:(k-(K-1)/2)*.025, x0=-rw/2;
      ctx.save(); ctx.translate(cx,W/2); ctx.rotate(rot); ctx.translate(0,-W/2);
      const zz=W*.012, nz=Math.round(rw/zz);
      ctx.beginPath(); ctx.moveTo(x0,top); for(let j=0;j<=nz;j++) ctx.lineTo(x0+j*rw/nz,top+(j%2?zz*.5:0)); const yb=top+rh; ctx.lineTo(x0+rw,yb); for(let j=nz;j>=0;j--) ctx.lineTo(x0+j*rw/nz,yb-(j%2?zz*.5:0)); ctx.closePath();
      ctx.fillStyle='#FFFEFA'; ctx.fill(); ctx.strokeStyle='rgba(70,60,50,.18)'; ctx.lineWidth=lw*.8; ctx.stroke();
      const ink='rgba(50,45,40,.82)', fs=Math.max(4,rowH*.56), pd=rw*.08;
      ctx.fillStyle=ink; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`800 ${Math.round(W*.034)}px ${FONT}`; ctx.fillText('TEA CANVAS',0,top+head*.38);
      ctx.font=`${Math.round(W*.02)}px ${FONT}`; ctx.fillStyle='rgba(50,45,40,.55)'; ctx.fillText(`No.${String(k+1).padStart(3,'0')} · 찻자리 기록`,0,top+head*.62);
      const dash=y=>{ ctx.setLineDash([lw*2.5,lw*2]); ctx.strokeStyle='rgba(50,45,40,.4)'; ctx.lineWidth=lw*.8; ctx.beginPath(); ctx.moveTo(x0+pd,y); ctx.lineTo(-x0-pd,y); ctx.stroke(); ctx.setLineDash([]); };
      dash(top+head*.86);
      rs.forEach((rec,j)=>{ const y=top+head+rowH*(j+.5), d=rec.date, sq=rowH*.55;
        ctx.fillStyle=ink; ctx.font=`${fs}px ${FONT}`; ctx.textAlign='left';
        ctx.fillText(`${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`,x0+pd,y);
        if(rw>W*.3) ctx.fillText(rec.teaLabel,x0+pd+fs*3.1,y);
        const cx0=x0+rw*(rw>W*.3?.55:.42); rec.colors.forEach((c,q)=>{ ctx.fillStyle=C(H.pastel(c.rgb,.02,1.1)); ctx.fillRect(cx0+q*sq*1.15,y-sq/2,sq,sq); });
        ctx.fillStyle=ink; for(let s=0;s<3;s++){ ctx.beginPath(); ctx.arc(-x0-pd-s*sq*.9,y,sq*.22,0,PI2); s<rec.stars?ctx.fill():(ctx.strokeStyle='rgba(50,45,40,.4)',ctx.lineWidth=lw*.6,ctx.stroke()); } });
      const fy=top+head+rowH*rs.length; dash(fy+foot*.12);
      ctx.fillStyle=ink; ctx.font=`700 ${Math.round(W*.022)}px ${FONT}`; ctx.textAlign='left'; ctx.fillText('합계',x0+pd,fy+foot*.3); ctx.textAlign='right'; ctx.fillText(`${rs.length}잔`,-x0-pd,fy+foot*.3);
      const bx0=x0+pd, bw=rw-2*pd, tw=rs.reduce((s,r)=>s+.4+r.i,0); let bx=bx0;
      rs.forEach(rec=>{ const w=bw*(.4+rec.i)/tw; ctx.fillStyle=C(H.pastel(rec.tea,0,1.15)); ctx.fillRect(bx,fy+foot*.48,w*.7,foot*.36); bx+=w; });
      ctx.restore(); }
  }});

/* =========================================================
   s420 에나멜 핀
   ========================================================= */
const PIN={
  green:c=>{ c.beginPath(); c.moveTo(0,-1); c.quadraticCurveTo(1.05,-.25,0,1); c.quadraticCurveTo(-1.05,-.25,0,-1); c.closePath(); },
  white:c=>{ c.beginPath(); c.moveTo(-.85,-.5); c.lineTo(.62,-.5); c.bezierCurveTo(.62,.2,.4,.62,-.11,.62); c.bezierCurveTo(-.62,.62,-.85,.2,-.85,-.5); c.closePath(); c.moveTo(.6,-.32); c.arc(.6,-.05,.27,-PI/2,PI/2); c.lineTo(.56,.12); c.arc(.6,-.05,.13,PI/2,-PI/2,true); c.closePath(); },
  oolong:c=>{ c.beginPath(); c.moveTo(0,-1.05); c.bezierCurveTo(.3,-.6,.72,-.2,.72,.28); c.arc(0,.28,.72,0,PI); c.bezierCurveTo(-.72,-.2,-.3,-.6,0,-1.05); c.closePath(); },
  black:c=>{ c.beginPath(); c.moveTo(0,.92); c.bezierCurveTo(-.4,.6,-1,.2,-.95,-.32); c.bezierCurveTo(-.9,-.82,-.25,-.95,0,-.48); c.bezierCurveTo(.25,-.95,.9,-.82,.95,-.32); c.bezierCurveTo(1,.2,.4,.6,0,.92); c.closePath(); },
  dark:c=>{ c.beginPath(); for(let k=0;k<10;k++){ const a=-PI/2+k*PI/5, q=k%2?.48:1; c.lineTo(Math.cos(a)*q,Math.sin(a)*q+.06); } c.closePath(); },
  herb:c=>{ c.beginPath(); for(let k=0;k<=90;k++){ const a=k/90*PI2, r=.55+.45*Math.pow(Math.abs(Math.cos(2.5*a)),.8); c.lineTo(Math.cos(a-PI/2)*r,Math.sin(a-PI/2)*r); } c.closePath(); },
};
GALLERY.add({ id:'s420', name:'에나멜 핀', cat:'스티커',
  desc:'캔버스 천에 꽂은 에나멜 핀이에요. 모양은 차 종류(잎·찻잔·물방울·하트·별·꽃), 에나멜은 찻물 색, 아래쪽 칸은 풍미 색이에요.',
  bg:'#DDD7CB',
  render(ctx,W,recs,H){
    const N=recs.length, lw=LW(W);
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=Math.max(.5,lw*.8); const st=W/120;
    for(let k=0;k<W;k+=st){ ctx.beginPath(); ctx.moveTo(k,0); ctx.lineTo(k,W); ctx.stroke(); }
    ctx.strokeStyle='rgba(90,80,60,.06)'; for(let k=st/2;k<W;k+=st){ ctx.beginPath(); ctx.moveTo(0,k); ctx.lineTo(W,k); ctx.stroke(); }
    const R0=unit(W,N,N<20?.26:.4);
    const items=relax(place(recs,W,R0,{margin:W*.02,size:r=>.82+.3*r.i}),{overlap:.0,pad:W*.004,box:[0,0,W,W],iters:90});
    for(const it of items){ const rec=it.rec, R=it.r*.95, rot=(H.hash(rec.id+'p')%100/100-.5)*.7, shape=PIN[rec.type];
      ctx.save(); ctx.translate(it.x,it.y); ctx.rotate(rot); ctx.scale(R,R);
      const evn='evenodd';
      shape(ctx); ctx.lineJoin='round'; ctx.strokeStyle='#A9894A'; ctx.lineWidth=.2; ctx.stroke();
      shape(ctx); ctx.fillStyle=C(H.pastel(rec.tea,.04,1.12)); ctx.fill(evn);
      ctx.save(); shape(ctx); ctx.clip(evn);
      const F=rec.fl; let y=.22; const tot=F.reduce((s,q)=>s+q.w,0)||1;
      F.forEach(q=>{ const h=.85*q.w/tot; ctx.fillStyle=C(H.pastel(q.rgb,.03,1.12)); ctx.fillRect(-1.5,y,3,h+.01); ctx.fillStyle='#E1C57D'; ctx.fillRect(-1.5,y-.03,3,.06); y+=h; });
      ctx.restore();
      if(rec.type==='green'){ ctx.beginPath(); ctx.moveTo(0,-.8); ctx.lineTo(0,.85); ctx.strokeStyle='#E1C57D'; ctx.lineWidth=.07; ctx.stroke(); }
      if(rec.type==='herb'){ ctx.beginPath(); ctx.arc(0,0,.2,0,PI2); ctx.fillStyle='#E1C57D'; ctx.fill(); }
      shape(ctx); ctx.strokeStyle='#E3C982'; ctx.lineWidth=.09; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-.32,-.3,.16,.06,-.7,0,PI2); ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fill();
      ctx.restore(); }
  }});
})();
