#!/bin/sh
set -eu

: "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_PATH:?}" "${RELEASE_SHA:?}" "${CI_REGISTRY_IMAGE:?}"
[ "${#RELEASE_SHA}" -eq 40 ] || exit 2
case "$RELEASE_SHA" in *[!0-9a-f]*) exit 2 ;; esac
case "$DEPLOY_HOST" in *[!a-zA-Z0-9.:-]*|'') exit 2 ;; esac
case "$DEPLOY_USER" in *[!a-zA-Z0-9_-]*|'') exit 2 ;; esac
case "$DEPLOY_PATH" in /*) ;; *) exit 2 ;; esac
case "$DEPLOY_PATH" in *[!a-zA-Z0-9_./-]*) exit 2 ;; esac
case "${DEPLOY_PORT:-22}" in *[!0-9]*|'') exit 2 ;; esac

bundle=$(mktemp)
trap 'rm -f "$bundle"' EXIT HUP INT TERM
tar -czf "$bundle" workspace.lock images.env docker-compose.yaml docker/compose.production.yaml docker/compose.small.yaml docker/compose.external-s3.yaml docker/nginx docker/postgres \
    scripts/op scripts/op.sql scripts/install-op.sh scripts/deploy-release.sh scripts/render-nginx.sh \
    scripts/migrate-restrictions.sh
remote_bundle="/tmp/persons-$RELEASE_SHA.tar.gz"
target="$DEPLOY_USER@$DEPLOY_HOST"
case "${DEPLOY_TRANSFER_IMAGES:-false}" in
    true) sh scripts/transfer-deploy-images.sh ;;
    false) ;;
    *) printf 'Invalid DEPLOY_TRANSFER_IMAGES value.\n' >&2; exit 2 ;;
esac
scp -P "${DEPLOY_PORT:-22}" -o BatchMode=yes -o StrictHostKeyChecking=yes "$bundle" "$target:$remote_bundle"
ssh -p "${DEPLOY_PORT:-22}" -o BatchMode=yes -o StrictHostKeyChecking=yes "$target" \
    "sh -s -- '$DEPLOY_PATH' '$RELEASE_SHA' '$CI_REGISTRY_IMAGE' '$remote_bundle'" < scripts/deploy-release.sh
