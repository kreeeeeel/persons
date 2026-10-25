#!/usr/bin/env bash
set -eu

# Some network paths drop SSH identification when both peers speak simultaneously.
# Relay the server identification first; OpenSSH still verifies its key and encrypts traffic.
if [[ $# != 2 || ! $1 =~ ^[a-zA-Z0-9.:-]+$ || ! $2 =~ ^[0-9]+$ ]]; then
    printf 'Usage: ssh-server-first.sh HOST PORT\n' >&2
    exit 2
fi
banner_timeout_seconds=8
connected=false
for attempt in 1 2 3; do
    if { exec 3<>"/dev/tcp/$1/$2"; } 2>/dev/null; then
        if IFS= read -r -t "$banner_timeout_seconds" banner <&3 && [[ $banner == SSH-* ]]; then
            connected=true
            break
        fi
        exec 3>&-
    fi
done
if [[ $connected != true ]]; then
    printf 'SSH server identification was not received within the bounded connection attempts.\n' >&2
    exit 1
fi
printf '%s\n' "$banner"
cat <&3 &
reader=$!
trap 'kill "$reader" 2>/dev/null || true' EXIT HUP INT TERM
cat >&3
wait "$reader"
