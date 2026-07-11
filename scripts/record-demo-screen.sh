#!/usr/bin/env bash
set -euo pipefail

OUTPUT_VIDEO="/opt/cursor/artifacts/sverige-3d-karta-demo.mp4"
DISPLAY="${DISPLAY:-:1}"
RECORD_PID=""

cleanup() {
  if [[ -n "${RECORD_PID}" ]] && kill -0 "${RECORD_PID}" 2>/dev/null; then
    kill -INT "${RECORD_PID}" || true
    wait "${RECORD_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

mkdir -p "$(dirname "${OUTPUT_VIDEO}")"

ffmpeg -y \
  -f x11grab \
  -video_size 1920x1080 \
  -framerate 30 \
  -i "${DISPLAY}" \
  -c:v libx264 \
  -preset ultrafast \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "${OUTPUT_VIDEO}" &
RECORD_PID=$!

sleep 2
SKIP_COMPILE=1 node /workspace/scripts/record-demo.mjs
sleep 2

kill -INT "${RECORD_PID}"
wait "${RECORD_PID}" 2>/dev/null || true
RECORD_PID=""

echo "Demo-video sparad: ${OUTPUT_VIDEO}"
