// 사용법: node previews/gallery/tools/check.js styles-01.js [출력폴더]
// 해당 파일의 시안만 10/50/100개로 그려서, 오류·시간을 출력하고 시안 5개씩 묶은 확인용 PNG를 만든다.
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
(async()=>{
  const file=process.argv[2]; const out=process.argv[3]||path.join(__dirname,'..','_check');
  fs.mkdirSync(out,{recursive:true});
  const url='file://'+path.join(__dirname,'..','index.html')+(file==='ALL'?'?':'?f='+file+'&')+'all=1&size=200';
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto(url); await p.waitForFunction(()=>window.GALLERY_READY,null,{timeout:120000});
  await p.waitForFunction(()=>[...document.querySelectorAll('.item')].every(e=>e.dataset.done),null,{timeout:300000});
  const rows=await p.$$eval('.item',els=>els.map(e=>({id:e.id,name:e.querySelector('h2').textContent,ms:e.querySelector('.ms').textContent})));
  rows.forEach(r=>console.log(r.id.padEnd(8),r.ms.padEnd(22),r.name));
  const items=await p.$$('.item'); const base=file.replace('.js','');
  const per=+(process.env.PER||5);
  for(let k=0;k<items.length;k+=per){
    // 5개씩 한 장으로
    const boxes=[]; for(const it of items.slice(k,k+per)) boxes.push(await it.boundingBox());
    const y0=boxes[0].y, y1=boxes[boxes.length-1].y+boxes[boxes.length-1].height;
    await p.screenshot({path:path.join(out,`${base}_${String(k/per+1).padStart(2,'0')}.png`),clip:{x:0,y:y0,width:1100,height:y1-y0},fullPage:true});
  }
  console.log('errors:',errs.length?errs:'없음'); console.log('PNG:',out);
  await b.close();
})();
