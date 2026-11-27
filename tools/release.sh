#!/usr/bin/env bash
# TEA CANVAS 릴리스: 테스트 → 캐시 버전 올리기 → 제출 파일(B.html/B.zip) → 커밋 → 푸시
# 사용법:
#   tools/release.sh "커밋 메시지"          빠른 점검(문법) 후 릴리스
#   tools/release.sh --full "커밋 메시지"   기능 테스트 전체 후 릴리스
#   tools/release.sh --no-push "메시지"     커밋까지만
set -euo pipefail
cd "$(dirname "$0")/.."

FULL=0; PUSH=1
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --full) FULL=1 ;;
    --no-push) PUSH=0 ;;
    *) echo "모르는 옵션: $1"; exit 1 ;;
  esac; shift
done
MSG="${1:-}"
[[ -z "$MSG" ]] && { echo '커밋 메시지를 넣어 주세요: tools/release.sh "메시지"'; exit 1; }

if [[ -z "$(git status --porcelain)" ]]; then echo "바뀐 내용이 없어요."; exit 0; fi

echo "▶ 테스트"
node tests/syntax.js | tail -1
if [[ $FULL == 1 ]]; then
  for t in ai-worker.mjs flow-fixes.js ai-chat.js ai-fallback.js auto-chat.js e2e-v5.js fixes-v5.js question.js voice-v5.js live-voice.js; do
    printf '  %s: ' "$t"; node "tests/$t" | tail -1
  done
fi

echo "▶ 캐시 버전"
CUR=$(grep -oE "teacanvas-v6-[0-9]+" sw.js | head -1)
N=${CUR##*-}; NEXT="teacanvas-v6-$((N+1))"
sed -i "s/$CUR/$NEXT/" sw.js
echo "  $CUR → $NEXT"

echo "▶ 제출 파일"
python3 tools/build-submission.py | tail -1
(cd submission && rm -f B.zip && zip -qr B.zip B.html)

echo "▶ 커밋"
git add -A
# RELEASE_TRAILER가 있으면 커밋 끝에 붙임(예: Claude가 실행할 때 작성자 표시)
if [[ -n "${RELEASE_TRAILER:-}" ]]; then git commit -q -m "$MSG" -m "$RELEASE_TRAILER"; else git commit -q -m "$MSG"; fi
git log --oneline -1

if [[ $PUSH == 1 ]]; then
  BR=$(git rev-parse --abbrev-ref HEAD)
  echo "▶ 푸시 ($BR)"
  for i in 1 2 3 4; do git push -q -u origin "$BR" && break || { echo "  재시도 $i"; sleep $((2**i)); }; done
fi
echo "✓ 완료"
