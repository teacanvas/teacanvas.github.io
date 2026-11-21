/* 예시 시안 2개 — 새 파일을 만들 때 이 형식을 따르세요 (갤러리에는 포함되지 않음) */
GALLERY.add({
  id:'x001', name:'메시 그라데이션', cat:'예시',
  desc:'캔버스 전체를 하나의 부드러운 색면으로 계산해요.',
  bg:'#F7F5F0',
  render(ctx,W,recs,H){
    const F=H.field(recs,110);
    const bg=H.hex2rgb('#F7F5F0');
    H.paintField(ctx,W,F,(c,a)=>{ const p=H.pastel(c,.1,1.25), m=H.ss(0,.9,a); return H.mix(bg,p,m).map(v=>v*255); });
    H.grain(ctx,W,.07);
  }
});
GALLERY.add({
  id:'x002', name:'기록마다 3D 방울', cat:'예시',
  desc:'기록 하나를 3D 찻방울 하나로 그대로 올려요.',
  render(ctx,W,recs,H){
    H.axes(ctx,W,.08,true);
    for(const r of recs){ const R=W*(.025+.035*r.i)*(recs.length>50?.8:1), px=Math.ceil(R*2.4), s=H.dropSnapshot(r,px); if(s) ctx.drawImage(s,r.x*W-px/2,r.y*W-px/2,px,px); }
  }
});
