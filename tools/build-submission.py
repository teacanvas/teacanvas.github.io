# 과제전 제출용 단일 HTML 만들기: python3 tools/build-submission.py → submission/B.html
# - 사진·아이콘을 파일 안에 넣어 B.html 하나로 열리게
# - 기록은 이 기기에 남는다 (조원들이 써 보며 기록이 쌓이는지 확인). 전시 중 처음 상태로 되돌리려면 Ctrl+Alt+Shift+0
import base64, re, os
ROOT=os.path.join(os.path.dirname(__file__),'..'); os.chdir(ROOT)
s=open('TEA_CANVAS_prototype_v6.html').read()
def uri(p,mt): return 'data:%s;base64,%s'%(mt,base64.b64encode(open(p,'rb').read()).decode())
for n in ['s1','s2','s4','s8']: s=s.replace('"assets/photos/%s.jpg"'%n,'"%s"'%uri('assets/photos/%s.jpg'%n,'image/jpeg'))
for n in ['sulafat','zephyr','umbriel']: s=s.replace("'assets/voice/%s.m4a'"%n,"'%s'"%uri('assets/voice/%s.m4a'%n,'audio/mp4'))   # 목소리 들어보기용 소리
s=s.replace('<link rel="manifest" href="manifest.webmanifest">','')
ic=uri('assets/icons/icon-192.png','image/png')
s=s.replace('href="assets/icons/icon-192.png"','href="%s"'%ic).replace('href="assets/icons/apple-touch-icon.png"','href="%s"'%ic)
a="if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js').catch(()=>{});"
assert a in s; s=s.replace(a,'')
assert not re.search(r'["\'(]assets/',s)
os.makedirs('submission',exist_ok=True); open('submission/B.html','w').write(s); print('submission/B.html',len(s)//1024,'KB')
