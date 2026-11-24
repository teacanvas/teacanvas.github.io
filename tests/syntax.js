// 앱 스크립트 문법 확인 (한 줄 코드 중간에 넣은 // 주석이 뒷부분을 지우는 실수 등). 사용법: node tests/syntax.js
const fs=require('fs'), path=require('path'); const s=fs.readFileSync(path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html'),'utf8');
let bad=0; [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{ try{ new Function(m[1]); }catch(e){ bad++; console.log('  ✗ 스크립트',i+1,e.message); } });
// 한 줄 코드 중간에 // 주석을 넣으면, 그 뒤의 코드가 주석이 되어 조용히 사라진다 (문법 오류가 안 나서 위 검사로는 못 찾음)
//  → 주석 뒤에 '; 함수(…);' 또는 '; if(' 또는 '; 변수=' 같은 코드가 이어지는 줄을 찾는다
const FILE=process.env.TC_FILE||path.join(__dirname,'..','TEA_CANVAS_prototype_v6.html');
fs.readFileSync(FILE,'utf8').split('\n').forEach((l,i)=>{ const m=/(?<![:'"\w/])\/\/\s/.exec(l); if(!m) return; const c=l.slice(m.index+m[0].length);
  if(/[;}]\s*(?:if\s*\(|[A-Za-z_$][\w$.]*\s*\([^)]*\)\s*;|[A-Za-z_$][\w$.]*\s*=[^=])/.test(c)){ bad++; console.log('  ✗ '+(i+1)+'번째 줄: // 주석 뒤에 코드가 있어요 → /* */ 주석으로 바꾸세요:',c.slice(0,90)); } });
console.log(bad?`\n실패 ${bad}개`:'모두 통과'); process.exit(bad?1:0);
