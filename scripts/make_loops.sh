#!/bin/bash
# Turn raw phone/camera takes into seamless avatar loops for agent-ui.
#
#   make_loops.sh <raw-folder> <out-folder>
#
# Every .mov/.mp4 becomes <name>.mp4 and the first .jpg becomes poster.jpg. Output matches the chat page's
# wide avatar panel (2.4:1), so nothing gets cropped: the whole frame is shown, with a blurred copy of the
# video filling the sides. Settings (environment variables):
#   ZOOM=0.85  shrink the picture further (1 = fill the panel height; smaller = more zoomed out)
#   TRIM=1.5   seconds cut from each end (remote-button press, beeps)
#   W=1440 H=600 output size; FADE=0.6 loop crossfade seconds; FPS=25
set -euo pipefail
IN=${1:-$HOME/avatar-raw}; OUT=${2:-$HOME/apps/agent-ui/public/avatar}
W=${W:-1440}; H=${H:-600}; ZOOM=${ZOOM:-1}; TRIM=${TRIM:-1.5}; FADE=${FADE:-0.6}; FPS=${FPS:-25}
FW=$(printf '%.0f' "$(echo "$W*$ZOOM/2" | bc -l)"); FW=$((FW*2))
FH=$(printf '%.0f' "$(echo "$H*$ZOOM/2" | bc -l)"); FH=$((FH*2))
# background: cover + blur + darken; foreground: whole frame fitted inside FWxFH, centred
FRAME="split[bg][fg];\
[bg]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,boxblur=30:3,eq=brightness=-0.08[bgb];\
[fg]scale=$FW:$FH:force_original_aspect_ratio=decrease[fgs];\
[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p"
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
