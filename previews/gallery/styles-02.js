/* =========================================================
   시안 묶음 02 — 실·선·직물
   기록 하나하나를 실, 선, 땀으로 바꿔 짜고 꿰고 그어 본다.
   ========================================================= */
(function(){
const H=GALLERY.H, TAU=Math.PI*2, BG='#F7F5F0';

/* ---------- 공용 도구 ---------- */
const dk=N=>Math.sqrt(10/Math.max(10,N));                 // 10→1, 50→.45, 100→.32
const acc=r=>(r.colors[1]||r.colors[0]).rgb;               // 가장 강한 풍미 색
const fl=(r,k)=>r.colors.length>1?r.colors[1+(k%(r.colors.length-1))].rgb:r.tea;
// 밝은 종이 위 가는 선이 묻히지 않게: 너무 밝은 색만 살짝 눌러준다
const deep=c=>{ const l=H.lum(c); return l>.55?H.shade(c,-(l-.5)*.75):c; };
const lc=(c,a=1)=>H.rgbStr(deep(c),a);
const pc=(c,lift=.08,sat=1.08)=>H.pastel(c,lift,sat);
const clamp=H.clamp;
function smooth(ctx,P,closed){
  const n=P.length; if(n<2) return; ctx.moveTo(P[0][0],P[0][1]);
  const g=i=>closed?P[(i+n)%n]:P[Math.max(0,Math.min(n-1,i))], m=closed?n:n-1;
  for(let i=0;i<m;i++){ const a=g(i-1),b=g(i),c=g(i+1),d=g(i+2);
    ctx.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,c[0],c[1]); }
  if(closed) ctx.closePath();
}
// 등치선(marching squares) → 이어진 선 목록. 좌표는 격자 단위(0..n-1)
function isoLines(f,n,lv){
  const pos=new Map(), adj=new Map();
  const eid=(i,j,v)=>((j*n+i)<<1)|v;
  const pt=(id,x,y)=>{ if(!pos.has(id)) pos.set(id,[x,y]); };
  const link=(a,b)=>{ (adj.get(a)||adj.set(a,[]).get(a)).push(b); (adj.get(b)||adj.set(b,[]).get(b)).push(a); };
  const T=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],[[3,0],[1,2]],[[0,2]],[[3,2]],[[2,3]],[[0,2]],[[0,1],[2,3]],[[1,2]],[[1,3]],[[0,1]],[[3,0]],[]];
  for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){
    const a=f[j*n+i], b=f[j*n+i+1], c=f[(j+1)*n+i+1], d=f[(j+1)*n+i];
    const k=(a>lv)|((b>lv)<<1)|((c>lv)<<2)|((d>lv)<<3); if(k===0||k===15) continue;
    const E=e=>{ let id,x,y,t;
      if(e===0){ t=(lv-a)/(b-a); id=eid(i,j,0); x=i+t; y=j; }
      else if(e===2){ t=(lv-d)/(c-d); id=eid(i,j+1,0); x=i+t; y=j+1; }
      else if(e===3){ t=(lv-a)/(d-a); id=eid(i,j,1); x=i; y=j+t; }
      else { t=(lv-b)/(c-b); id=eid(i+1,j,1); x=i+1; y=j+t; }
      pt(id,x,y); return id; };
    for(const [p,q] of T[k]) link(E(p),E(q));
  }
  const seen=new Set(), out=[];
  for(const s of adj.keys()){ if(seen.has(s)) continue;
    // 열린 선이면 끝점부터 시작
    let st=s; { let prev=-1, cur=s, guard=0; while(adj.get(cur).length===2&&guard++<1e5){ const nx=adj.get(cur)[0]===prev?adj.get(cur)[1]:adj.get(cur)[0]; prev=cur; cur=nx; if(cur===s) break; } if(adj.get(cur).length===1) st=cur; }
    const line=[]; let prev=-1, cur=st, last=st;
    while(cur!==undefined&&!seen.has(cur)){ seen.add(cur); line.push(pos.get(cur)); last=cur; const nb=adj.get(cur); const nx=nb.find(v=>v!==prev&&!seen.has(v)); prev=cur; cur=nx; }
    if(line.length>2&&last!==st&&adj.get(st).includes(last)) line.push(pos.get(st));
    if(line.length>1) out.push(line);
  }
  return out;
}
const neutral=[.72,.69,.64];
// 가까운 기록끼리 묶기(먼저 마신 기록이 묶음의 중심)
function cluster(recs,d){ const C=[]; recs.forEach(r=>{ let best=null, bd=d; for(const c of C){ const e=Math.hypot(c.x-r.x,c.y-r.y); if(e<bd){ bd=e; best=c; } } if(best) best.m.push(r); else C.push({x:r.x,y:r.y,m:[r]}); }); return C; }

/* =========================================================
   s201 실 걸이 판 (string art)
   ========================================================= */
GALLERY.add({ id:'s201', name:'실 걸이 원판', cat:'실',
  desc:'기록 하나가 원판의 핀 사이를 비스듬히 오가며 건 실 한 묶음이에요. 위쪽 핀은 향, 아래쪽 핀은 맛을 가리키고 둘 다 오른쪽일수록 좋았던 차예요.',
  render(ctx,W,recs){
    const N=recs.length, k=dk(N), cx=W/2, cy=W/2, R=W*.41, P=144, s=W/480;
    const pp=q=>{ const a=q/P*TAU; return [cx+Math.cos(a)*R, cy+Math.sin(a)*R]; };
    const pin=a=>((Math.round(a/TAU*P)%P)+P)%P;
    const used=new Float32Array(P);
    ctx.lineCap='round';
    recs.forEach(r=>{
      const q1=pin(Math.PI*(1.06+.88*r.x)), q2=pin(Math.PI*(.94-.88*r.y)), n=Math.max(2,Math.round((5+9*r.i)*(.3+.7*k)));
      for(let j=0;j<n;j++){ const t=j/(n-1), a=(q1+j)%P, b=((q2-2*j)%P+P)%P, A=pp(a), B=pp(b);
        const col=t<.5?H.mix(r.tea,acc(r),t*2):H.mix(acc(r),fl(r,1),(t-.5)*2);
        ctx.strokeStyle=lc(col,(.3+.45*k)); ctx.lineWidth=s*(.55+.35*r.i);
        ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke(); used[a]++; used[b]++; }
    });
    for(let q=0;q<P;q++){ const [x,y]=pp(q); ctx.fillStyle=`rgba(90,80,70,${.16+Math.min(.45,used[q]*.06)})`;
      ctx.beginPath(); ctx.arc(x,y,s*(used[q]?1.7:1.2),0,TAU); ctx.fill(); }
  }});

/* =========================================================
   s202 베틀 (loom)
   ========================================================= */
GALLERY.add({ id:'s202', name:'베틀 위의 천', cat:'직물', bg:'#F5F2EA',
  desc:'기록 하나가 씨실 한 줄이에요. 찻물 색 씨실 위에, 향이 좋았던 만큼 오른쪽에 풍미 색 무늬를 짜 넣어요. 오래된 기록이 위, 최근 기록이 아래예요.',
  render(ctx,W,recs){
    const N=recs.length, x0=W*.17, x1=W*.83, y0=W*.11, yEnd=W*.87;
    const cols=Math.round((x1-x0)/(W*.0118)), cw=(x1-x0)/cols;
    const Hw=(yEnd-y0-W*.04)*(.42+.58*Math.min(1,N/100));
    const rpr=Math.max(1,Math.round(Hw/(W*.009)/N)), rows=N*rpr, rh=Hw/rows;
    const warpC='rgba(214,205,188,1)', s=W/480;
    // 빔
    ctx.lineCap='round'; ctx.strokeStyle='rgba(120,100,80,.35)'; ctx.lineWidth=W*.007;
    ctx.beginPath(); ctx.moveTo(x0-W*.04,y0-W*.03); ctx.lineTo(x1+W*.04,y0-W*.03); ctx.moveTo(x0-W*.04,yEnd+W*.02); ctx.lineTo(x1+W*.04,yEnd+W*.02); ctx.stroke();
    // 날실
    ctx.lineWidth=cw*.32; ctx.strokeStyle=warpC;
    for(let c=0;c<cols;c++){ const x=x0+(c+.5)*cw; ctx.beginPath(); ctx.moveTo(x,y0-W*.03); ctx.lineTo(x,yEnd+W*.02); ctx.stroke(); }
    // 씨실
    let g=0;
    recs.forEach(r=>{
      const base=pc(r.tea,.06,1.05), cm=r.x*cols, hw=1+r.i*cols*.07;
      for(let m=0;m<rpr;m++,g++){
        const y=y0+g*rh, alt=rpr>1&&m%2===1;
        for(let c=0;c<cols;c++){
          const inlay=Math.abs(c+.5-cm)<hw;
          const over=(c+g)%4!==0, x=x0+c*cw;
          const col=inlay?pc(fl(r,m+(c%3===0?1:0)),.06,1.08):(alt?pc(fl(r,m),.25,1):base);
          if(over){ ctx.fillStyle=H.rgbStr(col); ctx.fillRect(x-.3,y,cw+.6,rh); }
          else { ctx.fillStyle=H.rgbStr(H.mix(col,[.92,.89,.83],.55)); ctx.fillRect(x-.3,y,cw+.6,rh); ctx.fillStyle='rgba(120,100,80,.12)'; ctx.fillRect(x+cw*.3,y,cw*.4,rh); }
        }
      }
    });
    // 북에서 늘어진 마지막 씨실
    const last=recs[N-1], ly=y0+(g-.5)*rh;
    ctx.strokeStyle=lc(last.tea,.8); ctx.lineWidth=Math.max(1,rh*.55);
    ctx.beginPath(); ctx.moveTo(x1,ly); ctx.bezierCurveTo(x1+W*.05,ly+W*.01,x1+W*.06,ly+W*.07,x1+W*.035,ly+W*.11); ctx.stroke();
  }});

/* =========================================================
   s203 십자수 (cross-stitch)
   ========================================================= */
GALLERY.add({ id:'s203', name:'십자수 취향 지도', cat:'직물', bg:'#F6F4EE',
  desc:'기록 하나가 십자수 한 무더기예요. 맛과 향 자리에 가운데는 찻물 색, 둘레는 풍미 색으로 수놓고, 자리가 차 있으면 옆으로 번져 나가요.',
  render(ctx,W,recs){
    const N=recs.length, n=42, m=W*.06, c=(W-2*m)/n;
    const col=new Array(n*n), K=N<=10?2.2:N<=50?.75:.45;
    recs.forEach(r=>{ const gx=r.x*n, gy=r.y*n, cnt=Math.max(3,Math.round((7+16*r.i)*K)), cand=[];
      for(let W2=4;cand.length<cnt&&W2<n;W2+=4){ cand.length=0;
        for(let j=Math.floor(gy-W2);j<=gy+W2;j++) for(let i=Math.floor(gx-W2);i<=gx+W2;i++){ if(i<0||j<0||i>=n||j>=n||col[j*n+i]) continue;
          const dx=i+.5-gx, dy=j+.5-gy; cand.push([Math.abs(dx)+Math.abs(dy)+.15*Math.hypot(dx,dy)+.01*((i*7+j*13)%5),j*n+i]); } }
      cand.sort((a,b)=>a[0]-b[0]); const take=cand.slice(0,cnt), nf=r.colors.length;
      take.forEach((c,q)=>{ const t=q/cnt; col[c[1]]=t<.35?r.tea:(t<.8||nf<3?acc(r):r.colors[2].rgb); }); });
    // 천의 구멍
    ctx.fillStyle='rgba(0,0,0,.07)'; const hs=Math.max(1,W*.0022);
    for(let j=0;j<=n;j++) for(let i=0;i<=n;i++) ctx.fillRect(m+i*c-hs/2,m+j*c-hs/2,hs,hs);
    ctx.lineCap='round'; ctx.lineWidth=c*.27; const p=c*.17;
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const cc=col[j*n+i]; if(!cc) continue; const x=m+i*c, y=m+j*c, b=pc(cc,.12,1.05);
      ctx.strokeStyle=H.rgbStr(H.shade(b,-.1)); ctx.beginPath(); ctx.moveTo(x+p,y+p); ctx.lineTo(x+c-p,y+c-p); ctx.stroke();
      ctx.strokeStyle=H.rgbStr(b); ctx.beginPath(); ctx.moveTo(x+c-p,y+p); ctx.lineTo(x+p,y+c-p); ctx.stroke(); }
  }});

/* =========================================================
   s204 히토메자시 사시코
   ========================================================= */
GALLERY.add({ id:'s204', name:'사시코 홈질', cat:'직물', bg:'#F1EDE4',
  desc:'가로세로 홈질이 만나 저절로 생기는 사시코 무늬예요. 기록이 있는 자리의 땀은 그 차의 색으로 물들고, 기록이 몰린 줄마다 땀의 엇갈림이 바뀌어요.',
  render(ctx,W,recs){
    const N=recs.length, n=34, g=W/n, F=H.field(recs,60), gap=g*.15, s=W/480;
    const rc=new Array(n).fill(0), cc=new Array(n).fill(0);
    recs.forEach(r=>{ rc[Math.floor(r.y*n)]++; cc[Math.floor(r.x*n)]++; });
    const a=rc.map((v,j)=>(v+(H.hash('row'+j)&1))&1), b=cc.map((v,i)=>(v+(H.hash('col'+i)&1))&1);
    ctx.lineCap='round'; ctx.lineWidth=Math.max(1.2,W*.0058);
    const dash=(x1,y1,x2,y2,u,v)=>{ const S=H.sample(F,u,v), t=H.ss(.04,.55,S[3]);
      const col=H.mix(neutral,deep(pc(S,.02,1.15)),t); ctx.strokeStyle=H.rgbStr(col,.45+.5*t);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
    for(let j=1;j<n;j++) for(let i=0;i<n;i++) if((i+a[j])%2===0) dash(i*g+gap,j*g,(i+1)*g-gap,j*g,(i+.5)/n,j/n);
    for(let i=1;i<n;i++) for(let j=0;j<n;j++) if((j+b[i])%2===0) dash(i*g,j*g+gap,i*g,(j+1)*g-gap,i/n,(j+.5)/n);
  }});

/* =========================================================
   s205 나이테
   ========================================================= */
GALLERY.add({ id:'s205', name:'취향의 나이테', cat:'선',
  desc:'기록 하나가 나이테 한 겹이에요. 가운데가 첫 잔, 바깥이 최근 잔이고, 진한 차일수록 테가 두꺼워요. 좋았던 쪽으로 나무가 조금씩 기울어 자라요.',
  render(ctx,W,recs){
    const N=recs.length, Rmax=W*.42, r0=W*.014, s=W/480, M=Math.round(Math.max(120,W*.55));
    const ws=recs.map(r=>.45+r.i), tot=ws.reduce((a,b)=>a+b,0);
    let rad=r0, ox=0, oy=0; const rings=[];
    recs.forEach((r,k)=>{ rad+=(Rmax-r0)*ws[k]/tot; ox+=(r.x-.5)*ws[k]/tot*W*.07; oy+=(r.y-.5)*ws[k]/tot*W*.07;
      const P=[]; for(let q=0;q<M;q++){ const t=q/M*TAU, ct=Math.cos(t), st=Math.sin(t);
        const w=1+.07*(H.fbm(ct*1.1+3,st*1.1+7+k*.004,3)-.5)*2*Math.min(1,rad/(W*.1));
        P.push([W/2-ox*.6+ox*rad/Rmax+ct*rad*w, W/2-oy*.6+oy*rad/Rmax+st*rad*w]); }
      rings.push(P); });
    // 테 사이 면: 바깥부터 채움
    for(let k=N-1;k>=0;k--){ const r=recs[k]; ctx.fillStyle=H.rgbStr(pc(k%2?r.tea:acc(r),.74,1)); ctx.beginPath(); rings[k].forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle=H.rgbStr(pc(recs[0].tea,.4,1)); ctx.beginPath(); ctx.arc(W/2-ox*.6,W/2-oy*.6,r0,0,TAU); ctx.fill();
    // 방사선(갈라짐)
    ctx.strokeStyle='rgba(90,70,50,.07)'; ctx.lineWidth=s*.8;
    for(let q=0;q<5;q++){ const a=H.hash('ray'+q)%628/100; ctx.beginPath(); ctx.moveTo(W/2+Math.cos(a)*W*.05,W/2+Math.sin(a)*W*.05); ctx.lineTo(W/2+Math.cos(a)*Rmax*.9,W/2+Math.sin(a)*Rmax*.9); ctx.stroke(); }
    // 테 선
    recs.forEach((r,k)=>{ ctx.strokeStyle=lc(H.shade(acc(r),-.12),.6+.35*dk(N)); ctx.lineWidth=s*(.5+1.1*r.i)*(N>50?.8:1.1);
      ctx.beginPath(); rings[k].forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.stroke(); });
  }});

/* =========================================================
   s206 취향 지문
   ========================================================= */
GALLERY.add({ id:'s206', name:'취향 지문', cat:'선',
  desc:'세상에 하나뿐인 내 취향의 지문이에요. 기록이 놓인 자리마다 결이 휘고, 그 자리의 결은 그 차의 색으로 물들어요.',
  render(ctx,W,recs){
    const N=recs.length, n=120, f=new Float32Array(n*n), F=H.field(recs,60), s=W/480;
    const amp=.045*(.4+.6*dk(N));
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const u=i/(n-1), v=j/(n-1);
      let ex=(u-.5)/.3+.35*(H.noise(u*3+1,v*3)-.5), ey=(v-.47)/.38+.35*(H.noise(u*3+9,v*3+4)-.5);
      const tw=.9*Math.exp(-(ex*ex+ey*ey)*1.5), ct=Math.cos(tw), st=Math.sin(tw); [ex,ey]=[ex*ct-ey*st,ex*st+ey*ct];
      const t=H.ss(-.1,1,ey)*.8, d=Math.sqrt(ex*ex*(1-t)+ey*ey);
      let b=0; for(const r of recs){ const dx=u-r.x, dy=v-r.y; b+=r.i*Math.exp(-(dx*dx+dy*dy)/.006); }
      f[j*n+i]=d+amp*b; }
    ctx.lineCap='round'; ctx.lineWidth=Math.max(1,s*1.5);
    const sp=.034;
    for(let L=sp*.5;L<1.9;L+=sp){
      for(const line of isoLines(f,n,L)){
        for(let q=0;q+1<line.length;q+=4){ const seg=line.slice(q,q+5); const [gx,gy]=seg[Math.floor(seg.length/2)], u=gx/(n-1), v=gy/(n-1);
          const e=((u-.5)/.4)**2+((v-.5)/.46)**2; if(e>1) continue; const fade=H.ss(1,.72,e);
          if(H.noise(u*22+L*40,v*22)<.16) continue;
          const S=H.sample(F,u,v), tt=H.ss(.05,.6,S[3]), col=H.mix(neutral,deep(pc(S,0,1.2)),tt);
          ctx.strokeStyle=H.rgbStr(col,fade*(.4+.55*tt)); ctx.beginPath(); seg.forEach((p,z)=>{ const x=p[0]/(n-1)*W, y=p[1]/(n-1)*W; z?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.stroke(); }
      }
    }
  }});

/* =========================================================
   s207 결 (flow field)
   ========================================================= */
GALLERY.add({ id:'s207', name:'취향의 결', cat:'선',
  desc:'캔버스 전체에 흐르는 가는 결이에요. 기록 둘레에서 결이 소용돌이치고, 그 자리의 결은 그 차의 색을 띠어요.',
  render(ctx,W,recs){
    const N=recs.length, F=H.field(recs,60), m=56, VX=new Float32Array(m*m), VY=new Float32Array(m*m), s=W/480, sw=.06+.05*dk(N);
    for(let j=0;j<m;j++) for(let i=0;i<m;i++){ const u=i/(m-1), v=j/(m-1), a=(H.fbm(u*1.5+2,v*1.5+5,3)-.5)*TAU*1.2;
      let vx=Math.cos(a)*.5, vy=Math.sin(a)*.5;
      for(const r of recs){ const dx=u-r.x, dy=v-r.y, d2=dx*dx+dy*dy, e=Math.exp(-d2/(sw*sw))*(.6+.6*r.i), dd=Math.sqrt(d2)+1e-4, sg=r.idx%2?1:-1; vx+=-dy/dd*e*sg; vy+=dx/dd*e*sg; }
      const l=Math.hypot(vx,vy)+1e-6; VX[j*m+i]=vx/l; VY[j*m+i]=vy/l; }
    const vAt=(u,v)=>{ const x=clamp(u,0,1)*(m-1), y=clamp(v,0,1)*(m-1), i=Math.min(m-2,Math.floor(x)), j=Math.min(m-2,Math.floor(y)), fx=x-i, fy=y-j;
      const L=(A)=>A[j*m+i]*(1-fx)*(1-fy)+A[j*m+i+1]*fx*(1-fy)+A[(j+1)*m+i]*(1-fx)*fy+A[(j+1)*m+i+1]*fx*fy; return [L(VX),L(VY)]; };
    const seeds=H.poisson(W,W*.03,11), st=.004, steps=34;
    ctx.lineCap='round'; ctx.lineJoin='round';
    for(const [sx,sy] of seeds){ const u0=sx/W, v0=sy/W, S=H.sample(F,u0,v0), t=H.ss(.03,.6,S[3]);
      const pts=[]; for(const dir of [-1,1]){ let u=u0, v=v0; const arr=[]; for(let q=0;q<steps;q++){ const [vx,vy]=vAt(u,v); u+=vx*st*dir; v+=vy*st*dir; if(u<.02||v<.02||u>.98||v>.98) break; arr.push([u*W,v*W]); } if(dir<0) pts.push(...arr.reverse(),[sx,sy]); else pts.push(...arr); }
      if(pts.length<3) continue;
      ctx.strokeStyle=H.rgbStr(H.mix(neutral,deep(pc(S,0,1.2)),t),.22+.6*t); ctx.lineWidth=s*(.6+.7*t);
      ctx.beginPath(); pts.forEach((p,z)=>z?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke(); }
  }});

/* =========================================================
   s208 등고선
   ========================================================= */
GALLERY.add({ id:'s208', name:'취향 등고선', cat:'선',
  desc:'기록이 쌓인 곳일수록 높은 산이 되는 지도예요. 등고선은 그 자리 차들의 색으로 그려져요.',
  render(ctx,W,recs){
    const N=recs.length, n=110, D=new Float32Array(n*n), sg=.045+.04*dk(N), F=H.field(recs,64), s=W/480;
    let mx=0; for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const u=i/(n-1), v=j/(n-1); let d=0;
      for(const r of recs){ const dx=u-r.x, dy=v-r.y; d+=(.5+.5*r.i)*Math.exp(-(dx*dx+dy*dy)/(2*sg*sg)); }
      d+=.04*(H.fbm(u*4,v*4,3)-.5); D[j*n+i]=d; if(d>mx) mx=d; }
    const bgc=H.hex2rgb(BG);
    H.paintField(ctx,W,F,(c,a)=>H.mix(bgc,pc(c,.4,1.1),H.ss(.1,1,a)*.2).map(v=>v*255),.02);
    const L=N<=10?11:N<=50?15:18;
    ctx.lineCap='round'; ctx.lineJoin='round';
    for(let q=1;q<L;q++){ const lv=mx*q/L, major=q%4===0;
      for(const line of isoLines(D,n,lv)){
        for(let z=0;z+1<line.length;z+=5){ const seg=line.slice(z,z+6), [gx,gy]=seg[Math.floor(seg.length/2)], S=H.sample(F,gx/(n-1),gy/(n-1));
          ctx.strokeStyle=H.rgbStr(H.mix(neutral,deep(pc(S,0,1.2)),H.ss(.05,.5,S[3])),major?.85:.6); ctx.lineWidth=s*(major?1.4:.75);
          ctx.beginPath(); seg.forEach((p,w)=>{ const x=p[0]/(n-1)*W, y=p[1]/(n-1)*W; w?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.stroke(); } } }
  }});

/* =========================================================
   s209 스피로그래프 표본
   ========================================================= */
GALLERY.add({ id:'s209', name:'스피로그래프 표본첩', cat:'실',
  desc:'기록 하나가 스피로그래프 무늬 하나예요. 향이 좋을수록 꽃잎이 많고, 맛이 좋을수록 고리가 깊어져요. 마신 순서대로 놓여요.',
  render(ctx,W,recs){
    const N=recs.length, cols=Math.ceil(Math.sqrt(N*1.0)), rows=Math.ceil(N/cols), cell=W*.86/Math.max(cols,rows), s=W/480;
    const oy=(W-rows*cell)/2;
    ctx.lineJoin='round';
    recs.forEach((r,k)=>{ const row=Math.floor(k/cols), inRow=row===rows-1?N-row*cols:cols, ox=(W-inRow*cell)/2;
      const cx=ox+(k%cols+.5)*cell, cy=oy+(row+.5)*cell, R=cell*.4*(.7+.3*r.i), n=3+Math.round(r.x*6), a=.18+.42*(1-r.y);
      const curve=(sc,rot,col,al,lw,kk)=>{ ctx.strokeStyle=lc(col,al); ctx.lineWidth=lw; ctx.beginPath();
        const M=Math.max(120,n*40); for(let q=0;q<=M;q++){ const t=q/M*TAU; let x=Math.cos(t)+a*Math.cos(kk*t), y=Math.sin(t)-a*Math.sin(kk*t);
          const c=Math.cos(rot), sn=Math.sin(rot), X=(x*c-y*sn)/(1+a)*R*sc, Y=(x*sn+y*c)/(1+a)*R*sc; q?ctx.lineTo(cx+X,cy+Y):ctx.moveTo(cx+X,cy+Y); } ctx.stroke(); };
      const lw=s*Math.max(.55,Math.min(1.1,cell/80));
      curve(1,0,r.tea,.85,lw,n-1);
      r.colors.slice(1).forEach((c,j)=>curve(.78-.2*j,Math.PI/n*(j+1),c.rgb,.75,lw*.9,n-1+(j+1)*n));
    });
  }});

/* =========================================================
   s210 차 종류별 별자리
   ========================================================= */
GALLERY.add({ id:'s210', name:'찻물 위 동심원', cat:'선',
  desc:'비슷한 취향의 기록끼리 한 점에서 물결을 일으켜요. 한 잔마다 찻물 색과 풍미 색 물결이 한 겹씩 더해져 멀리 퍼지고, 물결이 겹친 곳에 무아레 무늬가 생겨요.',
  render(ctx,W,recs){
    const N=recs.length, k=dk(N), m=W*.13, s=W/480, sp=W*(.0072+.003*k), C=cluster(recs,.07);
    ctx.lineWidth=s*.75;
    C.forEach(c=>{ const cx=m+c.x*(W-2*m), cy=m+c.y*(W-2*m), cols=[]; c.m.forEach(r=>{ cols.push(r.tea,acc(r)); if(r.i>.65) cols.push(fl(r,1)); });
      const rep=k>.6?3:1, n=Math.min(cols.length*rep+4,Math.round(W*.26/sp));
      for(let q=1;q<=n;q++){ const t=q/n, col=cols[Math.min(cols.length-1,Math.max(0,Math.floor((q-3)/rep)))]; ctx.strokeStyle=lc(pc(col,0,1.15),.8*Math.pow(1-t,.5)+.06);
        ctx.beginPath(); ctx.arc(cx,cy,q*sp,0,TAU); ctx.stroke(); }
      ctx.fillStyle=lc(c.m[0].tea,.85); ctx.beginPath(); ctx.arc(cx,cy,s*1.6,0,TAU); ctx.fill(); });
  }});

/* =========================================================
   s211 소리 결 (ridgeline)
   ========================================================= */
GALLERY.add({ id:'s211', name:'한 잔씩의 파형', cat:'선',
  desc:'기록 하나가 파형 한 줄이에요. 위에서부터 마신 순서대로 쌓이고, 봉우리는 향이 좋았던 자리에서, 맛이 좋을수록 높게 솟아요.',
  render(ctx,W,recs){
    const N=recs.length, top=W*.2, bot=W*.9, x0=W*.1, x1=W*.9, gap=(bot-top)/N, amp=Math.min(W*.17,gap*8+W*.035), M=Math.round(W*.45), s=W/480;
    const bgc=BG;
    recs.forEach((r,k)=>{ const yb=top+(k+.5)*gap, hs=H.hash(r.id), sig=.05+.06*r.i, pk=[[r.x,1,sig]];
      r.fl.forEach((f,j)=>pk.push([clamp(r.x+((hs>>(j*5))%100/100-.5)*.5,.05,.95),.35*f.w,sig*.7]));
      const P=[]; for(let q=0;q<=M;q++){ const t=q/M; let h=0; for(const [c,w,sg] of pk) h+=w*Math.exp(-((t-c)**2)/(2*sg*sg));
        h=h*(.3+.7*(1-r.y))*(.85+.3*H.noise(t*14,k*3.1))+.04*H.noise(t*40,k*7.3); P.push([x0+t*(x1-x0),yb-h*amp]); }
      ctx.fillStyle=bgc; ctx.beginPath(); P.forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.lineTo(x1,yb+1); ctx.lineTo(x0,yb+1); ctx.closePath(); ctx.fill();
      const g=ctx.createLinearGradient(x0,0,x1,0), nC=H.rgbStr(neutral,.55), st=(t,c)=>g.addColorStop(clamp(t,0,1),c);
      st(0,nC); st(r.x-.3,nC); st(r.x,lc(acc(r),.95)); st(r.x+.3,nC); st(1,nC);
      ctx.strokeStyle=g; ctx.lineWidth=s*(N>50?.8:1.1); ctx.beginPath(); P.forEach((p,q)=>q?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.stroke(); });
  }});

/* =========================================================
   s212 한 붓 그리기
   ========================================================= */
GALLERY.add({ id:'s212', name:'기록의 지진계', cat:'선',
  desc:'펜 하나가 쉬지 않고 그려 나간 한 줄이에요. 차를 마실 때마다 떨림이 일고, 진한 차일수록 크게, 향이 좋을수록 촘촘하게, 맛이 좋을수록 오래 떨려요.',
  render(ctx,W,recs){
    const N=recs.length, rows=N<=10?4:N<=50?7:10, x0=W*.1, x1=W*.9, top=W*.12, gap=W*.76/rows, Lr=x1-x0, L=rows*Lr, s=W/480;
    const B=recs.map((r,k)=>({p:(k+.6)/(N+.2)*L, A:gap*.42*(.3+.7*r.i), f:TAU*(14+46*r.x)/W, tau:W*(.012+.045*(1-r.y)), c:acc(r), c2:r.tea}));
    ctx.strokeStyle='rgba(0,0,0,.05)'; ctx.lineWidth=s*.6;
    for(let q=0;q<rows;q++){ const y=top+(q+.5)*gap; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke(); }
    const step=Math.max(.6,W*.0016), n=Math.ceil(L/step); let lastRow=-1, prev=null, bi=0;
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=s*.95;
    for(let q=0;q<=n;q++){ const t=Math.min(L,q*step), row=Math.min(rows-1,Math.floor(t/Lr)), x=x0+(t-row*Lr), yb=top+(row+.5)*gap;
      while(bi<N-1&&B[bi+1].p<=t+W*.01) bi++;
      let v=0, w=0, col=null; for(let z=Math.max(0,bi-2);z<=Math.min(N-1,bi+1);z++){ const b=B[z], d=t-b.p; if(d<-W*.006) continue;
        const e=d<0?Math.exp(d/(W*.002)):Math.exp(-d/b.tau); const val=b.A*e*Math.sin(d*b.f); v+=val; if(e>w){ w=e; col=b; } }
      v+=gap*.015*(H.noise(t*.08,3.3)-.5);
      const P=[x,yb-v];
      if(prev&&row===lastRow){ const tt=H.ss(.02,.35,w); ctx.strokeStyle=H.rgbStr(col?H.mix(neutral,deep(pc(H.mix(col.c,col.c2,H.ss(.6,.05,w)*.5),0,1.15)),tt):neutral,.5+.45*tt);
        ctx.beginPath(); ctx.moveTo(prev[0],prev[1]); ctx.lineTo(P[0],P[1]); ctx.stroke(); }
      prev=P; lastRow=row; }
    ctx.fillStyle=lc(recs[N-1].tea,.9); ctx.beginPath(); ctx.arc(prev[0],prev[1],s*2.2,0,TAU); ctx.fill();
  }});

/* =========================================================
   s213 실타래
   ========================================================= */
GALLERY.add({ id:'s213', name:'실타래', cat:'실',
  desc:'기록마다 몇 바퀴씩 감아 올린 실타래예요. 차를 마실수록 공이 커지고, 맨 바깥에는 최근 기록의 실이 감겨 풀려 나와요.',
  render(ctx,W,recs){
    const N=recs.length, R=W*(.2+.12*Math.min(1,N/100)), cx=W*.47, cy=W*.47, s=W/480, M=Math.round(clamp(20+N*2.2,34,240));
    const rnd=H.rng(H.hash('yarn'+N)), yw=W*(.0045+.002*dk(N));
    let avg=[0,0,0]; recs.forEach(r=>avg=avg.map((v,i)=>v+r.tea[i]/N));
    ctx.fillStyle=H.rgbStr(pc(avg,.55,1)); ctx.beginPath(); ctx.arc(cx,cy,R*.985,0,TAU); ctx.fill();
    ctx.lineCap='round';
    const G=7; let nx=0, ny=0, nz=1;
    for(let w=0;w<M;w++){ const ri=Math.min(N-1,Math.floor(w*N/M)), r=recs[ri], col=pc(r.colors[w%r.colors.length].rgb,.1,1.05);
      if(w%G===0){ const z=rnd()*2-1, ph=rnd()*TAU, sq=Math.sqrt(1-z*z); nx=sq*Math.cos(ph); ny=sq*Math.sin(ph); nz=z; }
      const hh=((w%G)-(G-1)/2)*.045, rho=Math.sqrt(1-hh*hh);
      let e1=[-ny,nx,0]; const l1=Math.hypot(...e1)||1; e1=e1.map(v=>v/l1); const e2=[ny*e1[2]-nz*e1[1],nz*e1[0]-nx*e1[2],nx*e1[1]-ny*e1[0]];
      const Rk=R*(.955+.04*w/M), Q=72, pts=[]; for(let q=0;q<=Q;q++){ const t=q/Q*TAU, c=Math.cos(t)*rho, sn=Math.sin(t)*rho; pts.push([nx*hh+e1[0]*c+e2[0]*sn,ny*hh+e1[1]*c+e2[1]*sn,nz*hh+e1[2]*c+e2[2]*sn]); }
      ctx.lineWidth=yw;
      for(let q=0;q<Q;q++){ const p=pts[q], p2=pts[q+1]; if(p[2]<0||p2[2]<0) continue; const sh=.78+.22*p[2];
        ctx.strokeStyle=H.rgbStr(col.map(v=>v*sh)); ctx.beginPath(); ctx.moveTo(cx+p[0]*Rk,cy+p[1]*Rk); ctx.lineTo(cx+p2[0]*Rk,cy+p2[1]*Rk); ctx.stroke(); } }
    const last=recs[N-1], a=.35, sx=cx+Math.cos(a)*R, sy=cy+Math.sin(a)*R;
    ctx.strokeStyle=H.rgbStr(pc(acc(last),.04,1.08)); ctx.lineWidth=yw;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.bezierCurveTo(sx+W*.12,sy+W*.02,W*.72,W*.88,W*.95,W*.86); ctx.stroke();
  }});

/* =========================================================
   s214 쿠미히모 매듭끈
   ========================================================= */
GALLERY.add({ id:'s214', name:'차 종류별 매듭끈', cat:'직물',
  desc:'차 종류마다 끈 하나를 땋아 내려요. 한 마디가 기록 하나이고 왼쪽 가닥은 찻물 색, 오른쪽 가닥은 풍미 색이에요. 끝의 술에는 그 차들의 풍미가 모여요.',
  render(ctx,W,recs){
    const N=recs.length, s=W/480, types=H.TK.filter(t=>recs.some(r=>r.type===t)), nT=types.length;
    const sp=W*.78/nT, rodY=W*.09, by=W*.13, groups=types.map(t=>recs.filter(r=>r.type===t)), maxC=Math.max(...groups.map(g=>g.length));
    const u=Math.min(W*.034,W*.58/maxC), cw=Math.min(W*.05,sp*.5);
    ctx.lineCap='round'; ctx.strokeStyle='rgba(120,100,80,.4)'; ctx.lineWidth=W*.006;
    ctx.beginPath(); ctx.moveTo(W*.08,rodY); ctx.lineTo(W*.92,rodY); ctx.stroke();
    groups.forEach((g,ti)=>{ const x=W*.11+sp*(ti+.5), tc=H.TEAS[types[ti]].color, tcol=H.hex2rgb(tc);
      ctx.strokeStyle=lc(tcol,.6); ctx.lineWidth=s*1.2; ctx.beginPath(); ctx.ellipse(x,rodY+(by-rodY)*.45,cw*.22,(by-rodY)*.55,0,0,TAU); ctx.stroke();
      g.forEach((r,k)=>{ const y=by+k*u, L=[x-cw*.42,y], C=[x,y+u*1.05], Rr=[x+cw*.42,y];
        const draw=(A,col)=>{ ctx.strokeStyle=H.rgbStr(pc(col,.05,1.08)); ctx.lineWidth=Math.max(1.2,u*.62); ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(C[0],C[1]); ctx.stroke();
          ctx.strokeStyle=H.rgbStr(pc(col,.3,1),.8); ctx.lineWidth=Math.max(.6,u*.14); ctx.beginPath(); ctx.moveTo(A[0]+(C[0]-A[0])*.15,A[1]+(C[1]-A[1])*.15-u*.08); ctx.lineTo(A[0]+(C[0]-A[0])*.8,A[1]+(C[1]-A[1])*.8-u*.08); ctx.stroke(); };
        if(k%2){ draw(L,r.tea); draw(Rr,acc(r)); } else { draw(Rr,acc(r)); draw(L,r.tea); } });
      const ey=by+g.length*u+u*.6;
      ctx.strokeStyle=lc(tcol,.85); ctx.lineWidth=s*1.6; for(let q=0;q<2;q++){ ctx.beginPath(); ctx.moveTo(x-cw*.4,ey+q*s*3.5); ctx.lineTo(x+cw*.4,ey+q*s*3.5); ctx.stroke(); }
      const th=Math.max(10,Math.min(26,g.length*3)), cl=[]; g.forEach(r=>r.colors.slice(1).forEach(c=>cl.push(c.rgb)));
      for(let q=0;q<th;q++){ const t=q/(th-1)-.5, col=cl[q%cl.length]||tcol; ctx.strokeStyle=lc(col,.75); ctx.lineWidth=s*.8;
        ctx.beginPath(); ctx.moveTo(x+t*cw*.7,ey+s*6); ctx.quadraticCurveTo(x+t*cw*.8,ey+W*.05,x+t*cw*1.25+Math.sin(q*1.7)*s*2,ey+W*.1); ctx.stroke(); }
    });
  }});

/* =========================================================
   s215 뜨개 (knit)
   ========================================================= */
GALLERY.add({ id:'s215', name:'한 단씩 뜬 목도리', cat:'직물', bg:'#F6F3EC',
  desc:'기록 하나가 뜨개 한 단이에요. 아래에서 위로 마신 순서대로 떠 올라가고(길어지면 옆 폭으로 이어져요), 찻물 색 바탕에 향이 좋을수록 오른쪽에 풍미 색 무늬가 들어가요.',
  render(ctx,W,recs){
    const N=recs.length, rpr=Math.max(1,Math.round(24/N)), rows=N*rpr, P=Math.ceil(rows/36), per=Math.ceil(rows/P), gp=W*.04;
    const h=Math.min(W*.026,W*.76/per), sw=h*1.18, C=Math.floor((W*.78-(P-1)*gp)/P/sw), tw=P*C*sw+(P-1)*gp, y0=(W+per*h)/2;
    recs.forEach((r,k)=>{ const cm=Math.round(r.x*(C-1)), hw=1+Math.round(r.i*C*.14), base=pc(r.tea,.3,1), a1=pc(acc(r),.1,1.08), a2=pc(fl(r,1),.1,1.08);
      for(let m=0;m<rpr;m++){ const g=k*rpr+m, pi=Math.floor(g/per), row=g%per, x0=(W-tw)/2+pi*(C*sw+gp), y=y0-(row+.5)*h, mid=(rpr-1)/2, wdt=rpr>1?hw-Math.abs(m-mid)*1.3:hw;
        for(let c=0;c<C;c++){ const d=Math.abs(c-cm); let col=base;
          if(d<=wdt) col=(d===0||(d===Math.round(wdt)&&wdt>1))?a2:a1;
          else if(rpr>1&&m===0&&c%4===(k%4)) col=pc(acc(r),.4,1);
          const cx=x0+(c+.5)*sw; ctx.fillStyle=H.rgbStr(col);
          ctx.beginPath(); ctx.ellipse(cx-sw*.22,y,sw*.25,h*.62,-.55,0,TAU); ctx.fill();
          ctx.fillStyle=H.rgbStr(H.shade(col,-.06)); ctx.beginPath(); ctx.ellipse(cx+sw*.22,y,sw*.25,h*.62,.55,0,TAU); ctx.fill(); } } });
  }});

/* =========================================================
   s216 자수 꽃
   ========================================================= */
GALLERY.add({ id:'s216', name:'수놓은 꽃밭', cat:'실',
  desc:'기록 하나가 수놓은 꽃 한 송이예요. 꽃잎은 풍미 색 새틴 스티치, 가운데 매듭은 찻물 색이고, 진한 차일수록 꽃이 커요.',
  render(ctx,W,recs){
    const N=recs.length, m=W*.08, s=W/480, K=N<=10?1.25:N<=50?.82:.64;
    [...recs].sort((a,b)=>a.y-b.y).forEach(r=>{ const cx=m+r.x*(W-2*m), cy=m+r.y*(W-2*m), S=W*(.026+.03*r.i)*K, np=4+Math.min(3,r.fl.length), rot=H.hash(r.id)%628/100;
      for(let p=0;p<np;p++){ const a=rot+p/np*TAU, col=pc(fl(r,p),.03,1.12), ax=Math.cos(a), ay=Math.sin(a), nx=-ay, ny=ax, L=Math.max(5,Math.round(S/(W*.0042)));
        ctx.lineWidth=Math.max(.8,W*.0034); ctx.lineCap='round';
        for(let q=0;q<=L;q++){ const t=q/L, d=S*(.22+.78*t), hw=S*.2*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.8)+S*.02, sk=S*.05;
          ctx.strokeStyle=H.rgbStr(H.shade(col,q%2?.06:-.04)); ctx.beginPath(); ctx.moveTo(cx+ax*(d-sk)+nx*hw,cy+ay*(d-sk)+ny*hw); ctx.lineTo(cx+ax*(d+sk)-nx*hw,cy+ay*(d+sk)-ny*hw); ctx.stroke(); } }
      const kn=3+Math.round(r.i*3), tc=H.shade(r.tea,-.12); for(let q=0;q<kn;q++){ const a=q/kn*TAU+rot, d=q?S*.13:0; ctx.fillStyle=H.rgbStr(tc); ctx.beginPath(); ctx.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,Math.max(1,S*.075),0,TAU); ctx.fill(); }
    });
  }});

/* =========================================================
   s217 리본
   ========================================================= */
GALLERY.add({ id:'s217', name:'꼬인 리본', cat:'선',
  desc:'기록 하나가 가로로 흐르는 리본 하나예요. 맛이 좋을수록 위쪽을 지나고, 향이 좋을수록 더 많이 꼬여요. 앞면은 찻물 색, 뒷면은 풍미 색이에요.',
  render(ctx,W,recs){
    const N=recs.length, k=dk(N), M=Math.round(W*.35), x0=W*.06, x1=W*.94;
    recs.forEach(r=>{ const hs=H.hash(r.id), ph=hs%628/100, yc=W*(.12+.76*r.y), A=W*(.02+.03*((hs>>8)%100/100)), om=TAU*(.6+.5*((hs>>4)%100/100)), tw=TAU*(.8+2.6*r.x), w0=W*(.01+.014*r.i)*(.3+.7*k);
      const front=pc(r.tea,.08,1.05), back=pc(acc(r),.05,1.1);
      let prev=null;
      for(let q=0;q<=M;q++){ const t=q/M, x=x0+t*(x1-x0), y=yc+A*Math.sin(t*om+ph), c=Math.cos(t*tw+ph*1.7), w=w0*c;
        const dy=A*om/(x1-x0)*Math.cos(t*om+ph), nl=Math.hypot(1,dy), nx=-dy/nl, ny=1/nl, P=[x+nx*w,y+ny*w,x-nx*w,y-ny*w];
        if(prev){ ctx.fillStyle=H.rgbStr(c>=0?front:back,.82*(.55+.45*Math.abs(c))*(.5+.5*k)); ctx.beginPath(); ctx.moveTo(prev[0],prev[1]); ctx.lineTo(P[0],P[1]); ctx.lineTo(P[2],P[3]); ctx.lineTo(prev[2],prev[3]); ctx.closePath(); ctx.fill(); }
        prev=P; } });
  }});

/* =========================================================
   s218 에코 퀼트
   ========================================================= */
GALLERY.add({ id:'s218', name:'아플리케 퀼트', cat:'직물', bg:'#F6F3EC',
  desc:'비슷한 자리의 기록끼리 동그스름한 조각천 하나를 나눠 써요. 조각 안쪽으로 한 잔마다 한 겹씩 색 띠와 퀼팅 땀이 늘어나요.',
  render(ctx,W,recs){
    const N=recs.length, m=W*.07, n=150, S=W-2*m, s=W/480, k=dk(N), d1a=new Float32Array(n*n), id=new Int32Array(n*n), band=.0125+.004*k;
    const cent=[]; recs.forEach(r=>{ let best=null, bd=.06; for(const c of cent){ const d=Math.hypot(c.x-r.x,c.y-r.y); if(d<bd){ bd=d; best=c; } } if(best) best.m.push(r); else cent.push({x:r.x,y:r.y,m:[r]}); });
    const rad=cent.map(c=>Math.min(.2,.05+band*(c.m.length+1.5)));
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const u=i/(n-1), v=j/(n-1); let a=1e9,b=1e9,ai=0;
      cent.forEach((c,q)=>{ const d=Math.hypot(u-c.x,v-c.y); if(d<a){ b=a; a=d; ai=q; } else if(d<b) b=d; });
      const e=Math.min((b-a)/2,rad[ai]-a); d1a[j*n+i]=e; id[j*n+i]=e>0?ai:-1; }
    const colOf=(q,e)=>{ const c=cent[q], z=Math.min(c.m.length-1,Math.floor(Math.max(0,e)/band)), r=c.m[z]; return pc(H.mix(r.tea,acc(r),z%2?.65:.3),.45,1.08); };
    ctx.save(); ctx.beginPath(); ctx.rect(m,m,S,S); ctx.clip(); ctx.strokeStyle='rgba(150,130,110,.2)'; ctx.lineWidth=s*.8; ctx.setLineDash([W*.008,W*.006]);
    const gs=W*.045; for(let q=-W;q<W*2;q+=gs){ ctx.beginPath(); ctx.moveTo(q,0); ctx.lineTo(q+W,W); ctx.moveTo(q,W); ctx.lineTo(q+W,0); ctx.stroke(); } ctx.restore(); ctx.setLineDash([]);
    const cv=document.createElement('canvas'); cv.width=cv.height=n; const x=cv.getContext('2d'), im=x.createImageData(n,n);
    for(let q=0;q<n*n;q++){ if(id[q]<0) continue; const c=colOf(id[q],d1a[q]), al=H.ss(0,.003,d1a[q]); im.data[q*4]=c[0]*255; im.data[q*4+1]=c[1]*255; im.data[q*4+2]=c[2]*255; im.data[q*4+3]=255*al; }
    x.putImageData(im,0,0); ctx.save(); ctx.imageSmoothingQuality='high'; const cs=S/(n-1); ctx.drawImage(cv,m-cs/2,m-cs/2,cs*n,cs*n); ctx.restore();
    ctx.lineCap='round'; const toP=p=>[m+p[0]/(n-1)*S,m+p[1]/(n-1)*S];
    const lv=[.0025]; for(let q=1;q<=16;q++) lv.push(q*band);
    lv.forEach((L,li)=>{ for(const line of isoLines(d1a,n,L)){ if(line.length<4) continue; const g=line[Math.floor(line.length/2)], q=id[Math.min(n-1,Math.round(g[1]))*n+Math.min(n-1,Math.round(g[0]))]; if(q<0) continue;
      if(li&&li>=cent[q].m.length) continue;
      ctx.strokeStyle=H.rgbStr(deep(H.shade(colOf(q,L-band*.5),-.3)),li?.8:.9); ctx.lineWidth=s*(li?.85:1); ctx.setLineDash(li?[W*.008,W*.006]:[]);
      ctx.beginPath(); smooth(ctx,line.map(toP),false); ctx.stroke(); } });
    ctx.setLineDash([]); ctx.strokeStyle='rgba(150,130,110,.4)'; ctx.lineWidth=W*.01; ctx.strokeRect(m,m,S,S);
  }});

/* =========================================================
   s219 현 (harp strings)
   ========================================================= */
GALLERY.add({ id:'s219', name:'이캇 날실', cat:'직물', bg:'#F4F0E8',
  desc:'기록 하나가 염색한 날실 한 묶음이에요. 향이 좋았던 차일수록 오른쪽에 놓이고, 맛이 좋았던 높이에 찻물 색과 풍미 색이 번지듯 물들어 있어요.',
  render(ctx,W,recs){
    const N=recs.length, tpr=Math.max(1,Math.round(84/N)), T=N*tpr, x0=W*.1, x1=W*.9, tw=(x1-x0)/T, top=W*.07, bot=W*.93, s=W/480;
    ctx.lineCap='butt'; ctx.lineWidth=tw*.78; ctx.strokeStyle='rgb(228,221,207)';
    for(let t=0;t<T;t++){ const x=x0+(t+.5)*tw; ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x,bot); ctx.stroke(); }
    const srt=[...recs].sort((a,b)=>a.x-b.x), wn=N>20?3:0, ys=srt.map((r,k)=>{ let a=0,b=0; for(let z=-wn;z<=wn;z++){ const q=srt[k+z]; if(!q) continue; const w=1/(1+Math.abs(z)); a+=q.y*w; b+=w; } return r.y*.4+a/b*.6; });
    srt.forEach((r,k)=>{ const R=H.rng(H.hash(r.id)), yc=W*(.14+.72*ys[k]), hh=W*(.035+.085*r.i)*(.55+.45*dk(N)), cols=[r.tea,...r.colors.slice(1).map(c=>c.rgb)];
      for(let q=0;q<tpr;q++){ const t=k*tpr+q, x=x0+(t+.5)*tw, mid=(tpr-1)/2, sh=tpr>1?1-Math.abs(q-mid)/(mid+1)*.85:1;
        const yy=yc+(H.noise(t*.25,7)-.5)*W*(N>20?.015:.03), h=hh*sh*(.92+.16*R()), jt=(R()-.5)*W*.01;
        const seg=(y1,y2,c,a)=>{ ctx.strokeStyle=H.rgbStr(c,a); ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke(); };
        // 번짐(이캇 특유의 깃털 같은 가장자리)
        for(let z=0;z<(N>20?1:3);z++){ const e=W*(.006+.01*R()); seg(yy-h-e+jt,yy-h+jt,pc(r.tea,.15,1),.35); seg(yy+h+jt,yy+h+e+jt,pc(r.tea,.15,1),.35); }
        const nb=cols.length, bh=2*h/(2*nb-1);
        for(let z=0;z<2*nb-1;z++){ const c=cols[Math.abs(z-(nb-1))===nb-1?0:(nb-1-Math.abs(z-(nb-1)))]; seg(yy-h+jt+z*bh,yy-h+jt+(z+1)*bh+.5,pc(c,.06,1.08),.95); }
      } });
    ctx.lineCap='round'; ctx.strokeStyle='rgba(120,100,80,.35)'; ctx.lineWidth=W*.006;
    ctx.beginPath(); ctx.moveTo(x0-W*.03,top); ctx.lineTo(x1+W*.03,top); ctx.moveTo(x0-W*.03,bot); ctx.lineTo(x1+W*.03,bot); ctx.stroke();
  }});

/* =========================================================
   s220 해칭
   ========================================================= */
GALLERY.add({ id:'s220', name:'수틀 위 햇살', cat:'실', bg:'#F3F0E9',
  desc:'수틀 가운데서 기록마다 홈질 한 줄을 바깥으로 뻗어요. 마신 순서대로 시계 방향으로 돌고, 향과 맛이 좋을수록 길게 뻗으며 끝의 매듭은 풍미 색이에요.',
  render(ctx,W,recs){
    const N=recs.length, k=dk(N), cx=W/2, cy=W/2, R=W*.42, s=W/480;
    ctx.fillStyle='#FAF8F3'; ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(160,130,100,.45)'; ctx.lineWidth=W*.009; ctx.beginPath(); ctx.arc(cx,cy,R,0,TAU); ctx.stroke();
    ctx.lineWidth=W*.004; ctx.beginPath(); ctx.arc(cx,cy,R+W*.011,0,TAU); ctx.stroke();
    ctx.fillStyle='rgba(160,130,100,.45)'; ctx.fillRect(cx-W*.018,cy-R-W*.03,W*.036,W*.018);
    const r0=R*(.1+.06*(1-k)), dl=W*(.011+.004*k), gp=W*.0065;
    ctx.lineCap='round';
    recs.forEach((r,q)=>{ const a=-Math.PI/2+(q+.5)/N*TAU, ca=Math.cos(a), sa=Math.sin(a), good=(r.x+(1-r.y))/2, L=r0+(R*.86-r0)*(.18+.82*good)*(.92+.08*r.i), cols=[r.tea,...r.colors.slice(1).map(c=>c.rgb)];
      ctx.lineWidth=s*(1.1+.5*k); let z=0;
      for(let d=r0;d<L-dl*.3;d+=dl+gp,z++){ const e=Math.min(L,d+dl); ctx.strokeStyle=lc(pc(cols[z%cols.length],0,1.12),.9);
        ctx.beginPath(); ctx.moveTo(cx+ca*d,cy+sa*d); ctx.lineTo(cx+ca*e,cy+sa*e); ctx.stroke(); }
      const kr=W*(.004+.006*r.i)*(.55+.45*k), kx=cx+ca*(L+kr*1.6), ky=cy+sa*(L+kr*1.6);
      ctx.fillStyle=lc(pc(acc(r),0,1.12),.95); ctx.beginPath(); ctx.arc(kx,ky,kr,0,TAU); ctx.fill();
      ctx.strokeStyle=H.rgbStr(H.shade(pc(acc(r),0,1.1),.35),.9); ctx.lineWidth=Math.max(.6,kr*.35); ctx.beginPath(); ctx.arc(kx,ky,kr*.45,0,TAU); ctx.stroke(); });
    ctx.strokeStyle='rgba(160,130,100,.35)'; ctx.lineWidth=s; ctx.setLineDash([W*.006,W*.005]); ctx.beginPath(); ctx.arc(cx,cy,r0*.7,0,TAU); ctx.stroke(); ctx.setLineDash([]);
  }});

})();
