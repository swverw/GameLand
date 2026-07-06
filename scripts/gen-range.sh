#!/bin/bash
# Usage: bash gen-range.sh <kind> <start> <end>
cd /home/z/my-project || exit 1
KIND="$1"; START="$2"; END="$3"
DIR="public/$KIND"; mkdir -p "$DIR"
PROMPTS_FILE="scripts/prompts-$KIND.txt"
mapfile -t PROMPTS < "$PROMPTS_FILE"
for n in $(seq "$START" "$END"); do
  out="$DIR/$n.png"
  if [ -s "$out" ]; then echo "SKIP $out"; continue; fi
  idx=$((n - 1)); prompt="${PROMPTS[$idx]}"
  echo ">>> [$KIND $n] generating..."
  z-ai image -p "$prompt" -o "$out" -s 1024x1024 >/dev/null 2>&1 \
    && echo "    DONE $out" || echo "    FAIL $out"
done
echo "=== batch $KIND $START-$END complete ==="
