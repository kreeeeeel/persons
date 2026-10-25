#!/bin/sh
set -eu
cd "frontend/$APP"
npm ci --no-audit
npm --prefix ../assets test
npm run check
npm run build:prod
