/* =========================================================
   그라데이션 시안 — 투표 페이지의 H(그라데이션)를 기준으로 설정만 바꿔 그린다
   캔버스 전체를 하나의 색면으로 계산: 각 잔이 3D 찻방울에서 뽑은 7가지 색을 제자리에 두고,
   가까운 색일수록 강하게 섞는다(밝은 공간에서 섞어 탁하지 않게).
   ========================================================= */
(function(){
  const H=GALLERY.H; const {clamp,ss,mix,pastel,fbm,noise,rng,hash}=H;
  const PAPER={cream:'#F7F5F0',white:'#FCFCFA',warm:'#F4ECDD',mist:'#EEF1F0',blush:'#F7EEEC',gray:'#ECEBE7',ink:'#16151A',night:'#1B2130'};

  function render(ctx,W,recs,p){
    const bg=H.hex2rgb(PAPER[p.paper]), dark=p.paper==='ink'||p.paper==='night';
    const warp=p.warp?(u,v)=>{ const a=fbm(u*p.warpF+3,v*p.warpF,3), b=fbm(u*p.warpF+7.1,v*p.warpF-2,3); return [(a-.5)*p.warp,(b-.5)*p.warp]; }:null;
    const F=H.field(recs,p.res||110,{spread:p.spread,sharp:p.sharp,warp});
    const steps=p.steps||0;
    H.paintField(ctx,W,F,(c,a,u,v)=>{
      let col=pastel(c,p.lift,p.sat);
      let m=ss(p.edge0??0,p.edge1??.9,a);
      if(steps){ m=Math.round(m*steps)/steps; }
      if(p.vignette) m*=1-p.vignette*ss(.35,.75,Math.hypot(u-.5,v-.5));
      if(dark) col=col.map(x=>x*(.85+.25*m));
      return mix(bg,col,m*(p.alpha??1)).map(x=>x*255);
    },p.blur??.014);
    // 등고선
    if(p.contour){ ctx.save(); ctx.lineWidth=Math.max(.7,W/650); ctx.strokeStyle=dark?'rgba(255,255,255,.18)':'rgba(60,50,40,.16)';
      const n=72; for(let lv=1;lv<=p.contour;lv++){ const t=lv/(p.contour+1); ctx.beginPath();
        for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const s=H.sample(F,(i+.5)/n,(j+.5)/n)[3], sr=H.sample(F,(i+1.5)/n,(j+.5)/n)[3], sd=H.sample(F,(i+.5)/n,(j+1.5)/n)[3];
          if((s-t)*(sr-t)<0){ const x=(i+1)*W/n, y=(j+.5)*W/n; ctx.moveTo(x,y-W/n/2); ctx.lineTo(x,y+W/n/2); }
          if((s-t)*(sd-t)<0){ const x=(i+.5)*W/n, y=(j+1)*W/n; ctx.moveTo(x-W/n/2,y); ctx.lineTo(x+W/n/2,y); } }
        ctx.stroke(); } ctx.restore(); }
    // 잔 표시(아주 작은 점)
    if(p.marks){ ctx.save(); recs.forEach(r=>{ ctx.fillStyle=dark?'rgba(255,255,255,.55)':H.rgbStr(H.shade(r.tea,-.35),.55); ctx.beginPath(); ctx.arc(r.x*W,r.y*W,W*p.marks,0,6.283); ctx.fill(); }); ctx.restore(); }
    // 고운 입자
    if(p.dots){ const r=rng(hash(p.id)); const pts=H.poisson(W,W*p.dots,hash(p.id)%97+1); ctx.save();
      for(const [x,y] of pts){ const s=H.sample(F,x/W,y/W); if(r()>s[3]*.9) continue; ctx.fillStyle=H.rgbStr(pastel(s.slice(0,3),.02,1.35),.5); ctx.beginPath(); ctx.arc(x,y,W*p.dots*.22,0,6.283); ctx.fill(); } ctx.restore(); }
    // 종이 결
    if(p.tex){ const nn=Math.round(W/2), c=document.createElement('canvas'); c.width=c.height=nn; const cx=c.getContext('2d'), im=cx.createImageData(nn,nn), d=im.data;
      for(let j=0;j<nn;j++) for(let i=0;i<nn;i++){ const v=.5+.5*(fbm(i*.05,j*.05,3)-.5)+.35*(noise(i*.6,j*.6)-.5), g=clamp(.9+.2*(v-.5)*p.tex*2)*255, k=(j*nn+i)*4; d[k]=d[k+1]=d[k+2]=g; d[k+3]=255; }
      cx.putImageData(im,0,0); ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.globalAlpha=.5; ctx.drawImage(c,0,0,W,W); ctx.restore(); }
    if(p.grain) H.grain(ctx,W,p.grain,dark?'screen':'overlay');
    if(p.axes) H.axes(ctx,W,dark?.12:.07,true,dark);
  }

  const B={paper:'cream',spread:1.25,sharp:2,lift:.1,sat:1.25,grain:.07,blur:.014};
  const L=[]; const add=(fam,name,desc,o)=>L.push({fam,name,desc,p:{...B,...o}});
  // 1. 색이 퍼지는 범위
  [[.8,'아주 좁게'],[1,'좁게'],[1.25,'기본 (투표 시안 H)'],[1.5,'조금 넓게'],[1.8,'넓게'],[2.2,'아주 넓게'],[2.8,'캔버스 가득'],[1.5,'넓게 · 가장자리 또렷',{edge0:.2,edge1:.6}],[1.1,'좁게 · 가장자리 부드럽게',{edge0:0,edge1:1}],[3.5,'한 장의 색면']]
    .forEach(([sp,nm,o])=>add('퍼지는 범위',nm,'한 잔의 색이 주변으로 퍼지는 범위를 바꿨어요. 넓을수록 이웃 잔과 이어져 한 장의 색면이 돼요.',{spread:sp,...(o||{})}));
  // 2. 색 경계
  [[.8,'아주 부드럽게 섞임'],[1.2,'부드럽게 섞임'],[2,'기본'],[3,'조금 또렷한 경계'],[4.5,'또렷한 경계'],[7,'색 면이 나뉨'],[2,'경계 흐림 많이',{blur:.03}],[3,'또렷 · 흐림 없음',{blur:0}],[2,'단계로 나뉜 색 (포스터)',{steps:5}],[4,'또렷 · 단계 3개',{steps:3}]]
    .forEach(([sh,nm,o])=>add('색 경계',nm,'색과 색이 만나는 곳이 얼마나 부드러운지 바꿨어요.',{sharp:sh,...(o||{})}));
  // 3. 색감
  [[0,1,'원래 색'],[.1,1.25,'기본'],[.2,1.15,'밝게'],[.32,1,'파스텔'],[.45,.9,'아주 파스텔'],[.04,1.5,'선명하게'],[.02,1.8,'아주 선명하게'],[.12,.8,'차분하게'],[.18,.55,'뮤트'],[.25,1.45,'밝고 선명하게']]
    .forEach(([lf,st,nm])=>add('색감',nm,'같은 색을 밝기와 채도만 바꿔 칠했어요.',{lift:lf,sat:st}));
  // 4. 흐르는 결
  [[.08,3,'살짝 흐름'],[.16,3,'흐름'],[.28,3,'많이 흐름'],[.16,6,'잔물결'],[.3,1.5,'큰 소용돌이'],[.45,2.2,'마블링'],[.2,4,'물결 · 넓게',{spread:1.8}],[.35,3,'마블링 · 파스텔',{lift:.3,sat:1}],[.12,8,'고운 물결'],[.6,1.2,'아주 큰 흐름']]
    .forEach(([w,f,nm,o])=>add('흐르는 결',nm,'색면을 물결처럼 휘어, 찻잔에 우유를 부은 듯 흐르게 했어요.',{warp:w,warpF:f,...(o||{})}));
  // 5. 질감·바탕
  [['cream',0,0,'매끈 · 크림 바탕'],['cream',.07,0,'필름 입자'],['cream',.14,0,'거친 필름 입자'],['warm',.05,.6,'수채 종이'],['warm',.05,1,'거친 수채 종이'],['white',.05,0,'흰 바탕'],['mist',.05,0,'푸른빛 바탕'],['blush',.05,0,'분홍빛 바탕'],['gray',.05,.4,'회색 종이'],['cream',.04,0,'고운 입자 얹기',{dots:.009}]]
    .forEach(([pp,gr,tx,nm,o])=>add('질감·바탕',nm,'바탕 종이와 표면 질감을 바꿨어요.',{paper:pp,grain:gr,tex:tx,...(o||{})}));
  // 6. 어두운 바탕
  [['ink',{},'먹빛'],['ink',{spread:1.8},'먹빛 · 넓게'],['ink',{sat:1.5,lift:.02},'먹빛 · 선명하게'],['ink',{warp:.25,warpF:3},'먹빛 · 흐름'],['ink',{vignette:.6},'먹빛 · 가장자리 어둡게'],['night',{},'밤하늘'],['night',{spread:1.8,sat:1.4},'밤하늘 · 넓고 선명하게'],['night',{marks:.005},'밤하늘 · 잔마다 별'],['ink',{contour:6},'먹빛 · 등고선'],['ink',{steps:5},'먹빛 · 단계']]
    .forEach(([pp,o,nm])=>add('어두운 바탕',nm,'어두운 바탕 위에서 색이 빛처럼 번져요.',{paper:pp,grain:.05,...o}));
  // 7. 더하는 표현
  [[{contour:5},'등고선'],[{contour:9},'촘촘한 등고선'],[{marks:.004},'잔마다 작은 점'],[{marks:.004,contour:5},'점 + 등고선'],[{axes:1},'축 표시'],[{vignette:.5},'가장자리 옅게'],[{edge0:.25,edge1:.5},'덩어리 테두리 또렷'],[{steps:6,contour:0},'단계 색'],[{dots:.012},'입자 조금'],[{dots:.007},'입자 촘촘']]
    .forEach(([o,nm])=>add('더하는 표현',nm,'기본 그라데이션 위에 한 가지 표현을 더했어요.',o));

  L.forEach((s,i)=>{ const id='g'+String(i+1).padStart(3,'0'); s.p.id=id;
    GALLERY.add({id,name:`${s.fam} — ${s.name}`,cat:s.fam,desc:s.desc,bg:PAPER[s.p.paper],render:(ctx,W,recs)=>render(ctx,W,recs,s.p)}); });
})();
