#!/bin/sh
set -eu
source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
mkdir -p "$temporary/backend/id"
cat > "$temporary/backend/id/gradlew" <<'SH'
#!/bin/sh
set -eu
case "$*" in *' generateClients') ;; *) exit 2 ;; esac
printf 'generated\n' >> "$CLIENTS_TEST_CALLS"
mkdir -p app/contract/client/typescript/.build/dist
printf 'export const revision = 1;\n' > app/contract/client/typescript/.build/dist/index.js
SH
export CLIENTS=id CLIENTS_KEY=contract-one CLIENTS_TEST_CALLS="$temporary/calls"
cd "$temporary"
sh "$source_dir/ci/build-clients.sh"
[ "$(wc -l < "$CLIENTS_TEST_CALLS")" -eq 1 ]
sh "$source_dir/ci/build-clients.sh"
[ "$(wc -l < "$CLIENTS_TEST_CALLS")" -eq 1 ]
export CLIENTS_KEY=contract-two
sh "$source_dir/ci/build-clients.sh"
[ "$(wc -l < "$CLIENTS_TEST_CALLS")" -eq 2 ]
# A matching stamp with missing output is also a cache miss.
rm backend/id/app/contract/client/typescript/.build/dist/index.js
sh "$source_dir/ci/build-clients.sh"
[ "$(wc -l < "$CLIENTS_TEST_CALLS")" -eq 3 ]
printf 'clients: valid cache reused, changed contracts and incomplete outputs regenerated without server compilation.\n'
