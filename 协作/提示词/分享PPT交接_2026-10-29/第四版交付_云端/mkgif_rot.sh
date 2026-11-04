#!/bin/bash
# 用法：mkgif_rot.sh 输入.mp4 输出.gif crop 宽 fps 起点秒 [颜色数 抖动]
in=$1; out=$2; crop=$3; w=$4; fps=$5; r=$6; c=${7:-128}; dz=${8:-bayer:bayer_scale=4}
g="[0:v]split[a][b];[a]trim=start=$r,setpts=PTS-STARTPTS[a1];[b]trim=end=$r,setpts=PTS-STARTPTS[b1];[a1][b1]concat=n=2:v=1,crop=$crop,fps=$fps,scale=$w:-2:flags=lanczos"
ffmpeg -v error -i "$in" -filter_complex "$g,palettegen=max_colors=$c:stats_mode=full" -y /tmp/_pal.png
ffmpeg -v error -i "$in" -i /tmp/_pal.png -filter_complex "$g[x];[x][1:v]paletteuse=dither=$dz" -loop 0 -y "$out"
echo "$out $(du -k "$out" | cut -f1)KB"
