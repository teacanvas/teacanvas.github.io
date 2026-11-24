// 물음표 없이 말해도 질문을 알아보는지 (음성 인식은 문장부호를 안 붙인다). 사용법: node tests/question.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file://'+require('path').join(__dirname,'..','TEA_CANVAS_prototype_v6.html')); await p.waitForTimeout(400);
const Q=['이거 어디서 나는 차야','이거 녹차 맞아요','몇 도로 우려야 돼','이 차 이름이 뭐야','왜 이렇게 쓴 걸까','이거 몇 번 우릴 수 있나요','두 번 우려도 되나','우롱차는 어때'];
const N=['맛있어','고소한 향이 나요','비 오는 날 같아','어제 자스민차 사왔어','다 마셨어요','응 맞아','좋아','왜인지 모르게 좋아'];
let bad=0; for(const t of Q){ const r=await p.evaluate(t=>[looksQuestion(t),isQuestion(t)],t); if(!r[1]){bad++; console.log('✗ 질문인데 못 알아봄',t,r);} }
for(const t of N){ const r=await p.evaluate(t=>isQuestion(t),t); if(r){bad++; console.log('✗ 질문이 아닌데 질문으로',t);} }
console.log(bad||errs.length?'실패 '+bad:'모두 통과'); if(bad||errs.length) process.exitCode=1; await b.close();})();
