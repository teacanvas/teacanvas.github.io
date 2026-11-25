const {chromium}=require('playwright'); const D=__dirname+'/';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 await p.goto('file://'+D+'board.html'); await p.waitForTimeout(3000); await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:D+'TEA_CANVAS_A1_B.pdf',width:'594mm',height:'841mm',printBackground:true,margin:{top:0,right:0,bottom:0,left:0}});
 await b.close(); })();
