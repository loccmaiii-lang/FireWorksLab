#!/bin/bash
# 用法：mkgif.sh 输入.mp4 输出.gif crop(w:h:x:y) 宽 fps [起点 时长]
in=$1; out=$2; crop=$3; w=$4; fps=$5; ss=${6:-0}; t=${7:-99}
f="crop=$crop,fps=$fps,scale=$w:-2:flags=lanczos"
ffmpeg -v error -ss $ss -t $t -i "$in" -vf "$f,palettegen=max_colors=${COLORS:-128}:stats_mode=full" -y /tmp/_pal.png
ffmpeg -v error -ss $ss -t $t -i "$in" -i /tmp/_pal.png -lavfi "$f[x];[x][1:v]paletteuse=dither=${DITHER:-bayer:bayer_scale=4}" -loop 0 -y "$out"
echo "$out $(du -k "$out" | cut -f1)KB"
