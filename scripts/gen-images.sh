#!/bin/bash
# Sequential, robust image generation. Writes progress to /tmp/gen-progress.log.
cd /home/z/my-project || exit 1

LOG=/tmp/gen-progress.log
: > "$LOG"

gen() {
  local out="$1"; local prompt="$2"
  if [ -f "$out" ] && [ -s "$out" ]; then
    echo "SKIP $out" >> "$LOG"
    return 0
  fi
  echo "START $out" >> "$LOG"
  if z-ai image -p "$prompt" -o "$out" -s 1024x1024 >> "$LOG" 2>&1; then
    echo "DONE $out" >> "$LOG"
  else
    echo "FAIL $out" >> "$LOG"
  fi
}

# ---- PUZZLE (10) ----
gen "public/puzzles/1.png" "A beautiful underwater ocean scene with colorful tropical fish, coral reef, sea turtle and bubbles, cute cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/2.png" "A happy farm scene with a red barn, cute cow, pig, chicken and duck, green hills and blue sky, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/3.png" "Friendly cartoon dinosaurs in a lush green jungle, brontosaurus, triceratops and a small t-rex, volcano in background, cute illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/4.png" "African safari scene with a cute lion, elephant, giraffe and zebra on savanna at sunset, acacia tree, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/5.png" "Magical outer space scene with colorful planets, stars, a smiling moon and a little rocket, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/6.png" "A fairytale castle on a hill with rainbow, clouds and flowers, cute cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/7.png" "Enchanted forest with cute woodland animals, deer, rabbit, fox and owl among tall trees and mushrooms, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/8.png" "A sunny beach scene with a sandcastle, bucket and spade, seashells, starfish and a crab, ocean waves, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/9.png" "A cheerful circus scene with a big top tent, clown, juggler, balloons and a cute elephant, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
gen "public/puzzles/10.png" "A lovely garden with colorful flowers, butterflies, bees and a tiny ladybug, cartoon illustration for children, bright vivid colors, clean flat style, high quality, centered composition"
echo "PUZZLES DONE" >> "$LOG"

# ---- DRAWING (20) ----
gen "public/drawing/1.png" "A cute cartoon rocket ship flying, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/2.png" "A smiling cartoon sun with rays, simple flat illustration for a children coloring book, thick clean black outlines, bright yellow, plain solid white background, centered, high quality"
gen "public/drawing/3.png" "A cute little house with a red roof, door and windows, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/4.png" "A round green tree with a brown trunk, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/5.png" "A cute orange cartoon fish with fins and tail, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/6.png" "A five-pointed yellow star with a smiling face, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/7.png" "A cute flower with pink petals, yellow center and green stem, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/8.png" "A cute red cartoon car with wheels and windows, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/9.png" "A cute sailboat on water with a flag, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/10.png" "A cute red balloon with a string, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/11.png" "A red apple with a green leaf and brown stem, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/12.png" "A colorful rainbow with clouds, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/13.png" "A cute white fluffy cloud with a happy face, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/14.png" "A tall mountain with a snowy peak and a small sun, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/15.png" "A cute ice cream cone with three scoops, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/16.png" "A cute colorful butterfly with patterns on wings, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/17.png" "A cute little yellow bird standing, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/18.png" "A cute red mushroom with white spots, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/19.png" "A cute open umbrella, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
gen "public/drawing/20.png" "A cute orange cartoon cat sitting, simple flat illustration for a children coloring book, thick clean black outlines, bright colors, plain solid white background, centered, high quality"
echo "ALL DONE" >> "$LOG"
