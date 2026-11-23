// 음성 모드 메아리 확인: 봇 목소리가 마이크로 다시 들어온 것은 무시하고, 내 말은 받는지 (사용법: node tests/echo.js)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage(); await p.goto('file://'+require('path').join(__dirname,'..','TEA_CANVAS_prototype_v6.html')); await p.waitForTimeout(400);
const L='좋아요, 그럼 오설록의 제주 세작으로 시작해 볼까요? 맑고 고소한 맛이 매력적인 녹차예요. 이 차를 녹차로 기록할게요, 맞나요?';
for(const [h,strict,want] of [['좋아요 그럼 오설록에',false,true],['좋아요',false,true],['맑고 고소한 맛이',false,true],['응 좋아',false,false],['아니 홍차야',false,false],['잠깐만 근데 이거 녹차 맞아?',false,false],['좋아요',true,false],['응 맞아요',true,false],['이 차를 녹차로 기록할게요',true,true]])
  { const r=await p.evaluate(([h,s,L])=>isEcho(h,L,s),[h,strict,L]); if(r!==want) process.exitCode=1; console.log(r===want?'  ✓':'  ✗',JSON.stringify(h),strict?'(말 끝난 뒤)':'(말하는 중)','→',r?'메아리로 무시':'내 말로 받음'); }
await b.close();})();
