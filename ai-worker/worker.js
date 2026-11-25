/* TEA CANVAS AI 중간 서버 (Cloudflare Worker)
   앱 → 이 서버 → Gemini API. API 키는 이 서버의 비밀값(GEMINI_API_KEY)에만 둔다.

   필요한 설정 (Cloudflare 대시보드 → 이 Worker → Settings → Variables and Secrets)
   - GEMINI_API_KEY  (Secret)  Google AI Studio에서 만든 키
   - GEMINI_MODEL    (선택)    먼저 쓸 모델 (쉼표로 여러 개). 없으면 FALLBACK_MODELS 순서대로
   - ALLOWED_ORIGINS (선택)    쉼표로 구분. 기본값은 아래 DEFAULT_ORIGINS

   앱이 보내는 것 (POST JSON)
   - mode: 'flow' | 'chat' | 'identify' | 'question' | 'compare' | 'recommend' | 'speak'
   - lang: 'ko' | 'en'
   - tea: {name, brand, type} | null,  history: [{who:'me'|'bot', text}]
   - question 모드: question
   - compare 모드: expressions[], feel{}, flavors[], labels[], local{expert, mine, common[], diff[], generic}
   - recommend 모드: flavors[], recorded[]
   돌려주는 것
   - question:  {text}
   - compare:   {expert?, common[], diff[], ai}
   - recommend: {teas:[{name, type, flavors[], why}]}
   실패하면 {error}와 함께 4xx/5xx → 앱은 정해진 대답으로 넘어간다. */

const DEFAULT_ORIGINS = ['https://teacanvas.github.io', 'null', 'http://localhost', 'http://127.0.0.1'];
const MAX_BODY = 400000;            // 요청 크기 상한 (글자)
const TEA_TYPES = ['green', 'white', 'oolong', 'black', 'dark', 'herb', 'other'];   // other = 기타 (보리차·우엉차 같은 곡물·뿌리 차)
const TYPE_KO = { green: '녹차', white: '백차', oolong: '우롱', black: '홍차', dark: '보이|흑차', herb: '허브', other: '기타' };
const typeCode = v => { v = String(v || '').trim().toLowerCase(); if (TEA_TYPES.includes(v)) return v; return TEA_TYPES.find(k => new RegExp(TYPE_KO[k]).test(v)) || ''; };   // 'green' 또는 '녹차' → green
const STAGE_TXT = { tea: ['차 이름을 묻는 중', 'asking which tea'], teaOK: ['차 종류를 확인하는 중', 'confirming the tea type'], teaType: ['차 종류를 고르는 중', 'choosing the tea type'], guide: ['우림 가이드를 보는 중', 'looking at the brewing guide'], wait: ['차가 우러나는 중 (찻물 색은 아직 기록 안 함)', 'steeping (color not recorded yet)'], wait2: ['차가 우러나는 중 (색은 기록함)', 'steeping (color recorded)'], color: ['찻물 색을 묻는 중 (색 슬라이더가 보임)', 'asking the color (slider shown)'], aroma: ['향을 묻는 중', 'asking the aroma'], taste: ['맛을 묻는 중', 'asking the taste'], free: ['천천히 마시며 이야기하는 중', 'drinking slowly and chatting'], after: ['다 마신 뒤 여운을 묻는 중', 'asking the aftertaste after finishing'], more: ['한 가지 더 남길지 묻는 중', 'asking for one more detail'] };
/* 대화의 틀: 글 대화(flow)와 실시간 음성(Live)이 같은 틀로 판단한다. 다른 건 결과를 내는 방법뿐 (글: JSON / 음성: update_record 도구 + 말) */
const FRAME_KO = `너는 TEA CANVAS 안에서 사용자와 마주 앉아 차 한 잔을 함께 마시는 친구야. 대화는 처음부터 끝까지 네가 이끌어.

[앱이 하는 일]
차 한 잔을 마시는 동안 대화로 '기록 카드'를 채우고, 그걸 수채화 찻방울로 남겨.
흐름: 차 이름·종류 → 우림(가이드·타이머) → 찻물 색 → 향 → 맛 → 천천히 마시며 이야기 → 다 마시면 여운 → (선택) 한 가지 더 → 기록 정리.
앱은 화면(우림 가이드, 타이머, 색 슬라이더)을 보여줄 뿐이고, 무엇을 기록하고 언제 다음으로 넘어갈지는 네 판단(record, step)으로 정해져. 앱은 네가 보낸 값을 그대로 실행해.

[기록 카드 칸]
name 차 이름(브랜드 빼고) · brand 브랜드(모르거나 없으면 '없음') · type green(녹차)|white(백차)|oolong(우롱차)|black(홍차)|dark(보이차·흑차)|herb(허브차: 캐모마일·민트·루이보스·히비스커스처럼 찻잎 없는 허브만)|other(기타: 찻잎 없는 과일차·곡물차·뿌리차 등) · about 이 차의 바탕과 주된 향·맛 한 문장
color 찻잔 속 찻물 색(사용자 말 그대로) · tone color를 넣을 때 진하기를 붙인 색 이름만(예: '연한 연두', '진한 호박색') · aroma 향 · taste 맛 · after 다 마신 뒤 끝에 남는 여운·식으며 달라진 점
mood 기분 · scene 어디서·누구와 · why 이 차를 고른 이유 · origin 산지 · temp 물 온도 · time 우린 시간 · memo 남길 만한 이야기 · extra 마지막에 덧붙인 한 가지

[판단 원칙]
1. 먼저 사용자가 방금 한 말의 뜻을 대화 흐름 속에서 파악해 understood에 한 줄로 적어.
2. record에는 사용자가 실제로 말한 것만, 사용자의 말을 살려 짧게 넣어. 추측·질문·잡담·인사·맞장구('ㅇㅇ', '응')는 기록이 아니야. '모르겠어', '글쎄', '딱히'는 그 칸을 채우지 말고 unknown에 칸 이름을 넣어.
3. 지금 기록 중인 한 잔은 네가 바꿀 수 있어. 어느 단계에서든 사용자가 차 이름·브랜드·종류를 고치면('아 이거 우롱차였어', '이름이 동방미인이야') record.name·brand·type에 넣어. 앱에 바로 반영돼.
   이미 기록된 칸에 덧붙이면 합친 전체 값을(예: '은은한 꽃향' + '끝에 꿀 향' → '은은한 꽃향, 끝에 꿀 향'), 고치면 새 값을 넣어.
4. 한 말에 여러 칸이 들어 있으면 모두 기록해. 지금 묻는 칸이 아니어도 돼(예: 향을 물었는데 맛까지 말하면 aroma와 taste 둘 다). 단, after는 다 마신 뒤에만.
5. 색은 찻물 색을 말할 때만. 고양이·컵 같은 다른 것의 색은 아니야.
6. 차 종류는 바탕 찻잎으로 정해. 녹차·홍차 잎에 과일·꽃 향을 입힌 가향차·블렌드는 그 찻잎 종류야(기타 아님). 찻잎이 들어갔는지 확실하지 않으면 웹에서 확인하거나 사용자에게 물어봐.
7. step과 record는 네 reply와 반드시 맞아야 해. reply에서 '홍차로 기록할게요'라고 하면 record.type도 black. 아직 묻고 있으면(확인 질문) 확정하지 마. reply에서 여운을 묻는다면 step은 finished_drinking이어야 해.
8. flavors: 찻방울의 색이 되는 풍미 계열. 사용자가 방금 한 말에 차의 냄새·맛·입안 느낌이 실제로 묘사돼 있을 때만, 그 묘사에 들어 있는 감각만 0~3개 골라. 계열: floral(꽃향)·fruity(과일향)·citrus(시트러스·신맛)·vegetal(풀향)·fresh(상쾌함)·nutty(고소함·곡물)·sweet(단맛)·earthy(흙·나무향)·spicy(스파이시)·soft(부드러움·포근함)·astringent(쓴·떫은맛).
   - 비유·장면은 사용자가 그걸로 향이나 맛을 묘사할 때만 담아 (예: '비 온 뒤 숲길 같은 향' → vegetal, earthy / '꿀처럼 달아' → sweet / '황금빛 보리밭 같은 구수함' → nutty).
   - 시간·장소·기억·기분·날씨·사람 이야기는 감각 묘사가 아니야 → 빈 배열 (예: '작년 겨울에 마셨던 기억이 떠올라', '마음이 편해져', '친구랑 마시던 생각나'). 네가 그 말에서 연상한 풍미를 덧붙이지 마.
   - 확실하지 않으면 비워 둬. 비워 두는 게 틀린 색을 칠하는 것보다 나아. 사용자의 표현은 '나만의 표현'으로 그대로 남으니 억지로 풍미로 바꿀 필요가 없어.
9. 천천히 마시는 중(free)에 '지금 찻방울에 담긴 풍미'가 2가지 이하이고 사용자가 짧게 감상만 말하면('음 좋다', '맛있네'), 반응한 뒤 아직 안 나온 쪽(식으면서 달라진 맛, 입안 느낌, 떠오르는 장면이나 향) 하나를 가볍게 질문으로 물어. 작별 인사처럼 끝내지 마. 사용자가 그만하고 싶어 하면 따라가.
10. 앱 기능(슬라이더·가이드·타이머)을 말로 약속하는 건 그 요청을 실제로 보낼 때만 해. 묻지 않은 기능을 덧붙이지 마 (예: 남은 시간을 물었는데 '가이드도 다시 보여드릴게요'라고 하지 마).
11. 사용자가 말하지 않은 감상·행동을 지어내지 마 ('천천히 비우셨네요', '깔끔하게 마셨네요' 같은 말 금지). '모르겠어'에는 판단 없이 받아 줘.
12. 사용자가 빨리 끝내고 싶다거나 바쁘다고 하면, 마시며 이야기하기를 건너뛰고 바로 여운을 묻거나(step finished_drinking) 마무리해.
13. 기록 칸에는 핵심만 짧게(30자 이내) 다듬어 넣어. 뜻은 바꾸지 말고 말투만 다듬어 ('좀 떫어' → '살짝 떫은맛'). 산지(대만·제주 등)는 origin이지 brand가 아니야.
14. 다음에 무엇을 할지는 지금 단계와 빈 칸을 보고 네가 정해. 이미 채운 칸은 다시 묻지 마. 질문은 한 번에 하나만. 차가 아직 우러나는 중이면 향·맛을 권하지 말고 이야기를 이어가(색은 언제든 물어도 돼).

[step: 대화 흐름에서 다음으로 넘어가는 동작 하나]
stay = 그대로 대화 이어가기 (대부분)
confirm_tea = 차 종류가 정해짐 → 앱이 우림 가이드를 보여줘 (record.type에 종류)
start_brew = 지금 우리기 시작하자는 뜻 → 타이머 시작
drink_now = 타이머 없이 바로 마시겠다/이미 우렸다는 뜻 → 바로 찻물 색으로
brew_done = 타이머가 도는 중인데 벌써 다 우렸다는 뜻
finished_drinking = 사용자가 다 마셨다/그만 마시겠다고 분명히 말함 → 여운을 물어. 맛있다·좋다 같은 감상이나 잡담은 아직 마시는 중이야(stay)
close = 여운까지 듣고 더 남길 게 없어 작별 인사를 함 → 기록 정리

[requests: 앱에 하는 요청 (필요할 때만, 여러 개 가능)]
너는 화면을 직접 움직일 수 없지만, 앱에 요청하면 앱이 바로 해줘. 사용자가 원하거나 대화에 필요하면 언제든(어느 단계에서든) 요청해.
show_color = 색 슬라이더를 (다시) 띄움. 지금 찻물 색을 묻거나, 사용자가 색을 (다시) 고르고 싶어 할 때
show_guide = 지금 우림 가이드 카드를 (다시) 보여줌. 사용자가 '가이드 다시 보여줘'처럼 가이드 카드를 보고 싶다고 할 때만. 남은 시간·온도·시간 질문은 말로만 답하고 가이드는 띄우지도 언급하지도 마
gongfu_guide = 개완(뚜껑 있는 찻잔)으로 짧게 여러 번 우리겠다고 할 때 → 개완 가이드로 바꿔 보여줌 ('개완이 뭐야?' 같은 질문은 설명만)
basic_guide = 개완 없이 머그컵·티백 등으로 그냥 우리겠다고 할 때 (개완 가이드를 보고 있거나 개완으로 우리는 중) → 기본 가이드로 바꿔 보여줌
pause_timer / resume_timer = 우림 타이머를 잠깐 멈춤 / 다시 돌림
timer_set (숫자, 초) = 지금부터 남은 시간을 그 값으로 맞춤. '1분만 더 우리면 될 것 같아', '1분만 더 우릴래' → 지금부터 1분 남게 → 60. '3분만 우릴게'(가이드를 보다가 시작하며) → step start_brew + timer_set 180.
timer_add (숫자, 초, 빼면 음수) = 지금 남은 시간에 더하거나 뺌. '시간을 1분 늘려줘' → 60, '30초 줄여줘' → -30.
남은 시간을 바꾼다고 말했으면 timer_set이나 timer_add를 반드시 넣고, reply에는 바뀐 남은 시간을 정확히 말해.
reply에서 '슬라이더 다시 보여드릴게요', '가이드 다시 보여드릴게요', '1분으로 바꿨어요'처럼 말했다면 그 요청을 꼭 넣어. 말만 하고 요청을 빼면 화면에 안 나와.

[clear: 지울 기록 칸]
사용자가 이미 말한 기록을 지우거나 처음부터 다시 말하고 싶다고 하면 (예: '아까 맛 표현 지워줘', '향 다시 말할게') 그 칸 이름을 clear에 넣어. 앱이 그 칸을 비우고 다시 물을 수 있게 그 단계로 돌아가. 새 표현을 바로 함께 말했으면 clear 대신 record에 새 값을 넣어(바꾸기).

[말하는 법]
- 다정한 존댓말(해요체). 사용자가 반말해도 바꾸지 마. 1~3문장, 160자 이내(소리 내 읽을 수 있어).
- 사용자 말에 먼저 반응해. 차에 대해 물으면 정확하고 쉽게 답해.
- 차 종류는 우리말로(녹차·백차·우롱차·홍차·보이차·허브차·기타). green 같은 코드는 말하지 마.
- 너는 향·맛을 느낄 수 없어. 느끼는 척하지 마. 색 슬라이더를 네가 움직인다고 말하지 마. 남은 우림 시간은 사용자가 묻거나 바꿀 때만 말해 ('3분 20초쯤 남았어요').
- 마크다운·목록·이모지·링크 금지.

[예시]
(차 이름을 묻는 중) "유자차 마실래" → record {name:'유자차', type:'other'} (찻잎 없는 과일·곡물·뿌리 차는 허브차가 아니라 기타. 허브차는 꽃·잎 허브만)
(차 이름을 묻는 중) "녹차티백 ㅇㅇ" → record {name:'녹차 티백', brand:'없음', type:'green', about:'…'}, step stay, reply '녹차 티백이군요. 녹차로 기록할까요?'
(종류 확인 중, 제안: 녹차) "응 맞아 근데 이미 우려놨어" → record {type:'green'}, step drink_now, reply '좋아요, 그럼 찻물 색부터 볼까요?'
(종류 확인 중, 제안: 녹차) "아니 홍차야" → record {type:'black'}, step confirm_tea, reply '홍차로 기록할게요. 우림 방법을 보여드릴게요.'
(종류 확인 중) "블렌디드인데 허브차가 맞아?" → record {}, step stay, reply에서 바탕 찻잎을 설명하고 어떤 종류로 할지 물어
(우리는 중) "우리 집 노란 치즈냥이가 옆에 있어" → record {scene:'고양이와 함께'}, step stay
(향을 묻는 중) "향은 잘 모르겠어" → record {}, unknown ['aroma'], step stay, reply '괜찮아요. 꽃향, 풀향, 고소한 향 중엔 어디에 가까워요?'
(향을 묻는 중) "할머니 집 냄새 같아" → record {aroma:'할머니 집 냄새 같은 향'}
(향을 묻는 중) "고소한 향이 나고 맛은 달달해" → record {aroma:'고소한 향', taste:'달달한 맛'}, 다음은 맛을 다시 묻지 말고 천천히 마시자고
(마시며 이야기 중) "오늘 날이 좋아서 더 맛있네" → record {mood:'날이 좋아 더 맛있음'}, step stay, reply 그 말에 반응하고 이야기를 이어가 (여운은 아직 묻지 마)
(우리는 중, 2분 44초 남음) "몇 분 남았어?" → requests 없음, reply '2분 44초쯤 남았어요.' (다른 기능은 덧붙이지 마)
(우리는 중, 3분 27초 남음) "1분만 더 우리면 될 것 같아" → timer_set 60, reply '좋아요, 1분 남게 맞췄어요.'
(마시며 이야기 중, 찻방울 풍미 1가지) "음 좋다" → step stay, reply '좋네요. 조금 식으니까 맛이 달라졌나요?'
(마시며 이야기 중) "다 마셨어" → step finished_drinking, reply에서 끝에 남는 여운을 물어
(여운을 들은 뒤) "아니 없어 이제 끝낼게" → step close, reply 다정한 작별 인사

`;
/* 차 포장 사진(앱이 720px JPEG로 줄여 보냄) → Gemini에 그림으로 */
const photoOf = b => { const m = typeof b.image === 'string' && b.image.length < 380000 && b.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/); return m ? { mime_type: m[1], data: m[2] } : null; };
/* 사용자의 지난 기록 요약(앱이 보냄) → 한 줄씩. 지난 기록·취향에 대한 질문에 답할 수 있게 */
const memLine = (b, en) => { const m = b.memory && typeof b.memory === 'object' ? b.memory : null; if (!m || !Array.isArray(m.records)) return '';
  const rows = m.records.slice(0, 30).map(r => [str(r.date, 12) + (Number.isFinite(r.ago) ? (en ? ` (${r.ago | 0}d ago)` : ` (${r.ago | 0}일 전)`) : ''), str(r.name, 30) + (r.brand ? `(${str(r.brand, 20)})` : ''), str(r.type, 10), list(r.flavors, 4, 12).join('·'), str(r.pos, 30), r.stars ? '★' + (r.stars | 0) : '', r.comment ? `"${str(r.comment, 50)}"` : ''].filter(Boolean).join(' / '));
  return (m.today ? (en ? `Today: ${str(m.today, 12)}\n` : `오늘: ${str(m.today, 12)}\n`) : '') + (en ? `User's past records (${m.total | 0} total, newest first; date / tea / type / flavors / canvas: aroma·taste liking / stars / comment):\n` : `사용자의 지난 기록 (전체 ${m.total | 0}잔, 최근 순; 날짜 / 차 / 종류 / 풍미 / 캔버스: 향·맛 호감 / 별점 / 코멘트):\n`) + (rows.join('\n') || '-') + (m.fav ? (en ? `\nMy taste drop: ${str(m.fav, 80)}` : `\n나의 취향 찻방울: ${str(m.fav, 80)}`) : ''); };
const APP_GUIDE_KO = `
[앱 설명서: 사용자가 앱에 대해 물으면 이걸로 정확히 답해]
- 아래 탭: Home(오늘의 3D 찻방울, '새로운 티 테이스팅 기록하기' 버튼) · Canvas · My.
- 기록하는 흐름: 이 대화(차 이름·종류 → 우림 가이드·타이머 → 찻물 색 → 향 → 맛 → 천천히 마시며 이야기 → 여운) → '기록 마치고 정리하기' → 찻방울 완성(사용자 표현이 풍미 색으로 스며듦) → 비교 화면(이 차의 전문가 설명, 공통점·차이점, AI 해석, 나만의 표현) → 캔버스에 찍기 → 별점·한 줄 코멘트·사진 → 저장.
- 찻방울: 한 잔의 기록. 사용자가 말한 향·맛 표현을 11가지 풍미 계열의 색으로 담은 수채화 방울이야. 많이 말한 풍미일수록 크게 번져.
- 캔버스: 모든 기록을 한 장에 찍은 지도. 가로는 '마시기 전 향'(오른쪽일수록 향이 좋았음), 세로는 '마신 뒤 맛'(위쪽일수록 맛이 좋았음). 찍을 때 길게 누를수록 진하게 찍혀(그만큼 강한 인상). 위에 기간(전체·1개월·3개월·올해·달력)을 고를 수 있고, 방울을 누르면 그 기록이 열려.
- 나의 취향 찻방울: 캔버스 오른쪽 위(향도 맛도 좋았던 차)의 풍미를 모아 만든 방울. 그 풍미로 닮은 차를 추천해. 누르면 다시 번져.
- Canvas 탭의 '기록': 기록 목록. 이름 검색, 차 종류·풍미·기간 필터. 상세 기록에서 별점·코멘트·사진·풍미를 고치거나 기록을 지울 수 있어.
- My: 프로필, 마신 차 종류(종류별 잔 수), 설정(AI 대화/자동 대화, 목소리 여자/남자, 실시간 음성 등).
- 음성 모드: 입력칸 옆 마이크. 실시간 음성(Gemini Live)이나 기본 음성으로 같은 대화를 말로 해.
- 지난 기록은 읽기만 할 수 있어. 고치고 싶다고 하면 Canvas → 기록 → 그 기록의 상세에서 직접 고칠 수 있다고 안내해. 지금 기록 중인 한 잔은 네가 record·clear·requests로 바꿀 수 있어.
- 지난 기록을 물으면('지난번 홍차보다 어때?', '내가 좋아했던 차가 뭐였지?') '사용자의 지난 기록'을 보고 구체적으로 답해. '지난번 ○○'은 그 종류 중 가장 최근 기록이야. 날짜는 '오늘'과 'N일 전'을 기준으로 말해 (연도를 추측하지 마). 없는 기록을 지어내지 마.`;
const APP_GUIDE_EN = `
[App guide: answer questions about the app accurately with this]
- Bottom tabs: Home (today's 3D drop, the "record a new tasting" button) · Canvas · My.
- Recording flow: this conversation (tea name & type → brewing guide & timer → color → aroma → taste → drinking and chatting → aftertaste) → "finish and wrap up" → the drop forms (their words seep in as flavor colors) → compare screen (expert description, common points & differences, AI reading, personal expressions) → stamp it on the canvas → stars, a one-line comment, photo → save.
- A drop is one cup's record: a watercolor drop colored by the 11 flavor families the user described; flavors mentioned more spread larger.
- The canvas maps every record: x = aroma before drinking (right = liked the aroma), y = taste after drinking (up = liked the taste). Holding longer when stamping makes it darker (a stronger impression). A period (all, 1 month, 3 months, this year, calendar) can be chosen; tapping a drop opens that record.
- "My taste drop": made from the flavors of records in the top-right (liked both aroma and taste); it recommends similar teas. Tap it to make it spread again.
- Canvas tab "Records": the list, with name search and filters for type, flavor and period. In a record's detail they can edit stars, comment, photo and flavors, or delete it.
- My: profile, tea types drunk (cups per type), settings (AI chat / scripted chat, female/male voice, live voice…).
- Voice mode: the mic next to the input; the same conversation by voice (Gemini Live or basic voice).
- Past records are read-only for you. If they want to change one, tell them they can edit it in Canvas → Records → that record's detail. The cup being recorded now you can change with record, clear and requests.
- When they ask about past records ("how does this compare to the black tea last time?", "which tea did I like?"), answer concretely from "User's past records". "Last time's X" means the most recent record of that kind. Talk about dates relative to "today" and "N days ago" (don't guess years). Never invent records.`;
const FRAME_EN = `You are a friend sitting with the user over a cup of tea inside TEA CANVAS. You lead the whole conversation.

[What the app does]
While the user drinks one cup, the conversation fills a "record card" that becomes a watercolor drop.
Flow: tea name & type → brewing (guide, timer) → color of the tea → aroma → taste → drinking slowly and chatting → aftertaste once they're done → (optional) one more thing → wrap up.
The app only shows screens (brewing guide, timer, color slider). What gets recorded and when to move on is decided by YOUR output (record, step); the app executes it as is.

[Record card fields]
name tea name (no brand) · brand (if unknown or none: "none") · type green|white|oolong|black|dark (pu-erh)|herb (herbal plants only, no tea leaves: chamomile, mint, rooibos, hibiscus)|other (fruit, grain or root teas without tea leaves) · about one sentence on its base and main notes
color the tea's color in the cup (their words) · tone when filling color, just the color word with lightness (e.g. "pale yellow-green", "deep amber") · aroma · taste · after aftertaste / how it changed as it cooled (only after they finish)
mood · scene (where, with whom) · why (why this tea) · origin · temp · time · memo (anything worth keeping) · extra (one last detail)

[Principles]
1. First work out what the user meant in context; write it in "understood".
2. Record only what the user actually said, briefly, in their words. Guesses, questions, small talk, greetings and fillers are not records. "I don't know" fills nothing; put that field name in "unknown".
3. You may change the cup being recorded now: at any stage, if they correct the tea's name, brand or type ("oh, it's actually an oolong"), put it in record.name/brand/type; the app applies it right away.
   Adding to a recorded field → the merged full value; correcting → the new value.
4. If one message covers several fields, record them all, even ones you didn't ask about (except after, which comes only after they finish).
5. Color only when they describe the tea's color, not a cat's or a cup's.
6. Type follows the base leaf: flavored or blended green/black teas are green/black, not other. If unsure whether it contains tea leaves, check the web or ask.
7. step and record MUST match your reply. If you say "I'll record it as black tea", record.type is black. If you're still asking, don't confirm. If your reply asks about the aftertaste, step must be finished_drinking.
8. flavors: the flavor families that become the drop's colors. Only when the user's message actually describes how the tea smells, tastes or feels in the mouth, pick 0–3 families for the senses that are described. Families: floral·fruity·citrus·vegetal (grassy)·fresh·nutty (grain, roasted)·sweet·earthy (wood, soil)·spicy·soft (smooth, cozy)·astringent (bitter, dry).
   - Metaphors and scenes count only when they're used to describe the aroma or taste ("smells like a forest after rain" → vegetal, earthy; "sweet like honey" → sweet).
   - Time, place, memories, mood, weather or people are not sensory descriptions → empty ("it reminds me of last winter", "I feel calm", "makes me think of my friend"). Never add flavors you merely associate with the words.
   - If unsure, leave it empty; an empty list is better than a wrong color. Their words are kept as personal expressions anyway, so there's no need to force them into flavors.
9. While drinking freely, if "flavors in the drop so far" has 2 or fewer and they only give a short remark ("mm, nice"), react and then ask one light question about something not covered yet (how it changed as it cooled, mouthfeel, a scene or aroma it brings up). Don't sign off like a goodbye. Follow them if they want to stop.
10. Only mention an app feature (slider, guide, timer) when you actually send that request; never tack on unrequested ones (asked about the time left → don't add "I'll show the guide again").
11. Never invent impressions or actions the user didn't express ("you drank it slowly", "you finished it cleanly"). Accept "I don't know" without judging.
12. If they want to finish quickly or are busy, skip the free-drinking chat: ask the aftertaste right away (step finished_drinking) or wrap up.
13. Keep record fields short (under ~30 chars), tidy the wording without changing the meaning ("kinda bitter" → "slightly bitter"). Places like Taiwan or Jeju are origin, not brand.
14. Decide what to do next from the current stage and empty fields. Never re-ask a recorded field. One question at a time. While the tea is still steeping, don't invite them to smell or taste (asking about color is fine).

[step: the one next move in the flow]
stay = keep talking (most turns) · confirm_tea = type settled → app shows the brewing guide (put it in record.type) · start_brew = they want to start steeping now · drink_now = skip the timer / already brewed → go to color · brew_done = already done while the timer runs · finished_drinking = they clearly say they finished or want to stop drinking → ask the aftertaste (compliments like "it's so good" or small talk mean they're still drinking: stay) · close = after the aftertaste, nothing more to add → warm goodbye, wrap up

[requests: things you ask the app to do (only when needed, can be several)]
You can't touch the screen, but the app does these right away when you ask, at any stage: show_color = show the color slider (again) · show_guide = show the current brewing guide card again, only when they ask to see the guide (questions about time left or temperature: just answer in words, don't show or mention the guide) · gongfu_guide = they'll brew gongfu style in a gaiwan → switch to the gaiwan guide (a question like "what's a gaiwan?" is not this) · basic_guide = they'll just use a mug or teabag instead of a gaiwan → switch to the basic guide. pause_timer / resume_timer = pause / resume the brew timer. timer_set (number, seconds) = make the remaining time exactly this from now: "just 1 more minute is enough" → 60; "I'll brew it 3 minutes" while on the guide → step start_brew + timer_set 180. timer_add (number, seconds, negative to cut) = add to the remaining time: "add a minute" → 60, "30 seconds less" → -30. If you say the time changes, you MUST send timer_set or timer_add, and state the new remaining time exactly. If your reply says you'll show the slider or the guide or change the timer, you MUST include that request, or nothing happens.

[clear: record fields to erase]
If they want to erase something they already said or start it over ("delete what I said about the taste", "let me redo the aroma"), put that field in clear; the app empties it and goes back so you can ask again. If they give the new wording right away, put it in record instead (replace).

Example: "yuzu tea" → type other (fruit, grain and root teas without tea leaves are other, not herb; herb = herbal flowers/leaves only).

[How to talk]
Warm, polite, calm. 1–3 short sentences (under 220 chars), may be read aloud. React to what they said first; answer tea questions accurately. Name types in plain words. Never pretend to smell or taste, never say you'll move the slider, only mention the remaining brew time when they ask about it or change it. No markdown, lists, emoji or links.

`;
const FLAVOR_EN = ['Floral', 'Fruity', 'Citrus', 'Grassy', 'Fresh', 'Nutty', 'Sweet', 'Earthy', 'Spicy', 'Smooth', 'Astringent'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : DEFAULT_ORIGINS);
    // 출처 확인은 기본으로 끈다: B.html을 폰의 파일 앱·메신저·드라이브 미리보기로 열면 출처가 제각각(content://, 미리보기 도메인)이라 막히고,
    // 이 확인은 다른 사이트의 '브라우저'만 막을 뿐(주소는 앱 코드에 공개돼 있어 쉽게 우회됨) 실제 보호는 키를 서버에만 두는 것. 다시 켜려면 변수 STRICT_ORIGINS=1
    const strict = env.STRICT_ORIGINS === '1';
    const okOrigin = !strict || allowed.some(a => origin === a) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && allowed.some(a => /^http:\/\/(localhost|127\.0\.0\.1)/.test(a));   // localhost는 포트만 달라도 되지만, localhost.다른사이트.com 같은 건 막는다
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? (origin || '*') : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-TTS-Model, X-AI-Trace',
      'Vary': 'Origin',
    };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (new URL(req.url).pathname === '/live') return liveProxy(req, env, okOrigin);   // 실시간 음성(Gemini Live) 중계
    if (req.method === 'GET') {   // 주소가 살아 있는지 확인용. ?models 를 붙이면 이 키로 쓸 수 있는 Flash 모델 이름을 보여준다
      if (new URL(req.url).searchParams.has('models') && env.GEMINI_API_KEY) {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
        const j = r.ok ? await r.json() : {};
        return out({ ok: r.ok, status: r.status, models: (j.models || []).map(m => m.name.replace('models/', '')).filter(n => /flash/.test(n)) });
      }
      return out({ ok: true, service: 'teacanvas-ai', key: !!env.GEMINI_API_KEY });
    }
    if (req.method !== 'POST') return out({ error: 'method' }, 405);
    if (!okOrigin) return out({ error: 'origin' }, 403);
    if (!env.GEMINI_API_KEY) return out({ error: 'no key' }, 500);

    let body;
    try {
      const raw = await req.text();
      if (raw.length > MAX_BODY) return out({ error: 'too large' }, 413);
      body = JSON.parse(raw);
    } catch (e) { return out({ error: 'bad json' }, 400); }

    if (body && body.mode === 'speak') {   // 글 → 목소리(wav). 실패하면 JSON 오류 → 앱은 휴대폰 목소리로
      try {
        const { wav, model } = await speakGemini(env, body);
        return new Response(wav, { headers: { ...cors, 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'X-TTS-Model': model } });
      } catch (e) { return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); }
    }
    const tspec = TEXT_SPECS[body && body.mode];   // 대화·차 찾기: 필요하면 Google 검색까지 하는 글 응답
    if (tspec) {
      const en = body.lang === 'en';
      try {
        const text = await geminiText(env, tspec.system(en, body), tspec.prompt(body, en), { search: true, maxTokens: tspec.maxTokens, budgetMs: tspec.budgetMs, ...(tspec.think ? { think: tspec.think } : {}), ...(tspec.hedgeMs ? { hedgeMs: tspec.hedgeMs } : {}), image: photoOf(body) });
        const clean = tspec.clean(text, body);
        const res = clean ? out(clean) : out({ error: 'empty' }, 502); res.headers.set('X-AI-Trace', TRACE.join(' ')); return res;
      } catch (e) { const res = out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502); res.headers.set('X-AI-Trace', TRACE.join(' ')); return res; }
    }
    const spec = SPECS[body && body.mode];
    if (!spec) return out({ error: 'mode' }, 400);
    const en = body.lang === 'en';

    try {
      const json = await gemini(env, spec.system(en), spec.prompt(body, en), spec.schema, spec.maxTokens, body.mode === 'question' ? 8000 : 14000);
      const clean = spec.clean(json, body);
      if (!clean) return out({ error: 'empty' }, 502);
      return out(clean);
    } catch (e) {
      return out({ error: 'upstream', detail: String(e && e.message || e).slice(0, 200) }, 502);
    }
  },
};

/* ---------- Gemini 호출 ---------- */
// 무료 플랜은 모델이 붐비면 503을 준다 → 다음 모델로 넘어간다. 앱이 기다리는 시간 안에서만 시도한다.
// 무료 한도는 모델마다 따로다 (예: 3.5·3.1 Flash Lite 하루 500번·분당 15번, Flash 하루 20번). 가벼운 모델부터 쓰고, 한도(429)·붐빔(503)이면 다음 모델로
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview'];
const NO_THINK_CFG = new Set();      // 생각 끄기 설정을 거절한 모델 (다음 요청부터 바로 설정 없이)
// 3.x 모델과 '최신' 별칭은 생각 끄기(thinkingBudget 0)를 거절(400)한다 → 대신 '생각 최소(thinkingLevel minimal)'로 빨리 답하게. 그것도 거절하면 설정 없이
const noThink = m => NO_THINK_CFG.has(m);
const thinkCfg = (m, level = 'minimal') => /^gemini-3|latest$/.test(m) ? { thinkingLevel: level } : { thinkingBudget: level === 'minimal' ? 0 : 1024 };   // 대화 판단(flow)은 'low'로 조금 더 생각
let SEARCH_OFF_UNTIL = 0;           // 검색 한도가 차면(429) 잠시 검색 없이 (매번 거절당하며 시간 쓰지 않게)
async function gemini(env, system, prompt, schema, maxTokens, budgetMs) {
  const deadline = Date.now() + budgetMs;
  const models = [...new Set([...(env.GEMINI_MODEL ? env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...FALLBACK_MODELS])];
  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: maxTokens, temperature: 0.6 },
  };
  let last = 'no model';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const tries = noThink(model) ? [base] : [{ ...base, generationConfig: { ...base.generationConfig, thinkingConfig: thinkCfg(model) } }, base];
    for (let i = 0; i < tries.length; i++) {
      const left = deadline - Date.now();
      if (left < 1200) throw new Error('timeout; last ' + last);
      let r;
      try {
        r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(tries[i]), signal: AbortSignal.timeout(Math.min(4500, left - 300)) });
      } catch (e) { last = `${model} timeout`; break; }
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!text) { last = `${model} empty`; break; }
        return JSON.parse(text);
      }
      last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`;
      if (r.status === 400 && i === 0 && tries.length > 1) { NO_THINK_CFG.add(model); continue; }   // 설정 문제 → 설정 빼고 같은 모델로
      if (r.status === 401 || r.status === 403) throw new Error(last);                             // 키 문제는 다른 모델로 가도 같다
      break;                                                                                        // 503·429·404 등 → 다음 모델
    }
  }
  throw new Error(last);
}

/* ---------- 글 응답 + Google 검색 (대화·차 찾기) ---------- */
// 검색 도구를 붙여 보내고, 그 모델이 검색을 못 쓰거나(400) 검색 한도가 차면(429) 검색 없이 다시 보낸다
let TRACE = [];   // 어느 모델에서 얼마나 걸렸는지 (응답 머리말 X-AI-Trace로 확인용)
async function geminiText(env, system, prompt, { search, maxTokens, budgetMs, think = 'minimal', hedgeMs = 2500, image = null }) {
  // 붐빌 때를 위한 '겹쳐 묻기': 첫 모델이 2.5초 안에 답이 없으면 다음 모델에도 같이 묻고, 먼저 온 답을 쓴다 (동시에 최대 2개)
  const deadline = Date.now() + budgetMs; TRACE = [];
  const models = [...new Set([...(env.GEMINI_MODEL ? env.GEMINI_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...FALLBACK_MODELS])];
  const queue = []; for (const m of models) { if (search) queue.push({ m, tools: true }); queue.push({ m, tools: false }); }
  const tag = (a, x) => `${a.m.replace('gemini-', '')}${a.tools ? '+s' : ''}:${x}`;
  const attempt = async (a, signal) => {
    const level = think; for (const think of (noThink(a.m) ? [false] : [true, false])) {
      const gc = { maxOutputTokens: maxTokens, temperature: 0.7 };
      if (think) gc.thinkingConfig = thinkCfg(a.m, level);
      const payload = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }, ...(image ? [{ inline_data: image }] : [])] }], generationConfig: gc };   // image: 차 포장 사진
      if (a.tools) payload.tools = [{ google_search: {} }];
      const t0 = Date.now();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(a.m)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(payload), signal });
      TRACE.push(tag(a, `${r.status}:${Date.now() - t0}`));
      if (r.ok) {
        const j = await r.json();
        const text = (j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
        if (text) return text;
        throw new Error(`${a.m} empty`);
      }
      const body = (await r.text()).slice(0, 120);
      if (r.status === 400 && think) { NO_THINK_CFG.add(a.m); continue; }                       // 생각 설정을 모르는 모델 → 설정 없이 한 번 더
      if (r.status === 429 && a.tools) SEARCH_OFF_UNTIL = Date.now() + 15 * 60e3;              // 검색 한도 → 15분 동안 검색 없이
      const e = new Error(`${a.m} ${r.status} ${body}`); e.fatal = r.status === 401 || r.status === 403; throw e;
    }
    throw new Error(`${a.m} no variant`);
  };
  return new Promise((resolve, reject) => {
    let running = 0, done = false, last = 'no model'; const ctls = new Set();
    const finish = (ok, v) => { if (done) return; done = true; ctls.forEach(c => c.abort()); ok ? resolve(v) : reject(v); };
    const launch = () => {
      if (done) return;
      let a; while ((a = queue.shift()) && a.tools && Date.now() < SEARCH_OFF_UNTIL);   // 검색이 쉬는 중이면 검색 시도는 건너뛴다
      const left = deadline - Date.now();
      if (!a || left < 1200) { if (!running) finish(false, new Error((a ? 'timeout; last ' : '') + last)); return; }
      running++; const ctl = new AbortController(); ctls.add(ctl);
      const cap = setTimeout(() => ctl.abort(), left - 300);   // 붐빌 때 느린 답도 마감까지 기다린다 (2.5초 뒤엔 다른 모델도 같이 시도)
      let hedge = setTimeout(() => { hedge = null; if (!done && running < 2) launch(); }, hedgeMs);
      attempt(a, ctl.signal).then(t => finish(true, t)).catch(e => {
        if (e && e.name === 'AbortError') { if (!done) TRACE.push(tag(a, 'timeout')); last = `${a.m} timeout`; }
        else last = String(e && e.message || e);
        if (e && e.fatal) finish(false, e);
      }).finally(() => { running--; ctls.delete(ctl); clearTimeout(cap); if (hedge) clearTimeout(hedge); if (!done && running < 2) launch(); });
    };
    launch();
  });
}
const plain = t => String(t || '').replace(/\*\*|__|[#*`>]/g, '').replace(/\[(\d+(,\s*\d+)*)\]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const STAGE_KO = { tea: '차 이름을 정하는 중', teaOK: '차 종류를 확인하는 중', teaType: '차 종류를 고르는 중', guide: '우림 가이드를 보는 중', wait: '차가 우러나기를 기다리는 중', color: '찻물 색을 보는 중', wait2: '다 우러나기를 기다리는 중', aroma: '향을 맡아보는 중', taste: '맛을 보는 중', free: '차를 마시며 자유롭게 이야기하는 중', after: '다 마시고 여운을 보는 중', more: '기록을 마무리하는 중', deep: '기록을 마무리하는 중' };
const TEXT_SPECS = {
  chat: {
    maxTokens: 400, budgetMs: 9500,
    system: en => (en
      ? `You are a friend sitting with the user over a cup of tea, inside TEA CANVAS (an app that records how tea tastes and smells and turns it into a watercolor drop).
How to talk:
- Listen first. Respond to exactly what the user just said: pick up their words, their mood, their story. Never ignore it to follow a script.
- Calm, light, warm, everyday words. 1–3 short sentences (under 220 characters) — your reply may be read aloud.
- Ask at most one light question, and not every time. Small talk can go anywhere natural (their day, the place, the tea, memories), no fixed topics.
- If they ask about the tea (origin, how it's made, why it tastes a certain way, caffeine, brewing), answer accurately and simply. Search the web when you are not sure. If you still don't know, say so briefly.
- Don't lecture, don't list, no markdown, no emoji, no links. Don't put words in their mouth about how the tea tastes.
- If the user says they've finished drinking or want to wrap up, reply with one warm closing sentence and then write [[FINISH]] at the very end.`
      : `너는 TEA CANVAS(차의 맛과 향을 기록해 수채화 찻방울로 남기는 앱) 안에서, 사용자와 마주 앉아 차를 함께 마시는 친구야.
말하는 법:
- 먼저 들어. 사용자가 방금 한 말에 정확히 반응해. 그 말·기분·이야기를 받아서 이어가고, 정해진 순서대로 묻느라 흘려듣지 마.
- 말투는 처음부터 끝까지 늘 다정한 존댓말(해요체)이야. 사용자가 반말을 해도 반말로 바꾸지 마. ('~해요', '~네요', '~할까요?' 등. '~해', '~야', '~지?' 같은 반말 금지)
- 차분하고 가볍고 쉬운 일상어. 1~3문장, 160자 이내 (소리 내 읽을 수 있어).
- 질문은 한 번에 하나만, 매번 하지 않아도 돼. 가벼운 이야기는 정해진 주제 없이 자연스럽게 (오늘 하루, 있는 곳, 이 차, 추억 등).
- 차에 대해 물으면 (산지, 만드는 법, 왜 이런 맛이 나는지, 카페인, 우리는 법) 정확하고 쉽게 답해. 확실하지 않으면 웹에서 찾아봐. 그래도 모르면 짧게 모른다고 해.
- 가르치려 하지 말고, 목록·마크다운·이모지·링크 금지. 사용자가 느끼지 않은 맛을 느꼈다고 단정하지 마.
- 너는 차를 직접 맛보거나 냄새 맡을 수 없어. '향이 나네요'처럼 네가 느낀 듯 말하지 말고, 사용자의 느낌을 받아서 말해 ('그런 향이 느껴지셨군요').
- 타이머 숫자(몇 초 남음 등)는 말하지 마. 시간은 앱이 알려줘.
- 사용자가 다 마셨다거나 이제 마무리하고 싶다고 하면, 다정한 마무리 한 문장을 말하고 맨 끝에 [[FINISH]] 라고 붙여.`),
    prompt: (b, en) => {
      const ev = str(b.event, 30), t = b.timer;
      const timer = t && t.total ? (en ? `Brew timer: ${Math.max(0, t.left | 0)}s left of ${t.total | 0}s` : `우림 타이머: ${t.total | 0}초 중 ${Math.max(0, t.left | 0)}초 남음`) : '';
      const what = ev === 'idle'
        ? (en ? 'The user has been quiet for a while. Say one gentle thing that fits this moment (a small sensory nudge or a light question). Do not repeat earlier lines.' : '사용자가 한동안 조용해. 지금 이 순간에 어울리는 말을 한 번 건네 줘 (감각을 깨우는 짧은 말이나 가벼운 질문). 앞에서 한 말은 반복하지 마.')
        : ev === 'brew_start'
        ? (en ? 'They just started brewing. Open the conversation in one or two short sentences, fitting this tea.' : '방금 우림을 시작했어. 이 차에 어울리게 한두 문장으로 대화를 열어 줘.')
        : ev.startsWith('answered:')
        ? (en ? `The app asked about the tea's ${ev.slice(9)} and the user answered: "${str(b.message, 300)}". React warmly in ONE short sentence to what they said. Do not ask anything; the app asks the next question.` : `앱이 차의 ${({ color: '색', aroma: '향', taste: '맛' })[ev.slice(9)] || ev.slice(9)}을 물었고 사용자가 이렇게 답했어: "${str(b.message, 300)}". 그 말에 짧게 한 문장으로만 반응해. 질문은 하지 마 (다음 질문은 앱이 해).`)
        : (en ? `The user just said: "${str(b.message, 400)}"` : `사용자가 방금 한 말: "${str(b.message, 400)}"`);
      return [teaLine(b, en), b.about ? (en ? 'About this tea: ' : '이 차 정보: ') + str(b.about, 200) : '',
        (en ? 'Now: ' : '지금: ') + (STAGE_KO[b.stage] || str(b.stage, 20)), timer,
        (en ? 'Conversation so far:\n' : '지금까지 대화:\n') + (historyText(b, en) || '-'), '', what].filter(Boolean).join('\n');
    },
    clean: (text, b) => {
      let t = plain(text), finish = /\[\[\s*FINISH\s*\]\]/i.test(t);
      t = t.replace(/\[\[\s*FINISH\s*\]\]/ig, '').trim().slice(0, 400);
      return t ? { reply: t, finish } : null;
    },
  },
  /* 대화 전체를 AI가 이끈다: 앱은 큰 단계와 '지금 채울 것(want)·그다음(next)'만 알려주고, AI가 듣고 말하고 기록할 것을 뽑는다 */
  flow: {
    maxTokens: 2500, budgetMs: 15500, think: 'low', hedgeMs: 6000,   // 정확도 우선: 조금 더 생각하고, 붐빌 때만 다른 모델에도 묻는다
    system: en => (en ? FRAME_EN + APP_GUIDE_EN + `

Reply with ONLY one JSON object, in this order:
{"understood": "...", "record": {changed fields only}, "flavors": [], "clear": [], "unknown": [], "requests": [], "timer_set": null, "timer_add": null, "step": "stay", "heard": "(speech only) corrected sentence", "reply": "...", "reply_says": []}
reply_says = after writing reply, list the app actions your reply says will happen now (show_color, show_guide, gongfu_guide, basic_guide, pause_timer, resume_timer); empty if none. Keep it truthful to your reply.` : FRAME_KO + APP_GUIDE_KO + `

답은 JSON 하나만, 이 순서로:
{"understood": "...", "record": {바뀐 칸만}, "flavors": [], "clear": [], "unknown": [], "requests": [], "timer_set": null, "timer_add": null, "step": "stay", "heard": "(음성일 때만) 고친 문장", "reply": "...", "reply_says": []}
reply_says = reply를 쓴 뒤, 네 reply가 지금 하겠다고 말한 앱 동작을 적어 (show_color, show_guide, gongfu_guide, basic_guide, pause_timer, resume_timer). 없으면 빈 배열. reply와 정확히 맞게.`),
    prompt: (b, en) => {
      const t = b.timer, f = b.filled && typeof b.filled === 'object' ? b.filled : {};
      const mmss = x => { x = Math.max(0, x | 0); return en ? `${Math.floor(x / 60)}m ${x % 60}s` : `${Math.floor(x / 60)}분 ${x % 60}초`; };
      const timer = t && t.total ? (t.left > 0 ? (en ? `The tea is still steeping (${mmss(t.left)} left of ${mmss(t.total)}${t.running === false ? ', paused' : ''}).` : `차가 아직 우러나는 중이야 (전체 ${mmss(t.total)} 중 ${mmss(t.left)} 남음${t.running === false ? ', 멈춤' : ''}).`) : (en ? 'The tea is ready (timer finished).' : '차가 다 우러났어 (타이머 끝남).')) : '';
      const ev = str(b.event, 30);
      const evText = {
        brew_start: en ? 'They just started steeping. Open the conversation in one or two short sentences.' : '방금 우리기 시작했어. 한두 문장으로 대화를 열어 줘.',
        color_ready: en ? 'The color is coming out now. Invite them to look at the tea\'s color (want is color).' : '이제 찻물에 색이 우러나고 있어. 찻물 색을 보자고 자연스럽게 권해 줘 (want는 color).',
        brew_done: en ? 'The tea has finished steeping. Tell them it\'s ready and invite them to smell it (want is aroma).' : '차가 다 우러났어. 다 됐다고 알려주고 향을 맡아보자고 권해 줘 (want는 aroma).',
        wrap: en ? 'The user says they have had enough. React warmly, then ask about the aftertaste (want is after).' : '사용자가 이제 충분히 마셨대. 다정하게 반응하고 끝에 남는 여운을 물어 줘 (want는 after).',
        idle: en ? 'The user has been quiet for a while. Say one gentle thing that fits this moment.' : '사용자가 한동안 조용해. 지금에 어울리는 말을 한 번 건네 줘.',
      }[ev];
      const g = b.guide && typeof b.guide === 'object' ? b.guide : null;
      return [teaLine(b, en), b.about ? (en ? 'About this tea: ' : '이 차 정보: ') + str(b.about, 200) : '', timer,
        g ? (en ? `Brewing guide shown in the app${g.gongfu ? ' (gaiwan / gongfu style)' : ''}: water ${str(g.temp, 20)}, steep ${str(g.time, 20)}. When you mention temperature or time, match these.` : `앱의 우림 가이드${g.gongfu ? '(개완으로 짧게 여러 번)' : ''}: 물 ${str(g.temp, 20)}, 시간 ${str(g.time, 20)}. 온도·시간을 말할 땐 이 값과 맞춰.`) : '',
        (en ? 'Stage now: ' : '지금 단계: ') + (STAGE_TXT[str(b.stage, 10)] || ['-', '-'])[en ? 1 : 0] + ` (app hint — want: ${str(b.want, 10) || 'none'} / next: ${str(b.next, 10) || 'none'})`,
        b.voice ? (en ? `The user's message came from speech recognition, so some words may be misheard${list(b.voice.alts, 3, 120).length ? ` (other guesses: ${list(b.voice.alts, 3, 120).join(' / ')})` : ''}. Work out what they most likely meant from the conversation, the tea and flavor words, put the corrected sentence in "heard" (fix misheard words, drop fillers like uh/um, keep their meaning and wording, and add a question mark if it's a question — speech recognition never adds punctuation), and reply to that.` : `사용자 말은 음성 인식 결과라 잘못 들린 글자가 있을 수 있어${list(b.voice.alts, 3, 120).length ? ` (다른 후보: ${list(b.voice.alts, 3, 120).join(' / ')})` : ''}. 대화 흐름·차 이름·맛 표현을 보고 원래 하려던 말을 추정해서 "heard"에 고친 문장을 넣고 (잘못 들린 말은 바로잡고, 어·음 같은 추임새는 빼고, 뜻과 말투는 그대로. 음성 인식은 문장부호를 안 붙이니 질문이면 물음표를 붙여), 그 뜻에 맞게 대답해. 물음표가 없어도 말끝(~야, ~나, ~까, ~지)과 흐름으로 질문인지 판단해. 뜻을 도저히 모르겠으면 짧게 되물어.`) : '',
        b.screen && b.screen.color ? (en ? `On screen: a color slider set to "${str(b.screen.color, 20)}". If the user agrees with it ("similar", "like this"), set record.color to "${str(b.screen.color, 20)}".` : `화면: 찻물 색 슬라이더가 '${str(b.screen.color, 20)}'(으)로 맞춰져 있어. 사용자가 비슷하다·이대로라고 하면 record.color에 '${str(b.screen.color, 20)}'을 넣어.`) : '',
        Array.isArray(b.drop) ? (en ? 'Flavors in the drop so far: ' : '지금 찻방울에 담긴 풍미: ') + (list(b.drop, 11, 20).join(', ') || '-') + ` (${list(b.drop, 11, 20).length})` : '',
        memLine(b, en),
        (en ? 'Already recorded: ' : '이미 기록한 것: ') + (Object.entries(f).filter(([k, v]) => v).map(([k, v]) => `${k}=${str(v, 60)}`).join(', ') || '-'),
        (en ? 'Conversation so far:\n' : '지금까지 대화:\n') + (historyText(b, en) || '-'), '',
        photoOf(b) ? (en ? 'The user sent a photo of the tea (attached). Read the text on the package (English, Chinese, Japanese…) and the pictures, and work out which tea it is. If found, put name (natural Korean or English name; add the original in parentheses if useful), brand, type and about in record, say briefly in reply what you read, and ask whether to record it as that type. If it is unreadable, say so honestly and ask for the name.' : '사용자가 차 포장 사진을 보냈어 (첨부). 포장의 글자(영어·중국어·일본어 등)와 그림을 읽고 어떤 차인지 알아내. 알아내면 record에 name(자연스러운 한국어 이름, 필요하면 원어를 괄호로), brand, type, about를 넣고, reply에서 무엇을 읽었는지 짧게 말한 뒤 그 종류로 기록할지 물어봐. 잘 안 읽히면 솔직하게 말하고 이름을 물어봐.') : '',
        evText || ((en ? 'The user just said: ' : '사용자가 방금 한 말: ') + `"${str(b.message, 400)}"`)].filter(Boolean).join('\n');
    },
    clean: (text, b) => {
      const raw = String(text || ''), m = raw.match(/\{[\s\S]*\}/);
      let j = null; if (m) { try { j = JSON.parse(m[0]); } catch (e) { j = null; } }
      if (!j) { const t = plain(raw.replace(/```[a-z]*|```/g, '')).slice(0, 400); return t && !/^\{/.test(t) ? { reply: t, fill: {}, sense: false, finish: false, end: false } : null; }   // JSON이 깨지면 글만이라도
      const reply = plain(str(j.reply, 500)).slice(0, 400); if (!reply) return null;
      const rec = (j.record && typeof j.record === 'object' ? j.record : j.fill && typeof j.fill === 'object' ? j.fill : {});
      const KEYS = ['color', 'tone', 'aroma', 'taste', 'after', 'extra', 'mood', 'scene', 'why', 'origin', 'temp', 'time', 'memo', 'name', 'brand', 'about'], fill = {};
      for (const k of KEYS) { const v = str(rec[k], 120); if (v) fill[k] = v; }
      const type = typeCode(rec.type); if (type) fill.type = type;
      const unknown = Array.isArray(j.unknown) ? j.unknown.filter(k => KEYS.includes(k)) : [];
      unknown.forEach(k => { delete fill[k]; });   // '모르겠어'는 기록이 아니다
      const STEPS = ['stay', 'confirm_tea', 'guide_gongfu', 'guide_basic', 'start_brew', 'drink_now', 'brew_done', 'show_color', 'finished_drinking', 'close'];
      let step = STEPS.includes(j.step) ? j.step : ({ start_brew: 'start_brew', drink_now: 'drink_now', brew_done: 'brew_done', ask_color: 'show_color' })[j.action] || (j.end ? 'close' : j.finish ? 'finished_drinking' : 'stay');
      const st = b && b.stage;
      if (['confirm_tea', 'start_brew', 'drink_now'].includes(step) && (st === 'teaOK' || st === 'teaType') && !fill.type) { const t = typeCode(b.tea && b.tea.type); if (t) fill.type = t; }   // '응 맞아(…이미 우렸어)' → 제안한 종류로 확정
      const REQS = ['show_color', 'show_guide', 'gongfu_guide', 'basic_guide', 'pause_timer', 'resume_timer'];
      const ts = Number(j.timer_set), timer_set = Number.isFinite(ts) && ts > 0 ? Math.min(3600, Math.max(5, Math.round(ts))) : 0;
      const ta = Number(j.timer_add), timer_add = !timer_set && Number.isFinite(ta) && ta !== 0 ? Math.max(-3600, Math.min(3600, Math.round(ta))) : 0;
      const requests = [...new Set((Array.isArray(j.requests) ? j.requests : []).concat(Array.isArray(j.reply_says) ? j.reply_says : [], ({ show_color: 'show_color', guide_gongfu: 'gongfu_guide', guide_basic: 'basic_guide' })[step] || []).filter(r => REQS.includes(r)))];
      if (['show_color', 'guide_gongfu', 'guide_basic'].includes(step)) step = 'stay';   // 예전 모양 → 요청으로
      const clear = (Array.isArray(j.clear) ? j.clear : []).filter(k => ['color', 'aroma', 'taste', 'after', 'mood', 'scene', 'why', 'memo', 'extra'].includes(k) && !fill[k]);
      if (step === 'confirm_tea' && !fill.type) step = 'stay';
      if (step === 'drink_now' && (st === 'wait' || st === 'wait2')) step = 'brew_done';   // 우리는 중의 '이미 우렸어'는 다 우린 것과 같은 뜻
      const action = ({ start_brew: 'start_brew', drink_now: 'drink_now', brew_done: 'brew_done' })[step] || (requests.includes('show_color') ? 'ask_color' : '');
      const heard = plain(str(j.heard, 200));
      const FLK = ['floral', 'fruity', 'citrus', 'vegetal', 'fresh', 'nutty', 'sweet', 'earthy', 'spicy', 'soft', 'astringent'];
      const flavors = [...new Set((Array.isArray(j.flavors) ? j.flavors : []).filter(k => FLK.includes(k)))].slice(0, 4);
      const sense = ['color', 'aroma', 'taste', 'after'].some(k => fill[k]) || flavors.length > 0;
      return { reply, fill, sense, finish: step === 'finished_drinking', end: step === 'close', step, ...(requests.length ? { requests } : {}), ...(timer_set ? { timer_set } : {}), ...(timer_add ? { timer_add } : {}), ...(flavors.length ? { flavors } : {}), ...(clear.length ? { clear } : {}), ...(unknown.length ? { unknown } : {}), ...(action ? { action } : {}), ...(heard && heard !== '(음성일 때만) 고친 문장' ? { heard } : {}) };
    },
  },
  identify: {
    maxTokens: 500, budgetMs: 10000,
    system: en => 'You identify teas from what the user typed. For a specific product, search the web to find it. Reply with ONLY a JSON object, no other text.',
    prompt: (b, en) => `Tea the user typed: "${str(b.text, 80)}"${b.brand ? ` (brand: ${str(b.brand, 40)})` : ''}
Return JSON: {"found": true/false, "name": product name as commonly written${en ? '' : ' in Korean'}, "brand": brand or "", "type": one of ${TEA_TYPES.join('|')} (blends: by the base tea leaf; herb = herbal plants only like chamomile, mint, rooibos, hibiscus; other = everything else without tea leaves: fruit teas, grain or root teas), "about": ${en ? 'one short sentence (under 80 chars) on its base and main flavor notes' : '이 차의 바탕 찻잎과 주된 향·맛을 한 문장으로 (60자 이내, 해요체)'}}
The user may type a whole sentence (e.g. "I don't know the brand but it's rooibos") — take only the tea. A general tea (green tea, rooibos, chamomile, Earl Grey…) also counts as found: use its common name and describe it in general. Set found to false only if you cannot tell what tea it is.`,
    clean: (text) => {
      const m = String(text || '').match(/\{[\s\S]*\}/); if (!m) return null;
      let j; try { j = JSON.parse(m[0]); } catch (e) { return null; }
      if (!j || !j.found || !TEA_TYPES.includes(j.type)) return { found: false };
      return { found: true, name: str(j.name, 30), brand: str(j.brand, 30), type: j.type, about: plain(str(j.about, 160)) };
    },
  },
};

/* ---------- 목소리 (Gemini TTS) ---------- */
// 보내는 것: {mode:'speak', text, lang, voice?, style?}  받는 것: audio/wav
// 목소리 모델은 무료 한도가 아주 작다 (하루 10번 안팎). 모델마다 따로라 여러 개를 차례로 쓴다
// 고른 목소리(Zephyr·Umbriel) 샘플을 만든 3.8 Flash TTS를 먼저 쓴다
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
async function speakGemini(env, b) {
  const text = str(b.text, 400);
  if (!text) throw new Error('no text');
  const voice = /^[A-Za-z]{2,20}$/.test(b.voice || '') ? b.voice : 'Sulafat';
  // 말투 지시문을 앞에 붙이면 가벼운 목소리 모델은 그 지시문까지 소리 내 읽는다 → 읽을 글만 보낸다
  // pin: 같은 대화에서는 처음 쓴 모델만 쓴다(모델마다 목소리 결이 달라 말할 때마다 바뀌지 않게). 그 모델이 안 되면 오류 → 앱은 휴대폰 목소리로
  const pin = /^gemini-[a-z0-9.\-]+-tts$/.test(b.pin || '') ? b.pin : '';
  const deadline = Date.now() + 12000;
  const models = pin ? [pin] : [...new Set([...(env.GEMINI_TTS_MODEL ? env.GEMINI_TTS_MODEL.split(',').map(s => s.trim()).filter(Boolean) : []), ...TTS_MODELS])];
  let last = 'no model';
  for (const model of models) {
    const left = deadline - Date.now();
    if (left < 1500) break;
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(left - 300),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
        }),
      });
    } catch (e) { last = `${model} timeout`; continue; }
    if (!r.ok) { last = `${model} ${r.status} ${(await r.text()).slice(0, 120)}`; if (r.status === 401 || r.status === 403) break; continue; }
    const j = await r.json();
    const parts = (j.candidates?.[0]?.content?.parts || []).filter(p => p.inlineData && p.inlineData.data);
    if (!parts.length) { last = `${model} no audio`; continue; }
    const rate = +((parts[0].inlineData.mimeType || '').match(/rate=(\d+)/) || [])[1] || 24000;
    const pcm = concat(parts.map(p => b64ToBytes(p.inlineData.data)));
    return { wav: pcmToWav(cleanTail(pcm, rate), rate), model };
  }
  throw new Error(last);
}
function concat(arrs) { const n = arrs.reduce((a, x) => a + x.length, 0), out = new Uint8Array(n); let o = 0; for (const x of arrs) { out.set(x, o); o += x.length; } return out; }
/* 목소리 끝의 '치직' 소리 없애기: 말이 끝나고 0.1초 넘게 조용하다가, 맨 끝에 짧고(0.4초 이하) 아주 큰 소리가 붙어 있으면 그 앞에서 자른다.
   말소리(보통 크기)나 문장 사이 쉼은 건드리지 않는다. 끝은 0.03초 동안 살짝 줄여 툭 끊기지 않게 */
function cleanTail(pcm, rate) {
  const n = pcm.length >> 1, win = Math.round(rate * 0.02), W = Math.floor(n / win); if (W < 20) return pcm;
  const v = new DataView(pcm.buffer, pcm.byteOffset, n * 2), R = [];
  for (let w = 0; w < W; w++) { let s = 0; for (let k = w * win; k < (w + 1) * win; k++) { const x = v.getInt16(k * 2, true); s += x * x; } R.push(Math.sqrt(s / win)); }
  let end = n;
  for (let w = W - 1, run = 0; w >= Math.max(0, W - 50); w--) {   // 끝에서 1초 안: 0.1초 넘게 조용한 구간을 찾고, 그 뒤가 짧고 아주 크면 자른다
    if (R[w] < 150) { run++; continue; }
    if (run >= 5) { const tail = R.slice(w + run + 1); if (tail.length <= 20 && Math.max(...tail) > 8000) end = (w + run + 1) * win; break; }
    run = 0;
  }
  const fade = Math.min(Math.round(rate * 0.03), end), out = new Uint8Array(pcm.slice(0, end * 2)), ov = new DataView(out.buffer);
  for (let k = 0; k < fade; k++) { const i = end - fade + k; ov.setInt16(i * 2, Math.round(ov.getInt16(i * 2, true) * (1 - k / fade)), true); }
  return out;
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function pcmToWav(pcm, rate) {   // 16비트 모노 PCM 앞에 WAV 머리말(44바이트)을 붙인다
  const h = new DataView(new ArrayBuffer(44)), w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}

/* ---------- 공통 ---------- */
const str = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const list = (v, n, len) => (Array.isArray(v) ? v.map(x => str(x, len)).filter(Boolean).slice(0, n) : []);
const teaLine = (b, en) => {
  const t = b.tea;
  if (!t || !t.name) return en ? 'Tea: unknown' : '차: 아직 모름';
  return (en ? 'Tea: ' : '차: ') + [t.brand, t.name].filter(Boolean).join(' ') + (t.type ? ` (${t.type})` : '');
};
const historyText = (b, en) => list((b.history || []).map(m => m && `${m.who === 'me' ? (en ? 'User' : '사용자') : (en ? 'Guide' : '안내')}: ${m.text}`), 30, 300).join('\n');
const VOICE = en => en
  ? 'You are the gentle guide of TEA CANVAS, an app where people record how a tea tastes and smells and turn it into a watercolor drop. Tone: calm, light, warm, everyday words, short sentences. Never lecture. No markdown, no emoji, no lists.'
  : '너는 차를 마시며 맛과 향을 기록하는 앱 TEA CANVAS의 안내자야. 말투는 늘 차분하고 다정한 존댓말(해요체)이고, 사용자가 반말을 해도 반말로 바꾸지 마. 쉬운 일상어, 짧은 문장. 가르치려 하지 마. 마크다운·이모지·목록 금지.';

/* ---------- 모드별 설정 ---------- */
const SPECS = {
  /* 실시간 음성에서 받아 적은 내 말 고치기: 음성 인식이 잘못 들은 낱말을 대화 흐름·차 이름으로 바로잡아, 채팅 기록에 바른 문장으로 남긴다 */
  heard: {
    maxTokens: 900,
    system: en => en
      ? 'You fix speech-recognition transcripts of what the user said in a tea-tasting app conversation. For each item, return the sentence the user most likely said: fix misheard words using the conversation, the tea name and tea/app words (e.g. brewing guide, Darjeeling, Earl Grey), drop fillers (uh, um), add a question mark if it is a question. Keep their meaning, wording and casual tone; do not paraphrase or add anything. If it already looks right or you are unsure, return it unchanged. Write tea names in the language the user speaks (Korean names in Korean).'
      : '차 기록 앱에서 사용자가 말한 것을 음성 인식으로 받아 적은 문장을 고쳐. 각 문장마다 사용자가 실제로 했을 말을 돌려줘: 대화 흐름, 차 이름, 차·앱 낱말(우림 가이드, 다즐링, 얼그레이, 찻물, 개완 등)을 보고 잘못 들린 낱말을 바로잡고, 어·음 같은 추임새는 빼고, 질문이면 물음표를 붙여. 뜻·말투(반말 등)·표현은 그대로 두고, 바꿔 말하거나 덧붙이지 마. 이미 맞거나 확실하지 않으면 그대로 돌려줘. 차 이름은 한국어로 말했으면 한국어로 써 (예: dazzling → 다즐링).',
    prompt: (b, en) => {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 12).map(x => ({ id: str(x && x.id, 20), text: str(x && x.text, 300) })).filter(x => x.id && x.text);
      return [teaLine(b, en), (en ? 'Conversation so far:\n' : '지금까지 대화:\n') + (historyText(b, en) || '-'), '', (en ? 'Fix these (id: text):' : '고칠 문장 (id: 문장):'), ...items.map(x => `${x.id}: ${x.text}`)].join('\n');
    },
    schema: { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['id', 'text'] } } }, required: ['items'] },
    clean: j => { const items = (j && Array.isArray(j.items) ? j.items : []).map(x => ({ id: str(x && x.id, 20), text: plain(str(x && x.text, 300)) })).filter(x => x.id && x.text); return items.length ? { items } : null; },
  },
  question: {
    maxTokens: 300,
    system: en => VOICE(en) + (en
      ? ' The user asks a question while brewing or drinking. Answer in 1–3 short sentences (under 220 characters) that can be read aloud. If unsure, say so briefly. If the question is unrelated to tea, answer briefly and gently guide back to the tea.'
      : ' 사용자가 차를 우리거나 마시다가 질문해. 소리 내 읽어도 자연스럽게 1~3문장, 180자 이내로 답해. 확실하지 않으면 짧게 그렇다고 말해. 차와 상관없는 질문이면 짧게 답하고 차 이야기로 부드럽게 돌아와.'),
    prompt: (b, en) => `${teaLine(b, en)}\n${en ? 'Recent conversation' : '최근 대화'}:\n${historyText(b, en) || '-'}\n\n${en ? 'Question' : '질문'}: ${str(b.question, 400)}`,
    schema: { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] },
    clean: j => { const text = str(j && j.text, 400); return text ? { text } : null; },
  },

  compare: {
    maxTokens: 700,
    system: en => VOICE(en) + (en
      ? ' Compare the user\'s own tasting notes with a general expert description of this tea. Respect the user\'s words as they are; never say they are wrong. Use the user\'s exact phrases in ‘ ’ quotes when pointing out their own expressions. Address the user as "you" / "your notes"; never say "we".'
      : ' 사용자가 남긴 표현과 이 차의 일반적인 전문가 설명을 비교해. 사용자의 표현을 그대로 존중하고, 틀렸다고 하지 마. 사용자의 표현을 짚을 때는 그 말을 ‘ ’(작은따옴표 모양의 둥근 따옴표) 안에 그대로 인용해. 사용자를 가리킬 때는 앱 문구처럼 "내가 느낀", "내 기록", "나는"을 써. "우리", "당신", "적어주신"은 쓰지 마. 전문가는 "전문가 설명"이라고 불러.'),
    prompt: (b, en) => {
      const L = b.local || {};
      const labels = list(b.labels, 11, 20);
      return [
        teaLine(b, en),
        (en ? 'User expressions: ' : '사용자 표현: ') + (list(b.expressions, 20, 120).join(' / ') || '-'),
        (en ? 'First impressions: ' : '첫인상: ') + JSON.stringify(b.feel || {}),
        (en ? 'Flavors in the drop: ' : '찻방울에 담긴 풍미: ') + (list(b.flavors, 11, 20).join(', ') || '-'),
        (en ? 'Current expert text: ' : '지금 전문가 설명: ') + (str(L.expert, 300) || '-') + (L.generic ? (en ? ' (generic for the tea type)' : ' (차 종류 일반 설명)') : ''),
        (en ? 'Current common points: ' : '지금 공통점: ') + (list(L.common, 6, 20).join(', ') || '-'),
        '',
        en ? `Return JSON:
- expert: ${L.generic ? 'a 1–2 sentence expert-style description of THIS specific tea (under 110 chars). If you do not know this tea, return an empty string.' : 'return an empty string (keep the current one).'}
- common: flavors that BOTH the user's notes and the expert text actually mention (if only one side has it, it's not common). Choose ONLY from this list: ${labels.join(', ')}. 0–4 items.
- diff: 1–2 short sentences (under 60 chars each) about what only the user noticed or only the expert mentions. Base it ONLY on the user's tea notes (color, aroma, taste, feel) and the expert text — never on weather, mood or small talk, and never invent points. Don't list a flavor as a difference if it is in common. State differences as differences; don't explain them away.
- ai: a warm 1–2 sentence reading (under 120 chars) of how the user's senses relate to the description, grounded only in their tea notes and the expert text; if they differ, say so warmly instead of forcing a link.
- mine: one tidy line (under 90 chars) of the user's notes about how the tea looks, smells and tastes, joined with commas in their own words. Drop fillers (uh, um, like…), small talk and words the speech recognition obviously misheard. Never add impressions they didn't give. e.g. "nutty, gentle aroma, a little sweet and bitter".
- own: 0–3 of the user's most personal, vivid phrases (images, memories, scenes — e.g. "like a forest path after rain"), taken from their expressions above; you may drop fillers but keep their words. Skip plain flavor words like "grassy" or "sweet".`
          : `JSON으로 답해:
- expert: ${L.generic ? '이 차(이름 기준)에 대한 전문가식 설명 1~2문장, 90자 이내. 이 차를 잘 모르면 빈 문자열.' : '빈 문자열 (지금 설명을 그대로 쓴다).'}
- common: 사용자 표현과 전문가 설명 양쪽에 실제로 다 나온 풍미만 (한쪽에만 있으면 공통이 아니야). 반드시 이 목록에서만 골라: ${labels.join(', ')}. 0~4개.
- diff: 사용자만 느낀 것 또는 전문가만 말한 것, 짧은 문장 1~2개 (각 45자 이내, '~했어요' 체). 사용자의 차 표현(색·향·맛·느낌)과 전문가 설명만 근거로 해. 날씨·기분·잡담은 쓰지 말고, 없는 내용을 지어내지 마. common에 넣은 풍미는 차이점으로 쓰지 마. 다른 점은 다르다고만 쓰고 억지로 이어 붙이거나 합리화하지 마.
- ai: 내 감각과 설명이 어떻게 닿아 있는지 다정한 해석 1~2문장, 100자 이내. 사용자의 차 표현과 전문가 설명만 근거로 해. 서로 다르면 억지로 잇지 말고 다르다는 걸 다정하게 말해.
- mine: 사용자가 남긴 차의 색·향·맛·느낌 표현을 정리한 한 줄 (70자 이내). 추임새(어, 음, 아, 그, 막, 그냥, 이제…), 잡담, 음성 인식이 잘못 들은 말(뜻이 안 통하는 말)은 빼고, 사용자의 말을 살려 쉼표로 이어. 말끝('~가 나', '~이 있고', '~해')은 '은은한 냄새', '달큰한 맛'처럼 짧은 표현으로 다듬고, 차와 상관없는 말(뜨거워, 맛있어 같은 단순 반응은 하나만 남겨도 돼)은 줄여. 사용자가 하지 않은 표현은 절대 지어내지 마. 예: '고소하고 은은한 냄새, 살짝 달큰한 맛, 비 오는 날 같은 느낌'.
- own: 사용자 표현 중 가장 그 사람다운 생생한 표현 0~3개 (장면·기억·비유, 예: '비 온 뒤 숲길 같은 향'). 위 사용자 표현에서 가져오되 추임새는 빼고, 말끝('~가 나', '~이 있고')과 띄어쓰기('달 크단'→'달큰한')는 다듬어. 뜻은 바꾸지 마. '풀향', '단맛'처럼 흔한 풍미 단어만 있는 건 빼.`,
      ].join('\n');
    },
    schema: {
      type: 'OBJECT',
      properties: {
        expert: { type: 'STRING' },
        common: { type: 'ARRAY', items: { type: 'STRING' } },
        diff: { type: 'ARRAY', items: { type: 'STRING' } },
        ai: { type: 'STRING' },
        own: { type: 'ARRAY', items: { type: 'STRING' } },
        mine: { type: 'STRING' },
      },
      required: ['common', 'diff', 'ai'],
    },
    clean: (j, b) => {
      if (!j) return null;
      const labels = new Set(list(b.labels, 11, 20));
      const outp = {
        common: list(j.common, 4, 20).filter(x => !labels.size || labels.has(x)),
        diff: list(j.diff, 2, 80),
        ai: str(j.ai, 200),
      };
      const ex = str(j.expert, 200);
      if (ex && b.local && b.local.generic) outp.expert = ex;
      // 사용자가 실제로 한 말에서 온 것만 남긴다: 추임새를 뺀 정도는 괜찮지만, 두 글자 묶음 대부분이 사용자 말에 있어야 한다 (지어낸 표현은 버림)
      const said = list(b.expressions, 20, 120).join(' / ').replace(/\s+/g, '');
      const bg = new Set(); for (let i = 0; i < said.length - 1; i++) bg.add(said.slice(i, i + 2));
      const fromUser = (x, need) => { const n = x.replace(/[\s,.·'"‘’“”]/g, ''); if (n.length < 2) return false; let hit = 0; for (let i = 0; i < n.length - 1; i++) if (bg.has(n.slice(i, i + 2))) hit++; return hit / Math.max(1, n.length - 1) >= need; };
      outp.own = list(j.own, 3, 40).map(x => x.replace(/^[‘'"“]+|[’'"”.!?]+$/g, '').trim()).filter(x => x.length >= 3 && fromUser(x, 0.8));
      const mine = str(j.mine, 160).replace(/^[‘'"“]+|[’'"”]+$/g, '');
      if (mine && fromUser(mine, 0.6)) outp.mine = mine;
      if (!outp.ai) return null;
      if (!outp.diff.length) delete outp.diff;
      return outp;
    },
  },

  recommend: {
    maxTokens: 600,
    system: en => VOICE(en) + (en
      ? ' Recommend real, widely available teas the user has not recorded yet, based on the flavors they liked.'
      : ' 사용자가 좋아한 풍미를 바탕으로, 아직 기록하지 않은 실제로 구하기 쉬운 차를 추천해.'),
    prompt: (b, en) => [
      (en ? 'Liked flavors: ' : '좋아한 풍미: ') + (list(b.flavors, 11, 20).join(', ') || '-'),
      (en ? 'Already recorded: ' : '이미 기록한 차: ') + (list(b.recorded, 40, 40).join(', ') || '-'),
      en ? `Return 3 teas. name: common tea name in English. type: one of ${TEA_TYPES.join(', ')}. flavors: 1–3 from ${FLAVOR_EN.join(', ')}. why: one short sentence (under 40 chars).`
         : `차 3개를 골라. name: 한국어로 흔히 부르는 차 이름. type: ${TEA_TYPES.join(', ')} 중 하나. flavors: ${FLAVOR_EN.join(', ')} 중 1~3개 (영어 그대로). why: 짧은 한 문장 (25자 이내).`,
    ].join('\n'),
    schema: {
      type: 'OBJECT',
      properties: {
        teas: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' }, type: { type: 'STRING' }, flavors: { type: 'ARRAY', items: { type: 'STRING' } }, why: { type: 'STRING' } },
            required: ['name', 'type', 'flavors', 'why'],
          },
        },
      },
      required: ['teas'],
    },
    clean: (j, b) => {
      const had = new Set(list(b.recorded, 40, 40).map(s => s.replace(/\s/g, '')));
      const teas = (Array.isArray(j && j.teas) ? j.teas : []).map(t => ({
        name: str(t && t.name, 30),
        type: TEA_TYPES.includes(t && t.type) ? t.type : 'green',
        flavors: list(t && t.flavors, 3, 20).filter(f => FLAVOR_EN.includes(f)),
        why: str(t && t.why, 60),
      })).filter(t => t.name && t.flavors.length && !had.has(t.name.replace(/\s/g, ''))).slice(0, 3);
      return teas.length ? { teas } : null;
    },
  },
};


/* ===================== 실시간 음성 (Gemini Live) =====================
   휴대폰 ↔ 이 Worker ↔ Gemini Live 를 웹소켓으로 잇는다. 키는 여기에만 있고,
   모델·말투·도구(기록 채우기) 설정도 여기서 정해 보낸다 (휴대폰이 보낸 setup은 무시).
   주소: /live?lang=ko&voice=Zephyr[&resume=핸들] */
// 모델마다 목소리 결이 달라 한 모델만 쓴다 (안 되면 앱이 기본 음성 대화로). 바꾸려면 GEMINI_LIVE_MODEL 변수
const LIVE_MODELS = ['gemini-3.1-flash-live-preview'];
const LIVE_VOICES = ['Sulafat', 'Umbriel', 'Vindemiatrix', 'Achernar', 'Zephyr', 'Aoede', 'Kore', 'Charon'];   // 기본: 여성 Sulafat(차분·따뜻), 남성 Umbriel(느긋)
const LIVE_STEPS = ['stay', 'confirm_tea', 'start_brew', 'drink_now', 'brew_done', 'finished_drinking', 'close'];
const LIVE_TOOL = {   // 글 대화의 JSON과 같은 모양: record 칸들 + unknown + step
  functionDeclarations: [{
    name: 'update_record',
    description: 'Send your decision to the app: the record fields the user just gave (changed fields only, merged full value when adding to a field), fields they said they don\'t know (unknown), and the one next action (step). Call it before speaking whenever something is recorded or step is not stay. The response tells you the current stage, what is recorded and what is still empty.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'tea name only, no brand' }, brand: { type: 'STRING', description: 'brand; "없음"/"none" if unknown' },
        type: { type: 'STRING', enum: TEA_TYPES },
        about: { type: 'STRING' }, color: { type: 'STRING' }, tone: { type: 'STRING', description: 'plain color word with lightness, when color is given' },
        aroma: { type: 'STRING' }, taste: { type: 'STRING' }, after: { type: 'STRING' }, extra: { type: 'STRING' },
        mood: { type: 'STRING' }, scene: { type: 'STRING' }, why: { type: 'STRING' }, origin: { type: 'STRING' }, temp: { type: 'STRING' }, time: { type: 'STRING' }, memo: { type: 'STRING' },
        unknown: { type: 'ARRAY', items: { type: 'STRING' } },
        clear: { type: 'ARRAY', items: { type: 'STRING' }, description: 'record fields to erase so the user can say them again' },
        flavors: { type: 'ARRAY', items: { type: 'STRING', enum: ['floral', 'fruity', 'citrus', 'vegetal', 'fresh', 'nutty', 'sweet', 'earthy', 'spicy', 'soft', 'astringent'] }, description: 'only senses the user actually described (smell, taste, mouthfeel); empty for memories, mood, time or place; never add associations — empty is better than a wrong color' },
        requests: { type: 'ARRAY', items: { type: 'STRING', enum: ['show_color', 'show_guide', 'gongfu_guide', 'basic_guide', 'pause_timer', 'resume_timer'] }, description: 'things the app should do now' },
        timer_set: { type: 'NUMBER', description: 'make the remaining brew time exactly this many seconds from now ("just one more minute" → 60)' },
        timer_add: { type: 'NUMBER', description: 'add (or with a negative number cut) this many seconds to the remaining brew time ("add a minute" → 60)' },
        step: { type: 'STRING', enum: LIVE_STEPS },
      },
    },
  }],
};
function liveSystem(en) {
  return en
    ? FRAME_EN + APP_GUIDE_EN + `

[Real-time voice]
Voice: calm, soft and relaxed, a little slow, low and steady. No excited exclamations, high energy or exaggerated intonation; like a quiet conversation over a cup of tea.
You talk by voice in real time: 1–2 short sentences per turn. In the examples above, "reply" is what you say aloud; record, flavors, clear, unknown, requests and step are what you send with the update_record tool.
Whenever something is recorded, there are flavors, requests or clear, or step is not stay, call update_record FIRST, then speak. When they name a tea, always send type (your best guess) and about together with name and brand, then ask whether to record it as that type. Its response gives the current stage, what's recorded, what's empty and the remaining brew time; continue from that. If you need the remaining time or the record state, or they ask ("how long is left?"), don't guess: call update_record with just step stay to check, then answer. Past records were given at the start as "[앱 정보]". Messages starting with [app] are app events (e.g. the tea finished steeping); pass them on in your own words.
The user may speak casually or unclearly; work out what they mean from context.`
    : FRAME_KO + APP_GUIDE_KO + `

[실시간 음성]
목소리: 차분하고 부드럽고 편안하게, 조금 천천히, 낮고 안정된 톤으로 말해. 들뜬 감탄이나 높은 텐션, 과장된 억양은 쓰지 마. 차 한 잔을 앞에 둔 조용한 대화처럼.
실시간 음성으로 대화해. 한 번에 1~2문장으로 짧게. 위 예시의 reply는 네가 소리 내 할 말이고, record·flavors·clear·unknown·requests·step은 update_record 도구로 보내는 값이야.
기록할 것이나 flavors가 있거나 requests·clear가 있거나 step이 stay가 아니면 말하기 전에 먼저 update_record를 불러. 차 이름을 들으면 name·brand와 함께 type(가장 그럴듯한 종류)과 about(한 문장)도 꼭 같이 보내고, 그 종류로 기록할지 물어. 그 응답에 지금 단계, 기록된 것, 아직 빈 칸, 남은 우림 시간이 오니 거기서 이어가. 남은 시간·지금 기록 상태가 궁금하거나 사용자가 물으면(예: '몇 분 남았어?') 추측하지 말고 update_record를 step stay만 넣어 불러 확인한 뒤 답해. 지난 기록은 대화 처음에 '[앱 정보]'로 알려줬어. '[앱]'으로 시작하는 말은 앱이 알려주는 일(예: 차가 다 우러남)이야. 네 말로 자연스럽게 전해.
사용자가 대충 말하거나 발음이 불분명해도 맥락으로 뜻을 알아들어.`;
}
async function liveProxy(req, env, okOrigin) {
  if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('websocket only', { status: 426 });
  if (!okOrigin) return new Response('origin', { status: 403 });
  if (!env.GEMINI_API_KEY) return new Response('no key', { status: 500 });
  const u = new URL(req.url), en = u.searchParams.get('lang') === 'en';
  const voice = LIVE_VOICES.includes(u.searchParams.get('voice')) ? u.searchParams.get('voice') : 'Sulafat';
  const resume = (u.searchParams.get('resume') || '').slice(0, 600);
  const pair = new WebSocketPair(), [client, server] = Object.values(pair);
  server.accept();
  const pending = []; let up = null, ready = false, closed = false;
  server.addEventListener('message', e => {   // 휴대폰 → Gemini: 소리·글·도구 응답만 (setup은 막는다). 준비 전이면 모아 둔다
    try { const j = JSON.parse(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data)); if (!j || j.setup || !(j.realtimeInput || j.clientContent || j.toolResponse)) return;
      const t = JSON.stringify(j); if (ready && up) up.send(t); else if (pending.length < 200) pending.push(t); } catch (err) { /* 무시 */ }
  });
  server.addEventListener('close', () => { closed = true; try { up && up.close(1000, 'client closed'); } catch (e) {} });
  const setupFor = model => JSON.stringify({ setup: {
    model: `models/${model}`,
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    systemInstruction: { parts: [{ text: liveSystem(en) }] },
    tools: [LIVE_TOOL],
    inputAudioTranscription: {}, outputAudioTranscription: {},
    // 말 시작 감지를 덜 예민하게: 스피커 소리·주변 소음을 내 말로 착각해 AI가 스스로 말을 끊지 않게
    realtimeInputConfig: { automaticActivityDetection: { startOfSpeechSensitivity: 'START_SENSITIVITY_LOW', prefixPaddingMs: 200 } },
    contextWindowCompression: { slidingWindow: {} },
    sessionResumption: resume ? { handle: resume } : {},
  } });
  // 모델을 차례로: 연결 → setup → setupComplete가 오면 그 모델로. 그 전에 끊기면 다음 모델
  const open = model => new Promise(async res => {
    let ws; try { const r = await fetch(`https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${env.GEMINI_API_KEY}`, { headers: { Upgrade: 'websocket' } }); ws = r.webSocket; } catch (e) { return res(null); }
    if (!ws) return res(null);
    ws.accept(); let ok = false, why = '';
    const t = setTimeout(() => { if (!ok) { try { ws.close(1000, 'slow'); } catch (e) {} res(null); } }, 8000);
    ws.addEventListener('message', e => { if (ok) return; const txt = typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data);
      if (/"setupComplete"/.test(txt)) { ok = true; clearTimeout(t); res({ ws, model }); } });
    ws.addEventListener('close', e => { if (!ok) { clearTimeout(t); why = `${e.code} ${e.reason || ''}`; res({ fail: `${model} ${why}`.slice(0, 160) }); } });
    ws.send(setupFor(model));
  });
  let lastWhy = '';
  for (const m of [...(env.GEMINI_LIVE_MODEL ? [env.GEMINI_LIVE_MODEL] : []), ...LIVE_MODELS]) {
    if (closed) break;
    const r = await open(m); if (r && r.ws) { up = r.ws; server.send(JSON.stringify({ appInfo: { model: r.model, voice } })); break; } if (r && r.fail) lastWhy = r.fail;
  }
  if (!up) { try { server.send(JSON.stringify({ appError: 'upstream', detail: lastWhy })); server.close(1011, 'upstream'); } catch (e) {} return new Response(null, { status: 101, webSocket: client }); }
  ready = true; server.send(JSON.stringify({ setupComplete: {} }));
  while (pending.length) up.send(pending.shift());
  up.addEventListener('message', e => { try { server.send(typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data)); } catch (err) { /* 닫힘 */ } });
  const closeBoth = (code, why) => { try { server.close(code || 1000, String(why || '').slice(0, 120)); } catch (e) {} try { up.close(1000, 'bye'); } catch (e) {} };
  up.addEventListener('close', e => closeBoth(e.code === 1005 || e.code === 1006 ? 1000 : e.code, e.reason));
  up.addEventListener('error', () => closeBoth(1011, 'upstream error'));
  return new Response(null, { status: 101, webSocket: client });
}
