#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
container="persons-nginx-test-$$"
cleanup() {
    docker rm -f "$container" >/dev/null 2>&1 || true
    rm -rf "$temporary"
}
trap cleanup EXIT HUP INT TERM

for domain in 'invalid/path' 'people.test;return 200' '*.people.test' 'localhost' '-bad.test' 'bad..test'; do
    if sh "$root/scripts/render-nginx.sh" "$domain" > "$temporary/invalid" 2>&1; then
        printf 'Unsafe domain accepted: %s\n' "$domain" >&2
        exit 1
    fi
done

sh "$root/scripts/render-nginx.sh" people.test https geoip > "$temporary/geoip.conf"
grep -Fq 'proxy_set_header X-Client-Region $persons_client_region;' "$temporary/geoip.conf"
if sh "$root/scripts/render-nginx.sh" people.test https invalid >/dev/null 2>&1; then exit 1; fi

sh "$root/scripts/render-nginx.sh" people.test http > "$temporary/site.conf"
cat > "$temporary/nginx.conf" <<'NGINX'
worker_processes 1;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 64; }
http {
    access_log off;
    client_body_temp_path /tmp/client_temp;
    proxy_temp_path /tmp/proxy_temp;
    include /etc/nginx/conf.d/default.conf;
    server { listen 3000; return 200 "$server_port|$http_host|$http_x_forwarded_host|$http_x_forwarded_proto|$http_x_forwarded_for|$http_x_real_ip|$http_x_client_region"; }
    server { listen 3001; return 200 "$server_port|$http_host|$http_x_forwarded_host|$http_x_forwarded_proto|$http_x_forwarded_for|$http_x_real_ip|$http_x_client_region"; }
    server { listen 3002; return 200 "$server_port|$http_host|$http_x_forwarded_host|$http_x_forwarded_proto|$http_x_forwarded_for|$http_x_real_ip|$http_x_client_region"; }
}
NGINX

docker run -d --name "$container" --user 0 --entrypoint sh nginxinc/nginx-unprivileged:1.28-alpine -c 'sleep 300' >/dev/null
docker exec "$container" apk add --no-cache curl openssl >/dev/null
docker exec "$container" mkdir -p /var/www/letsencrypt/.well-known/acme-challenge /etc/letsencrypt/live/people.test
docker exec "$container" sh -c 'printf acme-test > /var/www/letsencrypt/.well-known/acme-challenge/proof'
docker exec "$container" openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=people.test \
    -addext 'subjectAltName=DNS:people.test,DNS:id.people.test,DNS:cms.people.test' \
    -keyout /etc/letsencrypt/live/people.test/privkey.pem -out /etc/letsencrypt/live/people.test/fullchain.pem >/dev/null 2>&1
docker cp "$temporary/nginx.conf" "$container:/etc/nginx/nginx.conf" >/dev/null
docker cp "$temporary/site.conf" "$container:/etc/nginx/conf.d/default.conf" >/dev/null
docker exec "$container" nginx -t
docker exec "$container" nginx
[ "$(docker exec "$container" curl -sS -o /dev/null -w '%{http_code}' -H 'Host: people.test' http://127.0.0.1/)" = 503 ]
[ "$(docker exec "$container" curl -sS -H 'Host: id.people.test' http://127.0.0.1/.well-known/acme-challenge/proof)" = acme-test ]

sh "$root/scripts/render-nginx.sh" people.test https > "$temporary/site.conf"
docker cp "$temporary/site.conf" "$container:/etc/nginx/conf.d/default.conf" >/dev/null
docker exec "$container" nginx -t
docker exec "$container" nginx -s reload
# A reload switches workers asynchronously; wait for TLS without a fixed sleep.
docker exec "$container" curl -ksS --retry 10 --retry-connrefused --retry-delay 1 --resolve people.test:443:127.0.0.1 https://people.test/ > /dev/null

for pair in 'people.test:3002' 'id.people.test:3000' 'cms.people.test:3001'; do
    host=${pair%:*}
    port=${pair#*:}
    response=$(docker exec "$container" curl -ksS --resolve "$host:443:127.0.0.1" \
        -H 'X-Forwarded-For: 203.0.113.99' -H 'X-Forwarded-Proto: http' -H 'X-Forwarded-Host: attacker.test' -H 'X-Client-Region: Spoofed region' "https://$host/check")
    [ "$response" = "$port|$host|$host|https|127.0.0.1|127.0.0.1|" ]
    redirect=$(docker exec "$container" curl -sS -o /dev/null -w '%{http_code}|%{redirect_url}' -H "Host: $host" 'http://127.0.0.1/check?q=1')
    [ "$redirect" = "308|https://$host/check?q=1" ]
done

dd if=/dev/zero of="$temporary/upload" bs=1024 count=1025 2>/dev/null
docker cp "$temporary/upload" "$container:/tmp/upload" >/dev/null
for pair in 'id.people.test:413' 'people.test:200' 'cms.people.test:200'; do
    host=${pair%:*}
    status=${pair#*:}
    [ "$(docker exec "$container" curl -ksS --resolve "$host:443:127.0.0.1" -o /dev/null -w '%{http_code}' --data-binary @/tmp/upload "https://$host/upload")" = "$status" ]
done
for host in people.test cms.people.test; do
    [ "$(docker exec "$container" curl -ksS --resolve "$host:443:127.0.0.1" -o /dev/null -w '%{http_code}' \
        -X POST -H 'Content-Length: 571473921' "https://$host/upload")" = 413 ]
done

dd if=/dev/zero of="$temporary/large-upload" bs=1048576 count=70 2>/dev/null
docker cp "$temporary/large-upload" "$container:/tmp/large-upload" >/dev/null
for host in people.test cms.people.test; do
    [ "$(docker exec "$container" curl -ksS --resolve "$host:443:127.0.0.1" -o /dev/null -w '%{http_code}' \
        --data-binary @/tmp/large-upload "https://$host/upload")" = 200 ]
done
printf 'nginx: HTTP bootstrap, ACME, TLS, three hosts, redirects, trusted headers and upload limits passed.\n'
