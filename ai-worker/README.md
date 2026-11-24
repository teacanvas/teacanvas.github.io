# TEA CANVAS AI 중간 서버 (Cloudflare Worker + Gemini 무료 플랜)

앱이 보내는 질문은 이 Worker로 가요. Worker가 그 질문을 Gemini에 보내고, 받은 답을 앱에 돌려줘요.
API 키는 Worker의 비밀값에만 들어가고, 앱 코드(GitHub Pages)에는 들어가지 않아요.

AI가 쓰이는 곳은 세 군데예요.

| 모드 | 화면 | 앱이 받는 것 |
|---|---|---|
| question | 마시다가 질문하면 답하기 | `{text}` |
| compare | 비교 화면(전문가 설명·공통점·차이점·AI 해석) | `{expert?, common[], diff[], ai}` |
| recommend | My의 "이런 차도 좋아할 것 같아요" | `{teas[]}` |

응답이 없거나 실패하면, 앱은 미리 정해둔 대답으로 자동 전환돼요. 9초 넘게 응답이 없을 때도 마찬가지예요(비교·추천은 15초).

## 1. Gemini API 키 만들기 (무료)
1. https://aistudio.google.com 에 Google 계정으로 들어가요.
2. **Get API key → Create API key**를 눌러 키를 만들어요. 결제 정보는 넣지 않아도 돼요.
3. 키는 3단계에서 바로 붙여 넣을 거예요. 채팅이나 코드에는 붙이지 마세요.

## 2. Worker 만들기 (무료)
1. https://dash.cloudflare.com 에 가입하고 로그인해요.
2. **Compute (Workers) → Workers & Pages → Create → Start with Hello World**를 선택해요.
3. 이름은 `teacanvas-ai`로 하고 **Deploy**를 눌러요.
4. **Edit code**를 눌러 기본 코드를 모두 지워요. 그 자리에 이 폴더의 `worker.js` 내용을 붙여 넣고 **Deploy**를 눌러요.

## 3. 키 넣기
1. 만든 Worker에서 **Settings → Variables and Secrets → Add**를 눌러요.
2. Type은 **Secret**, Name은 `GEMINI_API_KEY`, Value에는 1단계에서 만든 키를 넣고 **Deploy**를 눌러요.
3. (선택) 먼저 쓸 모델을 정하고 싶으면 `GEMINI_MODEL` 변수(Text)를 추가해요. 쉼표로 여러 개를 적을 수 있어요. 없으면 `gemini-flash-lite-latest` → `gemini-flash-latest` → … 순서로 쓰고, 붐비는(503) 모델은 건너뛰어요. Worker 주소 뒤에 `?models`를 붙여 열면 이 키로 쓸 수 있는 Flash 모델 이름이 보여요.

## 4. 확인하고 앱에 연결
1. Worker 주소(`https://teacanvas-ai.<내 서브도메인>.workers.dev`)를 브라우저로 열어요. `{"ok":true,...}`가 보이면 정상이에요.
2. 그 주소를 앱의 `AI_ENDPOINT`(TEA_CANVAS_prototype_v6.html)에 넣어요. 주소는 비밀이 아니니 앱 코드에 넣어도 괜찮아요.

## 안전장치
- **허용된 곳에서만 요청을 받아요.**
  - 기본으로 허용되는 곳: teacanvas.github.io, 내려받은 HTML 파일(file://), localhost
  - 다른 사이트에서 쓰려면 `ALLOWED_ORIGINS` 변수에 쉼표로 구분해 추가해요.
- **요청이 너무 크거나 모르는 모드면 거절해요.**
- **AI 답을 그대로 쓰지 않고 한 번 걸러요.**
  - 공통점은 앱의 11가지 풍미 이름 중에서만 남겨요.
  - 추천은 이미 기록한 차를 빼요.
  - 글 길이를 제한해요.
- **무료 한도를 넘으면 앱에 정해둔 대답이 나와요.** 무료 한도는 AI Studio의 Rate limits 화면에서 확인할 수 있어요.
- **입력 내용이 Google 서비스 개선에 쓰일 수 있어요.** Gemini 무료 플랜의 조건이에요. 개인 정보는 보내지 않도록 앱 쪽에서 차 이름·표현·대화만 보내요.

## 테스트
```bash
node tests/ai-worker.mjs
```
```bash
node tests/ai-fallback.js
```
첫 번째는 Gemini를 가짜 응답으로 바꿔서 Worker를 확인해요. 두 번째는 앱이 AI 응답을 쓰는지, 실패하면 정해진 대답으로 넘어가는지 확인해요.

## 시험용 서버 (선택)
정답지 시험(`node tools/eval-flow.mjs`)을 앱과 다른 무료 한도로 돌리기 위한 두 번째 서버예요. 코드는 같고 Gemini 키만 달라요.
1. https://aistudio.google.com 에서 **Get API key → Create API key → Create API key in new project**를 눌러요. 무료 한도는 프로젝트마다 따로라서, 같은 구글 계정이어도 새 프로젝트로 만들면 한도가 따로예요.
2. GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 Name `GEMINI_TEST_KEY`, Secret에 1번의 키를 넣어요.
3. 다음에 `ai-worker/`가 바뀌어 푸시되거나, **Actions → Deploy AI worker → Run workflow**를 누르면 `teacanvas-ai-test` 서버가 만들어지고 키가 들어가요.

시험은 기본으로 이 서버로 보내요. 앱용 서버로 돌리려면 `TC_EP=https://teacanvas-ai.sehoon3554.workers.dev/ node tools/eval-flow.mjs`처럼 주소를 바꿔요.
