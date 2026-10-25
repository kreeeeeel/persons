#!/bin/sh
set -eu

# DB-IP City Lite: https://db-ip.com/db/download/ip-to-city-lite (CC BY 4.0).
# Run as root after installing the matching Nginx GeoIP2 module.
directory=/opt/persons/shared/geoip
month=${1:-$(date -u +%Y-%m)}
printf '%s\n' "$month" | grep -Eq '^20[0-9]{2}-(0[1-9]|1[0-2])$' || exit 2
install -d -m 755 "$directory"
temporary=$(mktemp -d "$directory/update.XXXXXX")
trap 'rm -f "$temporary/database.gz" "$temporary/database.mmdb"; rmdir "$temporary"' EXIT HUP INT TERM
curl --fail --location --proto '=https' --tlsv1.2 --retry 3 --max-time 300 \
    "https://download.db-ip.com/free/dbip-city-lite-$month.mmdb.gz" -o "$temporary/database.gz"
gzip -t "$temporary/database.gz"
gzip -dc "$temporary/database.gz" > "$temporary/database.mmdb"
# Validate the database before replacing the last working version.
mmdblookup --file "$temporary/database.mmdb" --ip 8.8.8.8 country iso_code >/dev/null
chmod 644 "$temporary/database.mmdb"
mv "$temporary/database.mmdb" "$directory/dbip-city-lite.mmdb"
printf 'DB-IP Lite %s installed.\n' "$month"
