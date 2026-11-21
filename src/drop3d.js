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
  const FRAG = `precision highp float; varying vec2 v; uniform mat3 rot; uniform float wob;
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
    const U={}; ['rot','wob','baseC','baseW','inkC','inkP','inkW','t','flow','swirl'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    return {gl,
      draw(F,yaw,pitch,t,o={}){
        const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
        // R = Ry(yaw) * Rx(pitch), column-major
        gl.uniformMatrix3fv(U.rot,false,[cy,0,-sy, sy*sp,cp,cy*sp, sy*cp,-sp,cy*cp]);
        gl.uniform1f(U.t,t); gl.uniform1f(U.wob,o.wob??1); gl.uniform1f(U.flow,o.flow??.04); gl.uniform1f(U.swirl,o.swirl??.9);
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
  function mount(el,F,{size=200,px=null,interactive=false,spin=.32,flow=.04,swirl=.9,wob=1,onFrame=null}={}){
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
      R.draw(st.F,st.yaw,st.pitch,t,{flow,swirl,wob});
      requestAnimationFrame(loop);
    })(performance.now());
    return st;
  }
  return {fromComps,colorAt,snapshot,mount,rgb,rng,hash};
})();
