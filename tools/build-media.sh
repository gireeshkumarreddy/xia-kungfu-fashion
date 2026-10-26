#!/usr/bin/env bash
# Builds every web video, poster and still for the site from the four source clips.
# Usage: bash tools/build-media.sh [source-dir]   (default: ~/Downloads)
set -euo pipefail
SRC="${1:-$HOME/Downloads}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="$ROOT/assets/video"; I="$ROOT/assets/img"
mkdir -p "$V" "$I"

KUNGFU="$SRC/Woman_performing_kung_fu_animation_1080p_20261025231759.mp4"
WALK="$SRC/Models_walking_toward_camera_1080p_20261025232314.mp4"
GILD="$SRC/Models_raising_heads_and_looking_1080p_20261025232457.mp4"
DRAGON="$SRC/Samurai_confronting_smoke_dragon_1080p_20261025233138.mp4"

X264=(-an -c:v libx264 -preset slow -pix_fmt yuv420p -profile:v high -movflags +faststart -r 24)
# Hero footage: push the grey studio backdrop to pure white so it multiplies cleanly into the page.
WHITE="colorlevels=rimin=0.02:gimin=0.02:bimin=0.02:rimax=0.86:gimax=0.86:bimax=0.86"
GRADE_WALK="eq=contrast=1.08:brightness=-0.02"
GRADE_GILD="eq=contrast=1.05:saturation=1.08"
GRADE_DRAGON="eq=contrast=1.04:saturation=1.12"

ff(){ ffmpeg -nostdin -v error -y "$@"; }
# ONLY=<section> rebuilds a single section: hero walk campaign dragon details
# Product and editorial photographs are built separately by tools/build-photos.py.
want(){ [ -z "${ONLY:-}" ] || [ "$ONLY" = "$1" ]; }

# Seamless loop: the last F seconds dissolve into the first F seconds. Output is (10-F)s long.
xloop(){ # in out F prefilter crf
  local in="$1" out="$2" F="$3" pre="$4" crf="$5"
  local off; off=$(python -c "print(10-2*$F)")
  ff -i "$in" -filter_complex "[0:v]$pre,fps=24,split[a][b];[a]trim=start=$F,setpts=PTS-STARTPTS[m];[b]trim=end=$F,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=$F:offset=$off,format=yuv420p[v]" \
     -map "[v]" -crf "$crf" "${X264[@]}" "$out"
}
poster(){ ff -i "$1" -frames:v 1 -c:v libwebp -quality 78 "$2"; }

want hero && {
echo "hero (kung fu, full intro, dissolves back to frame one)"
for variant in desktop mobile; do
  if [ $variant = desktop ]; then crop="scale=1920:1080"; else crop="crop=900:1080:450:0"; fi
  ff -i "$KUNGFU" -filter_complex "[0:v]$WHITE,$crop,fps=24,settb=AVTB,split[a][b];[b]trim=end_frame=1,loop=loop=35:size=1:start=0,setpts=N/24/TB,settb=AVTB[s];[a]setpts=PTS-STARTPTS[m];[m][s]xfade=transition=fade:duration=1.5:offset=8.5,format=yuv420p[v]" \
     -map "[v]" -crf 23 "${X264[@]}" "$V/hero-$variant.mp4"
  poster "$V/hero-$variant.mp4" "$I/hero-$variant.webp"
  # Still shown when autoplay is blocked, the film fails, or motion is paused (frame one is mostly blank paper).
  ff -ss 8.5 -i "$KUNGFU" -frames:v 1 -vf "$WHITE,$crop" -c:v libwebp -quality 80 "$I/hero-still-$variant.webp"
done

}
want walk && {
echo "walk"
xloop "$WALK" "$V/walk-desktop.mp4" 1.5 "$GRADE_WALK,scale=1920:1080" 25
xloop "$WALK" "$V/walk-mobile.mp4" 1.5 "$GRADE_WALK,crop=608:1080:656:0" 25
poster "$V/walk-desktop.mp4" "$I/walk-desktop.webp"; poster "$V/walk-mobile.mp4" "$I/walk-mobile.webp"

}
want campaign && {
echo "campaign (ping-pong: heads rise, then lower)"
for variant in desktop mobile; do
  if [ $variant = desktop ]; then s="1600:900"; else s="960:540"; fi
  ff -i "$GILD" -filter_complex "[0:v]$GRADE_GILD,scale=$s,fps=24,split[a][b];[b]reverse,trim=start_frame=1[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]" \
     -map "[v]" -crf 25 "${X264[@]}" "$V/campaign-$variant.mp4"
done
poster "$V/campaign-desktop.mp4" "$I/campaign-desktop.webp"

}
want dragon && {
echo "dragon"
xloop "$DRAGON" "$V/dragon-desktop.mp4" 2 "$GRADE_DRAGON,scale=1920:1080" 24
xloop "$DRAGON" "$V/dragon-mobile.mp4" 2 "$GRADE_DRAGON,crop=720:1080:600:0" 24
poster "$V/dragon-desktop.mp4" "$I/dragon-desktop.webp"; poster "$V/dragon-mobile.mp4" "$I/dragon-mobile.webp"

}
want details && {
echo "detail crops (real crops of the source footage, 4:5)"
xloop "$GILD"   "$V/detail-collar.mp4" 1.2 "$GRADE_GILD,crop=480:600:720:480,scale=640:800:flags=lanczos" 24
xloop "$GILD"   "$V/detail-thread.mp4" 1.2 "$GRADE_GILD,crop=372:465:1440:615,scale=560:700:flags=lanczos" 24
xloop "$WALK"   "$V/detail-sheer.mp4"  1.2 "$GRADE_WALK,crop=456:570:1140:345,scale=640:800:flags=lanczos" 25
# Stance skips the ink intro (0-2.5s): 7.5s of movement, last second dissolves into the first.
ff -i "$KUNGFU" -filter_complex "[0:v]$WHITE,crop=600:750:640:330,scale=640:800:flags=lanczos,fps=24,trim=start=2.5,setpts=PTS-STARTPTS,split[a][b];[a]trim=start=1,setpts=PTS-STARTPTS[m];[b]trim=end=1,setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=1:offset=5.5,format=yuv420p[v]"    -map "[v]" -crf 24 "${X264[@]}" "$V/detail-stance.mp4"
for d in collar thread sheer stance; do poster "$V/detail-$d.mp4" "$I/detail-$d.webp"; done

}
echo done
