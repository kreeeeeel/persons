#!/bin/sh
set -eu

usage() {
    printf 'Usage: sh scripts/render-nginx.sh DOMAIN [http|https] [geoip]\n' >&2
    exit 2
}

if [ "$#" -lt 1 ] || [ "$#" -gt 3 ]; then
    usage
fi
domain=$1
mode=${2:-https}
case "$mode" in http|https) ;; *) usage ;; esac
region='""'
case "${3:-}" in '') ;; geoip) region='$persons_client_region' ;; *) usage ;; esac
# ASCII/Punycode DNS names only; reject paths, wildcards and Nginx/sed interpolation.
[ "${#domain}" -le 253 ] || usage
printf '%s\n' "$domain" | LC_ALL=C grep -Eq '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$' || usage
root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
sed -e "s/__DOMAIN__/$domain/g" -e "s/__CLIENT_REGION__/$region/g" "$root/docker/nginx/production.$mode.conf.template"
