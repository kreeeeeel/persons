#!/bin/sh
set -eu
: "${CLIENTS_KEY:?}"
for project in $CLIENTS; do
    case "$project" in
        id|i18n|person) source="backend/$project"; output="$source/app/contract/client/typescript/.build" ;;
        dynamic-properties) source="backend/libs/dynamic-properties"; output="$source/contract/client/typescript/.build" ;;
        *) exit 2 ;;
    esac
    stamp=''
    if [ -f "$output/.persons-clients-key" ]; then stamp=$(cat "$output/.persons-clients-key"); fi
    if [ "$stamp" != "$CLIENTS_KEY" ] || [ ! -s "$output/dist/index.js" ]; then
        (cd "$source" && sh gradlew --no-daemon --max-workers=2 generateClients)
        printf '%s\n' "$CLIENTS_KEY" > "$output/.persons-clients-key"
    fi
done
