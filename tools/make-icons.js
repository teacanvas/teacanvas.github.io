// 앱 아이콘 만들기: 앱과 같은 수채 찻방울(여러 풍미 색)을 흰 바탕에
// 사용법: node tools/make-icons.js → assets/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const ROOT=path.join(__dirname,'..'), OUT=path.join(ROOT,'assets','icons'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
  await p.goto('file://'+path.join(ROOT,'TEA_CANVAS_prototype_v6.html')); await p.waitForTimeout(700);
  const make=async(size,pad,name)=>{ const url=await p.evaluate(([size,pad])=>{
      const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,size,size);
      const L=[['floral',.9],['citrus',.75],['vegetal',.7],['fruity',.6]].map(([k,w])=>({k,c:FLAVORS[k].color,w}));
      drawRec1(x,L,size/2,size/2,size*(.36-pad*.8),'teacanvas-icon',CV_SPREAD+1.4,1);
      return c.toDataURL('image/png'); },[size,pad]);
    fs.writeFileSync(path.join(OUT,name),Buffer.from(url.split(',')[1],'base64')); };
  await make(512,.04,'icon-512.png'); await make(192,.04,'icon-192.png'); await make(512,.14,'maskable-512.png'); await make(180,.06,'apple-touch-icon.png');
  await b.close(); console.log('완료:',fs.readdirSync(OUT).join(', ')); })();
