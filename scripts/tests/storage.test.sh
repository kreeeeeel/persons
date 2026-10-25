#!/bin/sh
set -eu
if [ "$#" -ne 2 ]; then
    printf 'Usage: storage.test.sh SERVER_IMAGE ASSETS_IMAGE\n' >&2
    exit 2
fi
server_image=$1
assets_image=$2
network="persons-storage-test-$$"
server="persons-storage-test-$$"
cleanup() {
    docker rm -f "$server" >/dev/null 2>&1 || true
    docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM
docker network create "$network" >/dev/null
docker run -d --name "$server" --network "$network" --network-alias minio \
    -e MINIO_ROOT_USER=ci-storage-user -e MINIO_ROOT_PASSWORD=ci-storage-fixture-password \
    "$server_image" server /data --console-address :9001 >/dev/null
attempt=0
until docker exec "$server" curl -fsS http://localhost:9000/minio/health/live >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || exit 1
    sleep 1
done
docker run --rm --network "$network" -e MINIO_ROOT_USER=ci-storage-user \
    -e MINIO_ROOT_PASSWORD=ci-storage-fixture-password "$assets_image" >/dev/null
docker exec "$server" curl -fsS http://localhost:9000/persons/assets/logo.svg >/dev/null
docker exec "$server" curl -fsS http://localhost:9000/persons/assets/play-console-v3.webp >/dev/null
docker exec "$server" curl -fsS http://localhost:9000/persons/assets/sofa-friends-v1.webp >/dev/null
retired_status=$(docker exec "$server" curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/persons/assets/play-football-v3.webp)
[ "$retired_status" = 404 ]
docker run --rm --network "$network" --entrypoint sh "$assets_image" -c '
    mc alias set local http://minio:9000 ci-storage-user ci-storage-fixture-password >/dev/null
    printf private-avatar > /tmp/avatar
    mc cp /tmp/avatar local/persons/avatars/test >/dev/null
    printf retired-artwork > /tmp/retired
    mc cp /tmp/retired local/persons/assets/play-football-v3.webp >/dev/null
' >/dev/null
docker run --rm --network "$network" -e MINIO_ROOT_USER=ci-storage-user \
    -e MINIO_ROOT_PASSWORD=ci-storage-fixture-password "$assets_image" >/dev/null
retired_status=$(docker exec "$server" curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/persons/assets/play-football-v3.webp)
[ "$retired_status" = 404 ]
status=$(docker exec "$server" curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/persons/avatars/test)
[ "$status" = 403 ]

# External S3 configuration uses its own endpoint, bucket and credentials.
docker run --rm --network "$network" -e S3_ENDPOINT=http://minio:9000 \
    -e S3_BUCKET=external-test-bucket -e S3_REGION=us-east-1 \
    -e S3_ACCESS_KEY=ci-storage-user -e S3_SECRET_KEY=ci-storage-fixture-password \
    "$assets_image" >/dev/null
docker exec "$server" curl -fsS http://localhost:9000/external-test-bucket/assets/logo.svg >/dev/null
docker run --rm --network "$network" --entrypoint sh "$assets_image" -c '
    mc alias set local http://minio:9000 ci-storage-user ci-storage-fixture-password >/dev/null
    printf private-media > /tmp/private
    for prefix in avatars photo video achievments proofs; do
        mc cp /tmp/private "local/external-test-bucket/$prefix/test" >/dev/null
    done
' >/dev/null
for prefix in avatars photo video achievments proofs; do
    status=$(docker exec "$server" curl -s -o /dev/null -w '%{http_code}' "http://localhost:9000/external-test-bucket/$prefix/test")
    [ "$status" = 403 ]
done
printf 'storage: server readiness, asset upload, public illustrations and private avatars passed.\n'
