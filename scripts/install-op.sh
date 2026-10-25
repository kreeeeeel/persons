#!/bin/sh
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1/current/scripts/op" ]; then
    printf 'Usage: sudo sh scripts/install-op.sh /absolute/deployment/directory\n' >&2
    exit 2
fi
deployment_dir=$(CDPATH='' cd -- "$1" && pwd)
case "$deployment_dir" in
    *[!a-zA-Z0-9_./-]*) printf 'Unsupported deployment path.\n' >&2; exit 2 ;;
esac
temporary=$(mktemp)
trap 'rm -f "$temporary"' EXIT HUP INT TERM
printf '#!/bin/sh\nexec "%s/current/scripts/op" "$@"\n' "$deployment_dir" > "$temporary"
if [ -e /usr/local/bin/op ] && ! cmp -s "$temporary" /usr/local/bin/op; then
    printf '/usr/local/bin/op already exists; it has not been overwritten.\n' >&2
    exit 1
fi
install -m 0755 "$temporary" /usr/local/bin/op
printf 'Installed: op email\n'
