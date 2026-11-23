# 과제전 제출용 단일 HTML 만들기: python3 tools/build-submission.py → submission/B.html
# - 사진·아이콘을 파일 안에 넣어 B.html 하나로 열리게
# - 관람객이 바뀌어도 첫 화면부터 보게: 열 때마다 예시 기록 상태로 시작(언어를 바꿔 다시 열릴 때만 그대로)
import base64, re, os
ROOT=os.path.join(os.path.dirname(__file__),'..'); os.chdir(ROOT)
s=open('TEA_CANVAS_prototype_v6.html').read()
def uri(p,mt): return 'data:%s;base64,%s'%(mt,base64.b64encode(open(p,'rb').read()).decode())
for n in ['s1','s2','s4','s8']: s=s.replace('"assets/photos/%s.jpg"'%n,'"%s"'%uri('assets/photos/%s.jpg'%n,'image/jpeg'))
for n in ['zephyr','umbriel']: s=s.replace("'assets/voice/%s.m4a'"%n,"'%s'"%uri('assets/voice/%s.m4a'%n,'audio/mp4'))   # 목소리 들어보기용 소리
s=s.replace('<link rel="manifest" href="manifest.webmanifest">','')
ic=uri('assets/icons/icon-192.png','image/png')
s=s.replace('href="assets/icons/icon-192.png"','href="%s"'%ic).replace('href="assets/icons/apple-touch-icon.png"','href="%s"'%ic)
a="if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js').catch(()=>{});"
assert a in s; s=s.replace(a,'')
a="(()=>{ try{ if(!localStorage.getItem('teacanvas.v6.fresh14')){"
assert a in s
s=s.replace(a,"(()=>{ try{ if(!sessionStorage.getItem('tc.reopen')){   /* 전시용: 열 때마다 처음 상태로 */",1)
assert not re.search(r'["\'(]assets/',s)
os.makedirs('submission',exist_ok=True); open('submission/B.html','w').write(s); print('submission/B.html',len(s)//1024,'KB')
