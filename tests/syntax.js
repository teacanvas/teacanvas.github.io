// 앱 스크립트 문법 확인 (한 줄 코드 중간에 넣은 // 주석이 뒷부분을 지우는 실수 등). 사용법: node tests/syntax.js
const fs=require('fs'), path=require('path'); const s=fs.readFileSync(path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'),'utf8');
let bad=0; [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{ try{ new Function(m[1]); }catch(e){ bad++; console.log('  ✗ 스크립트',i+1,e.message); } });
console.log(bad?`\n실패 ${bad}개`:'모두 통과'); process.exit(bad?1:0);
