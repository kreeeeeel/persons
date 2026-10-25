#!/bin/sh
set -eu
source_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
mkdir "$temporary/bin"
export TRANSFER_TEST_CALLS="$temporary/calls"
export TRANSFER_TEST_FIXTURE="$temporary/image.tar"
export TRANSFER_TEST_EXPECTED
TRANSFER_TEST_EXPECTED=$(python3 - "$TRANSFER_TEST_FIXTURE" <<'PY'
import hashlib, io, json, sys, tarfile
config = b'{"config":{"Env":["APP_ENV=prod"]},"rootfs":{"type":"layers","diff_ids":["sha256:example"]}}'
digest = hashlib.sha256(config).hexdigest()
name = 'blobs/sha256/' + digest
with tarfile.open(sys.argv[1], 'w') as archive:
    for filename, content in [(name, config), ('manifest.json', json.dumps([{'Config':name}]).encode())]:
        entry = tarfile.TarInfo(filename)
        entry.size = len(content)
        archive.addfile(entry, io.BytesIO(content))
for suffix, config_name, entries in [('.classic', digest+'.json', 1), ('.ambiguous', name, 2)]:
    with tarfile.open(sys.argv[1]+suffix, 'w') as archive:
        for filename, content in [(config_name, config), ('manifest.json', json.dumps([{'Config':config_name}]*entries).encode())]:
            entry = tarfile.TarInfo(filename)
            entry.size = len(content)
            archive.addfile(entry, io.BytesIO(content))
print('sha256:' + digest)
PY
)
[ "$(python3 "$source_dir/scripts/image-config-digest.py" "$TRANSFER_TEST_FIXTURE")" = "$TRANSFER_TEST_EXPECTED" ]
[ "$(python3 "$source_dir/scripts/image-config-digest.py" "$TRANSFER_TEST_FIXTURE.classic")" = "$TRANSFER_TEST_EXPECTED" ]
if python3 "$source_dir/scripts/image-config-digest.py" "$TRANSFER_TEST_FIXTURE.ambiguous" > "$temporary/result" 2>&1; then exit 1; fi
export TRANSFER_TEST_ARCHIVE_HASH
TRANSFER_TEST_ARCHIVE_HASH=$(sha256sum "$TRANSFER_TEST_FIXTURE" | cut -d ' ' -f 1)
cat > "$temporary/bin/ssh" <<'SH'
#!/bin/sh
printf 'ssh %s\n' "$*" >> "$TRANSFER_TEST_CALLS"
case "$*" in
    *storage-profile*) printf 'external\n' ;;
    *sha256sum*) printf '%s  archive.tar\n' "$TRANSFER_TEST_ARCHIVE_HASH" ;;
    *python3*) printf '%s\n' "${TRANSFER_TEST_ACTUAL:-$TRANSFER_TEST_EXPECTED}" ;;
    *'image inspect'*'/person-web:'*) [ "${TRANSFER_TEST_CACHED:-false}" = true ] ;;
esac
SH
cat > "$temporary/bin/docker" <<'SH'
#!/bin/sh
printf 'docker %s\n' "$*" >> "$TRANSFER_TEST_CALLS"
case "$*" in
    'image save '*) cp "$TRANSFER_TEST_FIXTURE" "$4" ;;
esac
SH
cat > "$temporary/bin/scp" <<'SH'
#!/bin/sh
printf 'scp %s\n' "$*" >> "$TRANSFER_TEST_CALLS"
SH
chmod +x "$temporary/bin/ssh" "$temporary/bin/docker" "$temporary/bin/scp"
export PATH="$temporary/bin:$PATH"
export DEPLOY_HOST=example.test DEPLOY_USER=deploy DEPLOY_PATH=/opt/persons
export RELEASE_SHA=0123456789012345678901234567890123456789
export CI_REGISTRY_IMAGE=registry.example.test/team/persons
cd "$temporary"
for name in ID MAIL I18N PERSON PERSON_WORKER RESTRICTIONS GATEWAY ID_WEB PERSON_WEB PERSON_ADMIN_WEB ASSETS MINIO; do
    printf '%s_IMAGE_TAG=%s\n' "$name" "$RELEASE_SHA"
done > images.env
sh "$source_dir/scripts/transfer-deploy-images.sh"
[ "$(grep -c '^docker pull ' "$TRANSFER_TEST_CALLS")" -eq 1 ]
grep -q '^docker pull .*/person-web:' "$TRANSFER_TEST_CALLS"
[ "$(grep -c '^scp ' "$TRANSFER_TEST_CALLS")" -eq 1 ]
grep -q 'StrictHostKeyChecking=yes' "$TRANSFER_TEST_CALLS"
if grep -q '/minio:' "$TRANSFER_TEST_CALLS"; then exit 1; fi

: > "$TRANSFER_TEST_CALLS"
export TRANSFER_TEST_CACHED=true
sh "$source_dir/scripts/transfer-deploy-images.sh"
if grep -Eq '^docker |^scp ' "$TRANSFER_TEST_CALLS"; then exit 1; fi
unset TRANSFER_TEST_CACHED
export TRANSFER_TEST_ACTUAL=sha256:wrong-image
if sh "$source_dir/scripts/transfer-deploy-images.sh" > result 2>&1; then exit 1; fi
grep -q 'image ID does not match' result
unset TRANSFER_TEST_ACTUAL

: > "$TRANSFER_TEST_CALLS"
export TRANSFER_TEST_ARCHIVE_HASH=corrupted-archive
if sh "$source_dir/scripts/transfer-deploy-images.sh" > result 2>&1; then exit 1; fi
grep -q 'archive checksum does not match' result
if grep -q 'docker image load' "$TRANSFER_TEST_CALLS"; then exit 1; fi

: > "$TRANSFER_TEST_CALLS"
printf 'INVALID_IMAGE_TAG=malicious\n' >> images.env
if sh "$source_dir/scripts/transfer-deploy-images.sh" > result 2>&1; then exit 1; fi
grep -q 'Invalid image manifest' result
[ ! -s "$TRANSFER_TEST_CALLS" ]
printf 'Image transfer: missing images only, external S3, strict SSH and image identity checks passed.\n'
