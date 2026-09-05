#!/usr/bin/env bash
# Captures the landing-page product screenshots from the dev mock at /dev/screens (2× retina).
# Needs the dev server on :3000 and Google Chrome. Output goes to src/images/.
set -euo pipefail
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=src/images
TMP=$(mktemp -d)
mkdir -p "$OUT"

shoot() { # view, file
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --force-device-scale-factor=2 --window-size=1440,900 --virtual-time-budget=10000 \
    --screenshot="$2" "http://localhost:3000/dev/screens?view=$1" >/dev/null 2>&1
}

curl -s -o /dev/null "http://localhost:3000/dev/screens?view=ship"   # warm the route
shoot ship "$TMP/ship.png"
shoot label "$TMP/label.png"

cp "$TMP/ship.png" "$OUT/ship-screen.png"                                  # hero: the whole Ship screen
sips -c 440 1040 --cropOffset 280 40 "$TMP/ship.png" --out "$OUT/step-address.png" >/dev/null   # how it works 1
sips -c 900 1760 --cropOffset 112 1120 "$TMP/ship.png" --out "$OUT/step-rates.png" >/dev/null   # how it works 2
sips -c 1150 1760 --cropOffset 112 1120 "$TMP/label.png" --out "$OUT/step-label.png" >/dev/null # how it works 3
ls -la "$OUT"
