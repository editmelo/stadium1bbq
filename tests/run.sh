#!/usr/bin/env bash
# Runs the ordering regression. Needs Node and Google Chrome; nothing else.
#   ./tests/run.sh
# Starts two stand-in servers (one with Square credentials stubbed in, one
# without), drives a headless Chrome against both, and reports pass/fail.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SITE="$(dirname "$HERE")"
TMP="$(mktemp -d)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cleanup() { kill $SRV1 $SRV2 $CHR 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT

# The no-credentials variant is generated from the same server so the two
# can never drift apart.
sed 's/^process.env.SQUARE_ACCESS_TOKEN.*$/delete process.env.SQUARE_ACCESS_TOKEN;/;
     s/^process.env.SQUARE_LOCATION_ID.*$/delete process.env.SQUARE_LOCATION_ID;/' \
  "$HERE/server.js" > "$TMP/server-nocreds.js"

node "$HERE/server.js"        "$SITE" 8787 > "$TMP/s1.log" 2>&1 & SRV1=$!
node "$TMP/server-nocreds.js" "$SITE" 8788 > "$TMP/s2.log" 2>&1 & SRV2=$!
"$CHROME" --headless=new --remote-debugging-port=9222 --no-first-run \
  --no-default-browser-check --user-data-dir="$TMP/chrome" about:blank \
  > "$TMP/chrome.log" 2>&1 & CHR=$!
sleep 3

fail=0
node "$HERE/cart.test.js"    || fail=1
node "$HERE/offline.test.js" || fail=1
exit $fail
