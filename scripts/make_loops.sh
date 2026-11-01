#!/bin/bash
# Turn raw phone/camera takes into seamless avatar loops for agent-ui.
#
#   make_loops.sh <raw-folder> <out-folder>
#
# Every .mov/.mp4 becomes <name>.mp4 and the first .jpg becomes poster.jpg: square, cropped around the face,
# for the round avatar on the chat page. Works with portrait or landscape takes. Settings (environment variables):
#   FACE_Y=0.6  where the middle of the circle sits, as a fraction of the frame height (lower = higher up)
#   CROP=1      size of the square as a fraction of the frame's short side (1 = most zoomed out, 0.7 = closer)
#   TRIM=1.5    seconds cut from each end (remote-button press, beeps)
#   SIZE=720 output size; FADE=0.6 loop crossfade seconds; FPS=25
set -euo pipefail
IN=${1:-$HOME/avatar-raw}; OUT=${2:-$HOME/apps/agent-ui/public/avatar}
SIZE=${SIZE:-720}; FACE_Y=${FACE_Y:-0.6}; CROP=${CROP:-1}; TRIM=${TRIM:-1.5}; FADE=${FADE:-0.6}; FPS=${FPS:-25}
SIDE="min(iw\,ih)*$CROP"
FRAME="crop=w='$SIDE':h='$SIDE':x='(iw-$SIDE)/2':y='max(0\,min(ih-$SIDE\,ih*$FACE_Y-$SIDE/2))',\
scale=$SIZE:$SIZE,setsar=1,format=yuv420p"
mkdir -p "$OUT"
shopt -s nullglob nocaseglob
for f in "$IN"/*.mov "$IN"/*.mp4; do
  name=$(basename "${f%.*}")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  d=$(echo "$dur - 2*$TRIM" | bc -l)
  off=$(echo "$d - 2*$FADE" | bc -l)
  ffmpeg -y -loglevel error -i "$f" -filter_complex \
"[0:v]trim=start=$TRIM:duration=$d,setpts=PTS-STARTPTS,fps=$FPS,$FRAME,split[a][b];\
[a]trim=start=$FADE,setpts=PTS-STARTPTS[main];[b]trim=end=$FADE,setpts=PTS-STARTPTS[head];\
[main][head]xfade=transition=fade:duration=$FADE:offset=$off[out]" \
    -map "[out]" -an -c:v libx264 -crf 21 -preset medium -g $FPS -pix_fmt yuv420p -movflags +faststart \
    "$OUT/$name.mp4"
  echo "✓ $name.mp4"
done
for p in "$IN"/*.jpg; do
  ffmpeg -y -loglevel error -i "$p" -filter_complex "[0:v]$FRAME" -frames:v 1 -q:v 3 "$OUT/poster.jpg"
  echo "✓ poster.jpg"; break
done
ls -lh "$OUT"
