/* =========================================================
   수채화 시안 100종 — 하나의 수채화 엔진을 설정값만 바꿔 그린다
   설정: 크기·농도·가장자리 번짐·맺힘·입자·백런·바탕 물들임·색 나눔·배치·종이·기법
   ========================================================= */
(function(){
  const H=GALLERY.H;
  const {rng,hash,noise,fbm,ss,clamp,lin,gam,mix,pastel}=H;

  /* ---------- 기록 하나의 색 원판(3D 방울 겉면을 펼친 색) — 작게 계산해 캐시 ---------- */
  const DISC=new Map(), DN=28;
  function disc(rec){
    if(DISC.has(rec.id)) return DISC.get(rec.id);
    const a=new Float32Array(DN*DN*3);
    for(let j=0;j<DN;j++) for(let i=0;i<DN;i++){ const u=(i+.5)/DN*2-1, v=(j+.5)/DN*2-1, c=H.dropDiscColor(rec,u,v), k=(j*DN+i)*3; a[k]=c[0]; a[k+1]=c[1]; a[k+2]=c[2]; }
    DISC.set(rec.id,a); return a;
  }
  function discAt(d,u,v){ const x=clamp((u+1)/2*DN-.5,0,DN-1.001), y=clamp((v+1)/2*DN-.5,0,DN-1.001), i=x|0, j=y|0, fx=x-i, fy=y-j, o=[0,0,0];
    for(let c=0;c<3;c++){ const A=d[(j*DN+i)*3+c],B=d[(j*DN+i+1)*3+c],C=d[((j+1)*DN+i)*3+c],D=d[((j+1)*DN+i+1)*3+c]; o[c]=A*(1-fx)*(1-fy)+B*fx*(1-fy)+C*(1-fx)*fy+D*fx*fy; } return o; }

  /* ---------- 색을 고르는 방식 ---------- */
  function colorFn(rec,p,r){
    const cs=rec.colors, tot=cs.reduce((s,c)=>s+c.w,0);
    if(p.color==='disc'){ const d=disc(rec); return (u,v)=>discAt(d,u,v); }
    if(p.color==='blend'){ const m=[0,0,0]; cs.forEach(c=>c.rgb.forEach((v,i)=>m[i]+=lin(v)*c.w/tot)); const g=m.map(gam); return ()=>g; }
    if(p.color==='bands'){ const a0=p.bandAngle??r()*Math.PI, ca=Math.cos(a0), sa=Math.sin(a0), cut=[]; let acc=-1; cs.forEach(c=>{ acc+=2*c.w/tot; cut.push(acc); });
      const sw=p.bandSoft??.12;
      return (u,v)=>{ const t=u*ca+v*sa+(noise(u*3+7,v*3)-.5)*.25; const o=[0,0,0]; let ws=0; cs.forEach((c,k)=>{ const lo=k?cut[k-1]:-9, hi=cut[k]; const w=ss(lo-sw,lo+sw,t)*(1-ss(hi-sw,hi+sw,t))+1e-4; ws+=w; c.rgb.forEach((x,i)=>o[i]+=x*w); }); return o.map(x=>x/ws); }; }
    if(p.color==='rings'){ const order=p.ringTeaOut?[...cs.slice(1),cs[0]]:cs, cut=[]; let acc=0; order.forEach(c=>{ acc+=c.w/tot; cut.push(acc); }); const sw=p.ringSoft??.08;
      return (u,v)=>{ const t=Math.min(1,Math.hypot(u,v))+(noise(u*4,v*4)-.5)*.12; const o=[0,0,0]; let ws=0; order.forEach((c,k)=>{ const lo=k?cut[k-1]:-9, hi=cut[k]; const w=ss(lo-sw,lo+sw,t)*(1-ss(hi-sw,hi+sw,t))+1e-4; ws+=w; c.rgb.forEach((x,i)=>o[i]+=x*w); }); return o.map(x=>x/ws); }; }
    if(p.color==='edge'){ // 가운데는 찻물 색, 가장자리로 풍미 색이 번져 나감
      const fl=cs.slice(1), a0=r()*6.283;
      return (u,v)=>{ const rho=Math.min(1,Math.hypot(u,v)), ph=Math.atan2(v,u)-a0; let o=cs[0].rgb;
        if(fl.length){ const k=((ph/6.283%1)+1)%1*fl.length, i=Math.floor(k), f=k-i, A=fl[i%fl.length].rgb, B=fl[(i+1)%fl.length].rgb, e=mix(A,B,ss(.6,1,f)); o=mix(o,e,ss(.35,.95,rho)); } return o; }; }
    return ()=>cs[0].rgb;
  }

  /* ---------- 방울 하나를 수채 물감 자국으로 ---------- */
  function sprite(rec,R,p,seed){
    const r=rng(seed), P=Math.max(8,Math.ceil(R*2*(1+p.irr*1.6)+6)), c0=P/2;
    const cv=document.createElement('canvas'); cv.width=cv.height=P; const x=cv.getContext('2d'), im=x.createImageData(P,P), d=im.data;
    const col=colorFn(rec,p,r), s1=r()*50, s2=r()*50, el=p.elong||0, ea=r()*Math.PI, ce=Math.cos(ea), se=Math.sin(ea);
    const blooms=[]; for(let k=0;k<(p.bloom||0);k++){ const a=r()*6.283, dd=r()*.55; blooms.push([Math.cos(a)*dd,Math.sin(a)*dd,.18+r()*.28]); }
    const conc=p.conc*(.55+.45*rec.i), soft=p.soft??.05, dark=p.dark??.3, darkW=p.darkW??.12, gran=p.gran??.06, gf=p.granF??.35;
    for(let y=0;y<P;y++) for(let xx=0;xx<P;xx++){
      let dx=(xx-c0+.5)/R, dy=(y-c0+.5)/R;
      if(el){ const a=dx*ce+dy*se, b=-dx*se+dy*ce; dx=a/(1+el); dy=b; }
      const rho=Math.hypot(dx,dy), ph=Math.atan2(dy,dx);
      const er=1+p.irr*((fbm(Math.cos(ph)*1.5+s1,Math.sin(ph)*1.5+s2,3)-.5)*2)+p.irr*.35*(noise(ph*8+s1,s2)-.5);
      const a=ss(er,er-soft,rho); const k=(y*P+xx)*4; if(a<=0){ d[k+3]=0; continue; }
      let amt=conc*(1+dark*ss(er-darkW,er,rho));
      for(const [bx,by,br] of blooms){ const q=Math.hypot(dx-bx,dy-by); if(q<br+.05){ amt*=q<br?(.62+.38*ss(0,br,q)):1; amt*=1+.9*ss(br-.05,br,q)*(1-ss(br,br+.05,q)); } }
      amt*=1-gran*(noise(xx*gf+s1,y*gf+s2)-.5)*2-gran*.5*(noise(xx*gf*3,y*gf*3)-.5)*2;
      const u=clamp(dx/Math.max(.5,er),-1,1), v=clamp(dy/Math.max(.5,er),-1,1), cc0=col(u,v), c=p.lift?cc0.map(t=>t+(1-t)*p.lift):cc0, al=clamp(a*amt,0,.97);
      d[k]=c[0]*255; d[k+1]=c[1]*255; d[k+2]=c[2]*255; d[k+3]=al*255;
    }
    x.putImageData(im,0,0); return {cv,P};
  }

  /* ---------- 배치 ---------- */
  function layout(recs,W,p){
    const n=recs.length;
    if(p.layout==='grid'){ const m=Math.ceil(Math.sqrt(n)), g=W/(m+.6); return recs.map((r,i)=>[g*(.8+i%m),g*(.8+Math.floor(i/m))]); }
    if(p.layout==='spiral'){ const o=[...recs].map((r,i)=>[r,i]).sort((a,b)=>((1-a[0].x)+a[0].y)-((1-b[0].x)+b[0].y)), out=new Array(n), k=W*.42/Math.sqrt(Math.max(n,10));
      o.forEach(([r,i],j)=>{ const a=j*2.39996, rr=k*Math.sqrt(j+.6); out[i]=[W/2+Math.cos(a)*rr,W/2+Math.sin(a)*rr]; }); return out; }
    if(p.layout==='rows'){ const per=Math.ceil(Math.sqrt(n*1.6)), rows=Math.ceil(n/per), gx=W*.86/per, gy=W*.86/Math.max(rows,1); return recs.map((r,i)=>[W*.07+gx*(i%per+.5),W*.07+gy*(Math.floor(i/per)+.5)+(r.y-.5)*gy*.5]); }
    const pts=recs.map(r=>[r.x*W,r.y*W]);
    if(p.layout==='spread'){ // 실제 위치 근처를 지키면서 서로 밀어 캔버스를 채움
      const R0=W*(p.fill??.62)/Math.sqrt(n+4);
      for(let it=0;it<60;it++){ for(let i=0;i<n;i++){ let fx=(recs[i].x*W-pts[i][0])*.05, fy=(recs[i].y*W-pts[i][1])*.05;
        for(let j=0;j<n;j++){ if(i===j) continue; const dx=pts[i][0]-pts[j][0], dy=pts[i][1]-pts[j][1], dd=Math.hypot(dx,dy)+.01; if(dd<R0*2){ const f=(R0*2-dd)/dd*.25; fx+=dx*f; fy+=dy*f; } }
        pts[i][0]=clamp(pts[i][0]+fx,W*.06,W*.94); pts[i][1]=clamp(pts[i][1]+fy,W*.06,W*.94); } }
    }
    return pts;
  }

  /* ---------- 종이 ---------- */
  const PAPER={cold:'#F8F6F0',white:'#FBFBF9',cream:'#F5EEDF',hanji:'#F3EEE2',gray:'#E9E8E4',kraft:'#E4D6C0',ink:'#1E1D22'};
  function paperTex(ctx,W,p,seed){
    const t=p.tex??.5; if(!t) return;
    const n=Math.round(W/2), c=document.createElement('canvas'); c.width=c.height=n; const x=c.getContext('2d'), im=x.createImageData(n,n), d=im.data, s=seed%97;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ let v=.5+.5*(fbm(i*.06+s,j*.06,3)-.5)+.35*(noise(i*.5,j*.5)-.5);
      if(p.paper==='hanji') v+=.35*(noise(i*.04+s,j*.9)-.5)+.25*(noise(i*.9,j*.03+s)-.5);
      const g=clamp(.88+.24*(v-.5)*t*2,0,1)*255, k=(j*n+i)*4; d[k]=d[k+1]=d[k+2]=g; d[k+3]=255; }
    x.putImageData(im,0,0); ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=.55; ctx.drawImage(c,0,0,W,W); ctx.restore();
  }

  /* ---------- 그리기 ---------- */
  function render(ctx,W,recs,p){
    const n=recs.length, seed=hash(p.id), r=rng(seed);
    const dens=Math.pow(10/Math.max(10,n),p.shrink??.3);
    const baseR=W*p.size*dens;
    if(p.wash){ const F=H.field(recs,90,{spread:1.4}); const bg=H.hex2rgb(PAPER[p.paper]||PAPER.cold);
      ctx.save(); ctx.globalAlpha=p.wash; H.paintField(ctx,W,F,(c,a)=>mix(bg,pastel(c,.15,1.1),ss(0,.9,a)).map(v=>v*255),.02); ctx.restore(); }
    const pos=layout(recs,W,p), sprites=recs.map((rec,i)=>({rec,i,R:baseR*(.6+.55*rec.i)*(p.sizeVar?(1-p.sizeVar/2+p.sizeVar*r()):1)}));
    sprites.forEach(s=>s.sp=sprite(s.rec,s.R,p,seed+s.i*131));
    const dark=p.paper==='ink', glaze=p.blend==='glaze', blend=dark?'screen':glaze?'source-over':(p.blend||'multiply'), alpha=(p.alpha??(glaze?.78:.92))*(n>50?(p.dense??(glaze?.9:.82)):1);
    // 번짐(헤일로): 한 번에 흐려서 밑에 깐다
    if(p.halo){ const L=document.createElement('canvas'); L.width=L.height=W; const lx=L.getContext('2d');
      sprites.forEach((s,k)=>{ const [X,Y]=pos[k], sc=1+p.halo; lx.globalAlpha=.55; lx.drawImage(s.sp.cv,X-s.sp.P/2*sc,Y-s.sp.P/2*sc,s.sp.P*sc,s.sp.P*sc); });
      ctx.save(); ctx.filter=`blur(${Math.round(W*.012*(1+p.halo*2))}px)`; ctx.globalCompositeOperation=blend; ctx.globalAlpha=p.haloA??.5; ctx.drawImage(L,0,0); ctx.restore(); }
    ctx.save(); ctx.globalCompositeOperation=blend; ctx.globalAlpha=alpha;
    sprites.forEach((s,k)=>{ const [X,Y]=pos[k]; ctx.drawImage(s.sp.cv,X-s.sp.P/2,Y-s.sp.P/2); });
    ctx.restore();
    // 기법: 튀김 · 소금 · 연필 선
    if(p.splat){ ctx.save(); ctx.globalCompositeOperation=blend; sprites.forEach((s,k)=>{ const [X,Y]=pos[k], m=Math.round(p.splat*(2+s.rec.i*4));
      for(let q=0;q<m;q++){ const a=r()*6.283, dd=s.R*(1.1+r()*1.6), rr=Math.max(.6,W*.004*(.4+r())); const c=s.rec.colors[Math.floor(r()*s.rec.colors.length)].rgb;
        ctx.globalAlpha=.55+r()*.35; ctx.fillStyle=H.rgbStr(c); ctx.beginPath(); ctx.arc(X+Math.cos(a)*dd,Y+Math.sin(a)*dd,rr,0,6.283); ctx.fill(); } }); ctx.restore(); }
    if(p.salt){ ctx.save(); sprites.forEach((s,k)=>{ const [X,Y]=pos[k]; for(let q=0;q<Math.round(p.salt*s.R*.6);q++){ const a=r()*6.283, dd=Math.sqrt(r())*s.R*.85, rr=Math.max(.6,W*.0035*(.5+r()));
        const g=ctx.createRadialGradient(X+Math.cos(a)*dd,Y+Math.sin(a)*dd,0,X+Math.cos(a)*dd,Y+Math.sin(a)*dd,rr*2.4); g.addColorStop(0,'rgba(255,255,255,.75)'); g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(X+Math.cos(a)*dd,Y+Math.sin(a)*dd,rr*2.4,0,6.283); ctx.fill(); } }); ctx.restore(); }
    if(p.pencil){ ctx.save(); ctx.strokeStyle=dark?'rgba(255,255,255,.35)':'rgba(60,55,50,.38)'; ctx.lineWidth=Math.max(.6,W/700);
      sprites.forEach((s,k)=>{ const [X,Y]=pos[k], rr=s.R*(p.pencil), o=r()*6.283; ctx.beginPath(); for(let q=0;q<=40;q++){ const a=o+q/40*6.6, j=1+(noise(q*.3+k,k)-.5)*.12; ctx.lineTo(X+Math.cos(a)*rr*j,Y+Math.sin(a)*rr*j); } ctx.stroke(); }); ctx.restore(); }
    paperTex(ctx,W,p,seed);
    if(p.axes) H.axes(ctx,W,.07,p.axes>1,dark);
  }

  /* ---------- 100가지 설정 ---------- */
  const B={lift:.06,color:'disc',size:.085,conc:.75,irr:.08,soft:.04,dark:.35,darkW:.12,gran:.06,paper:'cold',tex:.5,layout:'spread',blend:'glaze',shrink:.3};
  const L=[];
  const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});
  // 1. 크기 × 농도 (기본 수채 방울)
  [['아주 작게','진하게',.045,.95,.25],['작게','보통',.06,.75,.28],['작게','연하게',.06,.45,.28],['중간','진하게',.085,.95,.3],['중간','보통',.085,.72,.3],['중간','연하게',.085,.45,.3],['크게','진하게',.12,.9,.34],['크게','보통',.12,.65,.34],['크게','연하게',.12,.4,.34],['아주 크게','아주 연하게',.17,.3,.4]]
    .forEach(([s,c,sz,cc,sh])=>add('크기 × 농도',`${s} · ${c}`,`3D 방울의 색을 펼쳐 찍은 기본 수채 방울이에요. 크기 ${s}, 농도 ${c}.`,{size:sz,conc:cc,shrink:sh}));
  // 2. 웨트 온 웨트
  [[.15,.4,.7,.085],[.22,.6,.6,.09],[.3,.9,.55,.095],[.4,1.2,.5,.1],[.2,.5,.85,.065],[.28,.8,.75,.075],[.35,1,.45,.12],[.5,1.4,.4,.13],[.25,.6,.6,.105,'cream'],[.3,.9,.65,.09,'hanji']]
    .forEach(([sf,h,cc,sz,pp],i)=>add('웨트 온 웨트',`번짐 ${['약','약','중','강','약','중','강','아주 강','중 · 크림 종이','중 · 한지'][i]}`,'젖은 종이에 떨어뜨린 것처럼 가장자리가 흐리게 퍼지고 이웃 방울과 섞여요.',{soft:sf,halo:h,haloA:.45+i*.03,conc:cc,size:sz,dark:.1,irr:.12,paper:pp||'cold'}));
  // 3. 가장자리 맺힘 (곱하기로 테두리 강조)
  [[.8,.1,.4],[1.2,.08,.35],[1.7,.06,.3],[2.4,.04,.22],[1,.18,.45],[1.5,.13,.35],[2,.09,.25],[3,.03,.18],[1.2,.1,.55],[1.8,.07,.28]]
    .forEach(([dk,dw,cc],i)=>add('가장자리 맺힘',`맺힘 ${dk<1.1?'약':dk<1.8?'중':'강'} · 테 ${dw>.12?'넓게':dw<.07?'가늘게':'보통'}`,'물이 마르며 안료가 가장자리로 몰려, 테두리가 진하고 속은 맑아요.',{dark:dk,darkW:dw,conc:cc,irr:.05+i*.01,size:.08+(i%4)*.012,blend:'multiply',alpha:.85,lift:0}));
  // 4. 입자 침전
  [['cold',.2,.35],['cold',.35,.3],['cold',.5,.25],['cream',.3,.25],['cream',.45,.5],['hanji',.3,.3],['hanji',.45,.2],['white',.25,.6],['gray',.35,.3],['kraft',.35,.35]]
    .forEach(([pp,g,gf],i)=>add('입자 침전',`${{cold:'수채 종이',cream:'크림 종이',hanji:'한지',white:'흰 종이',gray:'회색 종이',kraft:'크라프트지'}[pp]} · 입자 ${g<.3?'약':g<.42?'중':'강'}`,'안료 입자가 종이 결에 가라앉아 오돌토돌한 질감이 남아요.',{paper:pp,gran:g,granF:gf,tex:.7+(i%2)*.3,size:.09+(i%3)*.01,conc:.85}));
  // 5. 꽃물 번짐
  [[1,.75],[2,.75],[3,.7],[4,.65],[6,.6],[2,.95],[3,.5],[1,.5],[5,.8],[3,.85]]
    .forEach(([b,cc],i)=>add('꽃물 번짐',`백런 ${b}개 · ${cc>.8?'진하게':cc<.6?'연하게':'보통'}`,'마르는 중에 물이 다시 스며 콜리플라워 모양 테가 생겨요.',{bloom:b,conc:cc,dark:.5,size:.1+(i%3)*.012,irr:.12,blend:i%2?'glaze':'multiply',alpha:i%2?.8:.85}));
  // 6. 색 구역(반반 방울)
  [[.04,null,.09],[.1,null,.09],[.2,null,.09],[.1,0,.09],[.1,Math.PI/2,.09],[.07,Math.PI/4,.1],[.3,null,.11],[.1,null,.13],[.12,null,.065],[.06,null,.1]]
    .forEach(([sw,ang,sz],i)=>add('색 구역',`${['또렷한 경계','부드러운 경계','흐린 경계','가로 줄','세로 줄','사선 줄','물든 경계','크게','작게','맺힘 + 구역'][i]}`,'방울 안을 찻물 색과 풍미 색이 나눠 채우고, 경계만 번져요. 한 방울에 담긴 풍미가 또렷하게 보여요.',{color:'bands',bandSoft:sw,bandAngle:ang,size:sz,conc:.85,dark:i===9?1.2:.3}));
  // 7. 동심원 물들임
  [[.05,false,.08],[.1,false,.09],[.18,false,.1],[.05,true,.08],[.1,true,.09],[.18,true,.1],[.08,false,.12],[.12,true,.12],[.04,false,.065],[.15,true,.11]]
    .forEach(([sw,out,sz],i)=>add('동심원 물들임',`${out?'찻물 색 바깥':'찻물 색 가운데'} · 경계 ${sw<.07?'또렷':sw<.13?'부드럽게':'흐리게'}`,'방울이 과녁처럼 겹겹이 물들어요. 강한 풍미일수록 띠가 넓어요.',{color:'rings',ringSoft:sw,ringTeaOut:out,size:sz,dark:.25+(i%2)*.5,conc:.8}));
  // 8. 바탕 물들임 + 방울
  [[.3,.07],[.45,.07],[.6,.065],[.8,.06],[.4,.1],[.55,.1],[.35,.05],[.65,.05],[.5,.13],[.9,.045]]
    .forEach(([w,sz],i)=>add('바탕 물들임',`바탕 ${w<.4?'연하게':w<.65?'보통':'진하게'} · 방울 ${sz>.09?'크게':sz<.06?'작게':'중간'}`,'캔버스 전체를 먼저 옅게 물들이고 그 위에 방울을 찍어요. 빈 곳이 없어 하나의 그림처럼 보여요.',{wash:w,size:sz,conc:.7,soft:.06+(i%3)*.05}));
  // 9. 배치 변주
  [['pos','실제 위치 그대로','실제 향·맛 위치에 그대로 찍어요. 취향이 몰린 곳이 진해져요.'],['spread','넓게 퍼뜨리기','위치 근처를 지키면서 방울끼리 밀어 캔버스를 고르게 채워요.'],['grid','마신 순서 격자','마신 순서대로 격자에 놓아요.'],['spiral','해바라기 나선','좋았던 차일수록 가운데에 오는 해바라기 나선이에요.'],['rows','일기장 줄','마신 순서대로 일기장처럼 줄지어 놓아요. 맛이 좋았던 차는 살짝 위로 떠요.'],
   ['pos','실제 위치 · 크기 제각각','실제 위치에 크기를 제각각으로 찍어요.'],['spread','퍼뜨리기 · 크기 제각각','퍼뜨린 뒤 크기를 제각각으로 찍어요.'],['spiral','나선 · 번짐','해바라기 나선에 번짐을 더했어요.'],['grid','격자 · 크게 겹침','격자에 크게 찍어 이웃끼리 겹쳐요.'],['spread','빽빽하게 채우기','캔버스를 빈틈없이 채우도록 크게 퍼뜨려요.']]
    .forEach(([ly,nm,ds],i)=>add('배치',nm,ds,{layout:ly,size:[.075,.08,.07,.075,.06,.08,.08,.08,.11,.11][i],sizeVar:[0,0,0,0,0,.9,.8,0,0,0][i],halo:i===7?.7:0,soft:i===7?.2:.04,shrink:ly==='pos'?.35:.45,fill:i===9?.8:.62}));
  // 10. 종이·기법 변주
  [['white',{splat:1},'흰 종이 · 물감 튀김'],['cream',{salt:1},'크림 종이 · 소금 기법'],['hanji',{soft:.15,halo:.5},'한지 번짐'],['gray',{pencil:1.08},'회색 종이 · 연필 밑그림'],['ink',{conc:.85,blend:'multiply'},'먹색 종이 · 빛나는 물감'],
   ['kraft',{conc:.95,dark:.6},'크라프트지 · 진하게'],['cold',{splat:.7,salt:.6},'튀김 + 소금'],['white',{pencil:1.15,conc:.45},'연필 밑그림 · 연하게'],['cold',{axes:2,conc:.75,layout:'pos'},'수채 종이 · 축 표시'],['cream',{color:'edge',dark:.5},'가운데 찻물 · 가장자리 풍미']]
    .forEach(([pp,o,nm])=>add('종이·기법',nm,'종이와 기법을 바꿔봤어요.',{paper:pp,size:.09,...o}));
  L.forEach((s,i)=>{ const id='w'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:PAPER[s.p.paper]||PAPER.cold,render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
