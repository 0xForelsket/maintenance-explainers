#!/bin/bash
# serial render queue: waits for a PID, then renders + encodes each topic in order
cd "$(dirname "$0")/.."
WAIT=$1; shift
while kill -0 $WAIT 2>/dev/null; do sleep 20; done
encode() { # topic
  ffmpeg -y -loglevel error -framerate 24 -i frames/$1/f_%05d.jpg -i topics/$1/mix.wav -c:v libx264 -preset veryfast -crf 20 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest out/$1.mp4 && echo "ENCODED $1" >> queue.log
}
mkdir -p out
[ -f out/cooling-tower.mp4 ] || encode cooling-tower &
for spec in "$@"; do
  topic=${spec%%:*}; dur=${spec##*:}
  echo "START $topic $(date +%T)" >> queue.log
  node build/render.mjs --topic $topic --fps 24 --from 0 --to $dur --out frames/$topic --rscale 0.75 --skipExisting > render-$topic.log 2>&1
  echo "RENDERED $topic $(date +%T)" >> queue.log
  encode $topic &
done
wait
echo "QUEUE DONE $(date +%T)" >> queue.log
