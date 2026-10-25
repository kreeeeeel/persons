#!/bin/sh
set -eu
node scripts/check-persistence.mjs
cd "backend/$PROJECT"
sh gradlew --no-daemon --max-workers=2 build ktlintCheck
