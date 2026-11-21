/* =========================================================
   TEA CANVAS 시각화 갤러리 — 공용 틀
   - 모든 시안이 같은 기록 데이터(10/50/100개)와 같은 도구(H)를 쓴다
   - 시안 등록: GALLERY.add({id, name, cat, desc, bg?, render(ctx, W, recs, H)})
   ========================================================= */
/* @@D3_BEGIN (src/drop3d.js에서 빌드) */
/* =========================================================
   D3 — 3D 찻방울 (WebGL, 라이브러리 없음)
   방울 속 3D 색 공간: 찻물 색(바탕) 위에 풍미 잉크가 각자 자리에서 번지고,
   흐르는 노이즈로 경계가 섞인다. 같은 색 공간을 JS로도 계산해 2D 캔버스에 칠한다.
   ========================================================= */
const D3 = (()=>{
  const VERT = `attribute vec2 p; varying vec2 v; void main(){ v=p; gl_Position=vec4(p,0.,1.); }`;
  const GLSL_FIELD = `
float h3(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n3(p); p=p*2.02+vec3(3.1,1.7,5.3); a*=.5; } return s; }
uniform vec3 baseC; uniform float baseW; uniform vec3 inkC[10]; uniform vec3 inkP[10]; uniform float inkW[10]; uniform float t, flow, swirl;
vec3 fieldC(vec3 q){
  vec3 w=vec3(fbm(q*1.6+vec3(0.,0.,t*flow)), fbm(q*1.6+vec3(5.2,1.3,-t*flow)), fbm(q*1.6+vec3(2.7,8.1,t*flow*.7)));
  q+=(w-.5)*swirl;
  float b=baseW*baseW*sqrt(baseW); vec3 acc=baseC*b; float tot=b;
  for(int i=0;i<10;i++){
    float wi=inkW[i]; if(wi<.001) continue;
    vec3 d=q-inkP[i]; float f=wi*exp(-dot(d,d)/(.06+.3*wi));
    f=f*f*sqrt(f); acc+=inkC[i]*f; tot+=f;
  }
  return acc/max(tot,1e-6);
}`;
  const FRAG = `precision highp float; varying vec2 v; uniform mat3 rot; uniform float wob, glit;
${GLSL_FIELD}
void main(){
  vec2 uv=v; float r=length(uv), ang=atan(uv.y,uv.x);
  float R=.8+wob*(.012*sin(t*1.3)+.024*(n3(vec3(cos(ang)*1.3,sin(ang)*1.3,t*.3))-.5));
  if(r>R){ gl_FragColor=vec4(0.); return; }
  vec2 s=uv/R; float z=sqrt(max(0.,1.-dot(s,s)));
  vec3 N=vec3(s,z), col=vec3(0.); float ws=0.;
  for(int k=0;k<2;k++){ float zz=z*(1.-float(k)*.6); vec3 q=rot*vec3(s*.94,zz*.94); float w=k==0?1.:.3; col+=fieldC(q)*w; ws+=w; }
  col/=ws;
  float lum=dot(col,vec3(.299,.587,.114)); col=clamp(mix(vec3(lum),col,1.28),0.,1.);
  vec3 L=normalize(vec3(-.45,.6,.65));
  col*=.9+.16*max(dot(N,L),0.);
  float fres=pow(1.-z,2.6);
  col=mix(col,col*.72,fres*.6);
  col+=pow(max(dot(reflect(-L,N),vec3(0,0,1)),0.),46.)*.6;
  col+=vec3(.95,.97,1.)*smoothstep(.45,1.,fres)*.28;
  if(glit>0.){ // 표면의 색 입자: 가까이 보면 방울이 작은 점들로 이루어져 있다
    vec3 qs=rot*vec3(s,z)*.97; vec3 cell=floor(qs*34.); float hh=h3(cell+7.3);
    vec3 cc=(cell+.5+(vec3(h3(cell+1.1),h3(cell+2.2),h3(cell+3.3))-.5)*.5)/34.;
    float dd=length(qs-cc)*34., sp=step(.55,hh)*smoothstep(.42,.12,dd)*smoothstep(.0,.35,z);
    vec3 pc=fieldC(cc); float tw=.75+.25*sin(t*2.2+hh*60.);
    col=mix(col,clamp(pc*1.12+.04,0.,1.)*tw+vec3(.12)*step(.93,hh),sp*glit*.85);
  }
  float a=smoothstep(R,R-.014,r);
  gl_FragColor=vec4(col*a,a);
}`;

  /* ---------- 색 공간 데이터 ---------- */
  const rng = seed => { let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  const hash = s => { let h=2166136261; for(const ch of String(s)){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
  const rgb = h => { const n=parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; };
  // comps: [{key:'tea',c,w}, {key:flavor,c,w}...] → 바탕 + 잉크(강한 풍미는 가운데 가까이, 약한 풍미는 가장자리)
  function fromComps(id,comps){
    const r=rng(hash(id)), tea=comps.find(c=>c.key==='tea')||comps[0];
    const fl=comps.filter(c=>c!==tea).sort((a,b)=>b.w-a.w).slice(0,5);
    // 풍미마다 1~3개의 덩어리를 방울 표면 가까이 고르게 흩어, 어느 쪽으로 돌려도 색이 보이게
    const lobes=[]; fl.forEach(c=>{ for(let k=0,n=1+Math.round(c.w*2);k<n;k++) lobes.push(c); });
    const L=lobes.slice(0,10), N=L.length, off=r()*6.28;
    const order=L.map((_,i)=>i).sort(()=>r()-.5);
    const inks=L.map((c,j)=>{
      const i=order[j], y=1-2*(i+.5)/N, s=Math.sqrt(1-y*y), th=i*2.39996+off, d=.6+.22*r();
      return {key:c.key,c:rgb(c.c),p:[s*Math.cos(th)*d,y*d,s*Math.sin(th)*d],w:c.w};
    });
    return {base:rgb(tea.c),baseW:fl.length?.3:1,inks};
  }

  /* ---------- 같은 색 공간을 JS로 (2D 캔버스용) ---------- */
  const fr=x=>x-Math.floor(x);
  function h3(x,y,z){ x=fr(x*.3183099+.1)*17; y=fr(y*.3183099+.1)*17; z=fr(z*.3183099+.1)*17; return fr(x*y*z*(x+y+z)); }
  function n3(x,y,z){
    const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z); let fx=x-ix, fy=y-iy, fz=z-iz;
    fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
    const L=(a,b,t)=>a+(b-a)*t;
    return L(L(L(h3(ix,iy,iz),h3(ix+1,iy,iz),fx),L(h3(ix,iy+1,iz),h3(ix+1,iy+1,iz),fx),fy),
             L(L(h3(ix,iy,iz+1),h3(ix+1,iy,iz+1),fx),L(h3(ix,iy+1,iz+1),h3(ix+1,iy+1,iz+1),fx),fy),fz);
  }
  function fbm(x,y,z){ let s=0,a=.5; for(let i=0;i<4;i++){ s+=a*n3(x,y,z); x=x*2.02+3.1; y=y*2.02+1.7; z=z*2.02+5.3; a*=.5; } return s; }
  function colorAt(F,x,y,z,t=0,flow=.04,swirl=.9){
    const wx=fbm(x*1.6,y*1.6,z*1.6+t*flow), wy=fbm(x*1.6+5.2,y*1.6+1.3,z*1.6-t*flow), wz=fbm(x*1.6+2.7,y*1.6+8.1,z*1.6+t*flow*.7);
    x+=(wx-.5)*swirl; y+=(wy-.5)*swirl; z+=(wz-.5)*swirl;
    const bw=F.baseW**2.5; let r=F.base[0]*bw, g=F.base[1]*bw, b=F.base[2]*bw, tot=bw;
    for(const k of F.inks){ const w=k.w*(k.vis??1); if(w<.001) continue; const dx=x-k.p[0], dy=y-k.p[1], dz=z-k.p[2];
      let f=w*Math.exp(-(dx*dx+dy*dy+dz*dz)/(.06+.3*w)); f=f*f*Math.sqrt(f); r+=k.c[0]*f; g+=k.c[1]*f; b+=k.c[2]*f; tot+=f; }
    r/=tot; g/=tot; b/=tot; const l=.299*r+.587*g+.114*b, S=1.35, c=v=>Math.max(0,Math.min(1,l+(v-l)*S));
    return [c(r),c(g),c(b)];
  }

  /* ---------- 렌더러 ---------- */
  function makeGL(cv,preserve=false){
    const gl=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:true,preserveDrawingBuffer:preserve});
    if(!gl) return null;
    const sh=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr=gl.createProgram(); gl.attachShader(pr,sh(gl.VERTEX_SHADER,VERT)); gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const U={}; ['rot','wob','glit','baseC','baseW','inkC','inkP','inkW','t','flow','swirl'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    return {gl,
      draw(F,yaw,pitch,t,o={}){
        const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
        // R = Ry(yaw) * Rx(pitch), column-major
        gl.uniformMatrix3fv(U.rot,false,[cy,0,-sy, sy*sp,cp,cy*sp, sy*cp,-sp,cy*cp]);
        gl.uniform1f(U.t,t); gl.uniform1f(U.wob,o.wob??1); gl.uniform1f(U.glit,o.glit??0); gl.uniform1f(U.flow,o.flow??.04); gl.uniform1f(U.swirl,o.swirl??.9);
        gl.uniform3fv(U.baseC,F.base); gl.uniform1f(U.baseW,F.baseW);
        const C=[],P=[],W=[]; for(let i=0;i<10;i++){ const k=F.inks[i]; C.push(...(k?k.c:[0,0,0])); P.push(...(k?k.p:[0,0,0])); W.push(k?k.w*(k.vis??1):0); }
        gl.uniform3fv(U.inkC,C); gl.uniform3fv(U.inkP,P); gl.uniform1fv(U.inkW,W);
        gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      },
      dispose(){ const e=gl.getExtension('WEBGL_lose_context'); e&&e.loseContext(); }};
  }
  // 스냅샷용 공유 렌더러(화면 밖 캔버스 하나)
  let snapR=null, snapCv=null;
  function snapshot(F,px,yaw=0,pitch=0,t=0,o){
    if(!snapCv){ snapCv=document.createElement('canvas'); try{ snapR=makeGL(snapCv,true); }catch(e){ snapR=null; } }
    if(!snapR) return null;
    if(snapCv.width!==px){ snapCv.width=snapCv.height=px; }
    snapR.draw(F,yaw,pitch,t,{wob:0,...o}); return snapCv;
  }

  /* 화면 속 3D 방울: 자동으로 천천히 돌고, interactive면 드래그로 돌려본다 */
  function mount(el,F,{size=200,px=null,interactive=false,spin=.32,flow=.04,swirl=.9,wob=1,glit=0,onFrame=null}={}){
    const cv=document.createElement('canvas'); cv.className='d3'; cv.style.width=cv.style.height=size+'px';
    let R; try{ R=makeGL(cv); }catch(e){ R=null; } if(!R) return null;
    el.innerHTML=''; el.appendChild(cv);
    const n=px||Math.min(1000,Math.round(size*Math.min(2,window.devicePixelRatio||1)*(typeof SCALE!=='undefined'?SCALE:1))); cv.width=cv.height=n;
    const st={F,yaw:Math.random()*6.28,pitch:.25,vy:spin,drag:false,t0:performance.now(),last:performance.now()};
    if(interactive){
      cv.style.cursor='grab'; cv.style.touchAction='none';
      let px0=0,py0=0,lt=0;
      cv.addEventListener('pointerdown',e=>{ st.drag=true; cv.setPointerCapture(e.pointerId); px0=e.clientX; py0=e.clientY; lt=performance.now(); cv.style.cursor='grabbing'; });
      cv.addEventListener('pointermove',e=>{ if(!st.drag) return; const b=cv.getBoundingClientRect(), k=4/b.width, now=performance.now(), dx=(e.clientX-px0)*k, dy=(e.clientY-py0)*k;
        st.yaw+=dx; st.pitch=Math.max(-1.2,Math.min(1.2,st.pitch+dy)); st.vy=dx/Math.max(.008,(now-lt)/1000); px0=e.clientX; py0=e.clientY; lt=now; });
      const up=()=>{ st.drag=false; cv.style.cursor='grab'; st.vy=Math.max(-4,Math.min(4,st.vy)); };
      cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
    }
    (function loop(now){
      if(!cv.isConnected){ R.dispose(); return; }
      const dt=Math.min(.05,(now-st.last)/1000); st.last=now; const t=(now-st.t0)/1000;
      if(!st.drag){ st.vy+=(spin-st.vy)*Math.min(1,dt*1.5); st.yaw+=st.vy*dt; st.pitch+=(.25-st.pitch)*dt*.6; }
      onFrame&&onFrame(t,st);
      R.draw(st.F,st.yaw,st.pitch,t,{flow,swirl,wob,glit:st.glit??glit});
      requestAnimationFrame(loop);
    })(performance.now());
    return st;
  }
  return {fromComps,colorAt,snapshot,mount,rgb,rng,hash};
})();
/* @@D3_END */

(function(){
  const G = window.GALLERY = { styles: [], add(s){ if(!s.id||!s.render) throw new Error('id/render 필요'); this.styles.push(s); } };

  /* ---------- 색 ---------- */
  const TEAS = {
    green:{label:'녹차',color:'#B5D07E'}, white:{label:'백차',color:'#EEDC9A'}, oolong:{label:'우롱차',color:'#E3A03A'},
    black:{label:'홍차',color:'#CF5E3A'}, dark:{label:'보이차',color:'#7C3E2C'}, herb:{label:'허브차',color:'#C4B2E2'},
  };
  const FLAVORS = {
    floral:{label:'꽃향',color:'#E9A9C6'}, fruity:{label:'과일향',color:'#F2946A'}, citrus:{label:'시트러스',color:'#E8D45A'},
    vegetal:{label:'풀향',color:'#96C46A'}, fresh:{label:'상쾌함',color:'#79C3BC'}, nutty:{label:'고소함',color:'#A87A4E'},
    sweet:{label:'단맛',color:'#E5B04F'}, earthy:{label:'흙·나무향',color:'#6B5643'}, spicy:{label:'스파이시',color:'#B8513A'},
    soft:{label:'부드러움',color:'#E3D3BF'}, astringent:{label:'떫은맛',color:'#8E8A4C'},
  };
  const TK=Object.keys(TEAS), FK=Object.keys(FLAVORS);
  const hex2rgb = h => { const n=parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; };
  const rgb2hex = c => '#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0')).join('');
  const rgbStr = (c,a=1) => `rgba(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)},${a})`;
  const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
  const lum = c => .2126*c[0]+.7152*c[1]+.0722*c[2];
  const pastel = (c,lift=.1,sat=1.15) => { const l=lum(c); return c.map(v=>{ v=l+(v-l)*sat; v=Math.max(0,Math.min(1,v)); return v+(1-v)*lift; }); };
  const shade = (c,f) => c.map(v=>f<0?v*(1+f):v+(1-v)*f);
  const lin=v=>Math.pow(v,2.2), gam=v=>Math.pow(Math.max(0,v),1/2.2);

  /* ---------- 수학 ---------- */
  const rng = seed => { let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
  const hash = s => { let h=2166136261; for(const ch of String(s)){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
  const ss=(a,b,x)=>{ const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); };
  const fr=x=>x-Math.floor(x), h2=(x,y)=>fr(Math.sin(x*127.1+y*311.7)*43758.5453);
  function noise(x,y){ const ix=Math.floor(x), iy=Math.floor(y); let fx=x-ix, fy=y-iy; fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy);
    const a=h2(ix,iy), b=h2(ix+1,iy), c=h2(ix,iy+1), d=h2(ix+1,iy+1); return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy; }
  const fbm=(x,y,o=4)=>{ let s=0,a=.5,f=1; for(let i=0;i<o;i++){ s+=a*noise(x*f+i*5.3,y*f+i*1.7); f*=2.03; a*=.5; } return s/(1-Math.pow(.5,o)); };
  const gauss=r=>(r()+r()+r()+r()-2)/2;

  /* ---------- 기록 데이터 ----------
     rec = { id, idx(오래된 순 0..), type, teaLabel, tea(rgb), teaHex, fl:[{k,label,hex,rgb,w}], colors:[{key,hex,rgb,w}] (찻물 먼저),
             x(마시기 전 향 0=아쉬움 1=좋음), y(마신 뒤 맛 0=좋음(위) 1=아쉬움(아래)), i(진하기 .3~1), stars(0~3), daysAgo, date }
     좌표계: 캔버스 위쪽이 '맛이 좋아요', 오른쪽이 '향이 좋아요' (앱과 동일)                                   */
  function makeRecs(N=100, seed=20261121){
    const r=rng(seed), out=[];
    // 사람마다 취향 쏠림이 있다: 몇 개의 '취향 덩어리' 주변에 모인다
    const clusters=[{x:.72,y:.28,s:.13,tea:['green','oolong','white'],fl:['vegetal','floral','sweet','fresh']},
                    {x:.82,y:.62,s:.1,tea:['black','oolong'],fl:['fruity','citrus','spicy']},
                    {x:.3,y:.35,s:.12,tea:['herb','white'],fl:['floral','soft','sweet']},
                    {x:.28,y:.75,s:.12,tea:['dark','black'],fl:['earthy','astringent','nutty']},
                    {x:.55,y:.5,s:.22,tea:TK,fl:FK}];
    const wts=[.34,.16,.18,.12,.2];
    for(let i=0;i<N;i++){
      let u=r(), ci=0; while(u>wts[ci]){ u-=wts[ci]; ci++; } const C=clusters[ci];
      const type=r()<.75?C.tea[Math.floor(r()*C.tea.length)]:TK[Math.floor(r()*TK.length)];
      const nf=1+Math.floor(r()*3), used=new Set(), fl=[];
      for(let k=0;k<nf;k++){ let f; let g=0; do{ f=r()<.7?C.fl[Math.floor(r()*C.fl.length)]:FK[Math.floor(r()*FK.length)]; g++; }while(used.has(f)&&g<20); if(used.has(f)) continue; used.add(f);
        fl.push({k:f,label:FLAVORS[f].label,hex:FLAVORS[f].color,rgb:hex2rgb(FLAVORS[f].color),w:+(.35+r()*.6).toFixed(2)}); }
      fl.sort((a,b)=>b.w-a.w);
      const x=clamp(C.x+gauss(r)*C.s,.04,.96), y=clamp(C.y+gauss(r)*C.s,.04,.96);
      const teaHex=TEAS[type].color, daysAgo=Math.round((N-1-i)*(200/N)+r()*2);
      const d=new Date(2026,10,21); d.setDate(d.getDate()-daysAgo);
      out.push({id:'r'+i,idx:i,type,teaLabel:TEAS[type].label,tea:hex2rgb(teaHex),teaHex,fl,
        colors:[{key:'tea',hex:teaHex,rgb:hex2rgb(teaHex),w:.5},...fl.map(f=>({key:f.k,hex:f.hex,rgb:f.rgb,w:f.w}))],
        x,y,i:+(.3+r()*.7).toFixed(2),stars:Math.round(clamp((1-y)*2.2+(x)*1.2+gauss(r)*.6,0,3)),daysAgo,date:d});
    }
    return out; // 오래된 기록 → 최근 기록 순
  }
  const ALL=makeRecs(100);
  // 10/50개 버전은 '처음 n잔을 마셨을 때'(같은 사람의 과거 시점)
  G.recs = n => ALL.slice(0,n).map(r=>({...r}));

  /* ---------- 3D 찻방울 색 공간 ---------- */
  const FCACHE=new Map();
  const dropField = rec => { if(!FCACHE.has(rec.id)) FCACHE.set(rec.id, D3.fromComps(rec.id, rec.colors.map(c=>({key:c.key,c:c.hex,w:c.w})))); return FCACHE.get(rec.id); };
  // 방울 속 한 점(x,y,z ∈ 단위 구)의 색
  const dropColorAt = (rec,x,y,z) => D3.colorAt(dropField(rec),x,y,z);
  // 방울 겉면을 원판으로 펼친 색 (u,v ∈ [-1,1], 가운데=앞면, 가장자리=뒷면)
  function dropDiscColor(rec,u,v){ const rho=Math.min(1,Math.hypot(u,v)), th=2*Math.asin(rho), ph=Math.atan2(v,u), s=Math.sin(th);
    return dropColorAt(rec,s*Math.cos(ph)*.88,s*Math.sin(ph)*.88,Math.cos(th)*.88); }
  // 3D 방울 스냅샷(WebGL, 광택 있는 구). 반환된 캔버스는 공유되므로 바로 drawImage할 것
  const dropSnapshot = (rec,px,yaw=hash(rec.id)%628/100,pitch=.3) => D3.snapshot(dropField(rec),px,yaw,pitch,0);

  /* ---------- 캔버스 전체 색면 (그라데이션 시안의 엔진) ---------- */
  function pointsOf(rec){
    if(rec._pts) return rec._pts;
    const yaw=hash(rec.id)%628/100, out=[], dirs=[[0,0,1,1]];
    for(let k=0;k<6;k++){ const a=k/6*6.283; dirs.push([Math.cos(a)*.93,Math.sin(a)*.93,-.35,.75]); }
    for(const [x,y,z,w] of dirs){ const cy=Math.cos(yaw), sy=Math.sin(yaw), qx=x*cy+z*sy, qz=-x*sy+z*cy, n=Math.hypot(qx,y,qz);
      out.push({dx:x*.6,dy:y*.6,c:dropColorAt(rec,qx/n*.9,y/n*.9,qz/n*.9).map(lin),w}); }
    return rec._pts=out;
  }
  // 반환: {n, col(선형 RGB), cov(0~1 덮임)}; sample(F,u,v) → [r,g,b(감마), cov]
  function field(recs,n=120,{spread=1.25,sharp=2,warp=null}={}){
    const dens=Math.min(1,Math.sqrt(12/Math.max(12,recs.length)))*.35+.65, P=[];
    recs.forEach(r=>{ const R=(.045+.05*r.i)*spread*dens; pointsOf(r).forEach(p=>P.push({x:r.x+p.dx*R,y:r.y+p.dy*R,s2:2*(R*.75)**2,a:p.w*(.6+.4*r.i),c:p.c})); });
    const col=new Float32Array(n*n*3), cov=new Float32Array(n*n);
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){
      let u=(i+.5)/n, v=(j+.5)/n; if(warp){ const o=warp(u,v); u+=o[0]; v+=o[1]; }
      let r=0,g=0,b=0,ws=0,tot=0;
      for(const p of P){ const dx=u-p.x, dy=v-p.y, e=p.a*Math.exp(-(dx*dx+dy*dy)/p.s2); if(e<1e-4) continue; const w=Math.pow(e,sharp); r+=p.c[0]*w; g+=p.c[1]*w; b+=p.c[2]*w; ws+=w; tot+=e; }
      const k=j*n+i; if(ws>0){ col[k*3]=r/ws; col[k*3+1]=g/ws; col[k*3+2]=b/ws; } cov[k]=1-Math.exp(-tot*2.2);
    }
    return {col,cov,n};
  }
  function sample(F,u,v){ const n=F.n, x=clamp(u*n-.5,0,n-1.001), y=clamp(v*n-.5,0,n-1.001), i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j;
    const at=(a,b)=>{ const k=b*n+a; return [F.col[k*3],F.col[k*3+1],F.col[k*3+2],F.cov[k]]; };
    const A=at(i,j),B=at(i+1,j),C=at(i,j+1),D=at(i+1,j+1), o=A.map((_,q)=>A[q]*(1-fx)*(1-fy)+B[q]*fx*(1-fy)+C[q]*(1-fx)*fy+D[q]*fx*fy);
    return [gam(o[0]),gam(o[1]),gam(o[2]),o[3]]; }
  // 색면을 그대로 칠하기(부드러운 메시 그라데이션). shade(rgb(감마), cov, u, v) → [r,g,b,(a)] 0~255
  function paintField(ctx,W,F,shadeFn,blur=.014){
    const n=F.n, c=document.createElement('canvas'); c.width=c.height=n; const x=c.getContext('2d'), im=x.createImageData(n,n), d=im.data;
    for(let k=0;k<n*n;k++){ const rgb=[gam(F.col[k*3]),gam(F.col[k*3+1]),gam(F.col[k*3+2])], o=shadeFn(rgb,F.cov[k],(k%n+.5)/n,(Math.floor(k/n)+.5)/n);
      d[k*4]=o[0]; d[k*4+1]=o[1]; d[k*4+2]=o[2]; d[k*4+3]=o.length>3?o[3]:255; }
    x.putImageData(im,0,0);
    const m=document.createElement('canvas'); m.width=m.height=n*3; const mx=m.getContext('2d'); mx.imageSmoothingQuality='high'; mx.drawImage(c,0,0,n*3,n*3);
    ctx.save(); ctx.imageSmoothingQuality='high'; if(blur) ctx.filter=`blur(${Math.round(W*blur)}px)`; const o=blur?W*.04:0; ctx.drawImage(m,-o,-o,W+2*o,W+2*o); ctx.restore();
  }

  /* ---------- 점 배치 ---------- */
  const PDS=new Map();
  function poisson(W,d,seed=1){
    const key=W+'|'+d.toFixed(2)+'|'+seed; if(PDS.has(key)) return PDS.get(key);
    const r=rng(seed), cs=d/Math.SQRT2, gw=Math.ceil(W/cs), grid=new Int32Array(gw*gw).fill(-1), pts=[], act=[];
    const add=(x,y)=>{ pts.push([x,y]); act.push(pts.length-1); grid[Math.floor(y/cs)*gw+Math.floor(x/cs)]=pts.length-1; };
    add(r()*W,r()*W);
    while(act.length){ const ai=Math.floor(r()*act.length), [px,py]=pts[act[ai]]; let ok=false;
      for(let t=0;t<20;t++){ const a=r()*6.283, rr=d*(1+r()), x=px+Math.cos(a)*rr, y=py+Math.sin(a)*rr; if(x<0||y<0||x>=W||y>=W) continue;
        const gx=Math.floor(x/cs), gy=Math.floor(y/cs); let far=true;
        for(let j=Math.max(0,gy-2);j<=Math.min(gw-1,gy+2)&&far;j++) for(let i=Math.max(0,gx-2);i<=Math.min(gw-1,gx+2);i++){ const q=grid[j*gw+i]; if(q>=0&&Math.hypot(pts[q][0]-x,pts[q][1]-y)<d){ far=false; break; } }
        if(far){ add(x,y); ok=true; break; } }
      if(!ok) act.splice(ai,1); }
    PDS.set(key,pts); return pts;
  }

  /* ---------- 바탕·질감 ---------- */
  let GR=null;
  function grain(ctx,W,amt=.06,mode='overlay'){
    if(!GR){ GR=document.createElement('canvas'); GR.width=GR.height=256; const x=GR.getContext('2d'), im=x.createImageData(256,256), d=im.data, r=rng(3);
      for(let i=0;i<d.length;i+=4){ const v=r()*255; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; } x.putImageData(im,0,0); }
    ctx.save(); ctx.globalCompositeOperation=mode; ctx.globalAlpha=amt; ctx.fillStyle=ctx.createPattern(GR,'repeat'); ctx.fillRect(0,0,W,W); ctx.restore();
  }
  function paper(ctx,W,color='#F7F5F0'){ ctx.save(); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.fillStyle=color; ctx.fillRect(0,0,W,W); ctx.restore(); }
  function axes(ctx,W,alpha=.08,labels=false,dark=false){
    ctx.save(); ctx.strokeStyle=dark?`rgba(255,255,255,${alpha})`:`rgba(0,0,0,${alpha})`; ctx.lineWidth=Math.max(1,W/480);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,W); ctx.moveTo(0,W/2); ctx.lineTo(W,W/2); ctx.stroke();
    if(labels){ ctx.fillStyle=dark?'rgba(255,255,255,.45)':'rgba(0,0,0,.38)'; ctx.font=`${Math.round(W/40)}px Pretendard,sans-serif`; ctx.textAlign='center';
      ctx.fillText('맛이 좋아요',W/2,W*.04); ctx.fillText('맛이 아쉬워요',W/2,W*.985); ctx.textAlign='left'; ctx.fillText('향이 아쉬워요',W*.012,W/2-W*.012); ctx.textAlign='right'; ctx.fillText('향이 좋아요',W*.988,W/2-W*.012); }
    ctx.restore();
  }

  /* ---------- 공개 도구 H ---------- */
  G.H = { TEAS,FLAVORS,TK,FK, hex2rgb,rgb2hex,rgbStr,mix,lum,pastel,shade,lin,gam,
          rng,hash,clamp,lerp,ss,noise,fbm,gauss,
          dropField,dropColorAt,dropDiscColor,dropSnapshot, pointsOf,field,sample,paintField, poisson, grain,paper,axes };

  /* ---------- 그리기 ---------- */
  G.renderTo = function(style,canvas,n,cssSize){
    const W=canvas.width=canvas.height=Math.round(cssSize*Math.min(2,window.devicePixelRatio||1));
    const ctx=canvas.getContext('2d'); ctx.save(); paper(ctx,W,style.bg||'#F7F5F0');
    const t0=performance.now(); let err=null;
    try{ style.render(ctx,W,G.recs(n),G.H); }catch(e){ err=e; console.error(style.id,e); ctx.restore(); ctx.save(); ctx.fillStyle='#c00'; ctx.font='20px sans-serif'; ctx.fillText('오류: '+e.message,10,30); }
    ctx.restore(); return {ms:performance.now()-t0,err};
  };
})();
