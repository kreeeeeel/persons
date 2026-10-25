#!/bin/sh
set -eu
endpoint=${S3_ENDPOINT:-http://minio:9000}
bucket=${S3_BUCKET:-persons}
access_key=${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-}}
secret_key=${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-}}
case "$bucket" in ''|*[!a-z0-9.-]*) printf 'Invalid S3 bucket name.\n' >&2; exit 2 ;; esac
mc alias set local "$endpoint" "$access_key" "$secret_key" --api S3v4
mc mb --ignore-existing "local/$bucket"
sed "s#arn:aws:s3:::persons/#arn:aws:s3:::$bucket/#g" /policy.json > /tmp/persons-assets-policy.json
mc anonymous set-json /tmp/persons-assets-policy.json "local/$bucket"
mc cp /assets/logo.svg local/"$bucket"/assets/logo.svg
mc cp /assets/mail.svg local/"$bucket"/assets/mail.svg
mc cp /assets/illustrations/friends-v1.webp local/"$bucket"/assets/friends-v1.webp
mc cp /assets/illustrations/error-page-stepa-slava-v1.webp local/"$bucket"/assets/error-page-stepa-slava-v1.webp
mc cp /assets/illustrations/error-modal-nikita-v1.webp local/"$bucket"/assets/error-modal-nikita-v1.webp
mc cp /assets/illustrations/play-boardgame-v1.webp local/"$bucket"/assets/play-boardgame-v1.webp
mc cp /assets/illustrations/play-console-v1.webp local/"$bucket"/assets/play-console-v1.webp
mc cp /assets/illustrations/play-tabletennis-v1.webp local/"$bucket"/assets/play-tabletennis-v1.webp
mc cp /assets/illustrations/play-jenga-v1.webp local/"$bucket"/assets/play-jenga-v1.webp
mc cp /assets/illustrations/play-billiards-v1.webp local/"$bucket"/assets/play-billiards-v1.webp
mc cp /assets/illustrations/play-airhockey-v1.webp local/"$bucket"/assets/play-airhockey-v1.webp
mc cp /assets/illustrations/play-bowling-v1.webp local/"$bucket"/assets/play-bowling-v1.webp
mc cp --recursive /flags/ local/"$bucket"/assets/flags/
mc cp /assets/illustrations/empty-wall-krel-v1.webp local/"$bucket"/assets/empty-wall-krel-v1.webp
mc cp /assets/illustrations/empty-comments-slava-v1.webp local/"$bucket"/assets/empty-comments-slava-v1.webp
mc cp /assets/illustrations/empty-ratings-yuri-v1.webp local/"$bucket"/assets/empty-ratings-yuri-v1.webp
mc cp /assets/illustrations/empty-media-tyamik-v1.webp local/"$bucket"/assets/empty-media-tyamik-v1.webp
mc cp /assets/illustrations/empty-history-vadim-v1.webp local/"$bucket"/assets/empty-history-vadim-v1.webp
mc cp /assets/illustrations/not-found-vadim-v1.webp local/"$bucket"/assets/not-found-vadim-v1.webp
mc cp /assets/social/telegram.svg local/"$bucket"/assets/social-telegram.svg
mc cp /assets/social/steam.svg local/"$bucket"/assets/social-steam.svg
mc cp /assets/social/discord.svg local/"$bucket"/assets/social-discord.svg

mc cp /assets/illustrations/play-console-v3.webp local/"$bucket"/assets/play-console-v3.webp
mc cp /assets/illustrations/play-board-v3.webp local/"$bucket"/assets/play-board-v3.webp
mc cp /assets/illustrations/play-hockey-v3.webp local/"$bucket"/assets/play-hockey-v3.webp
mc cp /assets/illustrations/play-racing-v3.webp local/"$bucket"/assets/play-racing-v3.webp
mc cp /assets/illustrations/play-tower-v3.webp local/"$bucket"/assets/play-tower-v3.webp
mc cp /assets/illustrations/play-puzzle-v3.webp local/"$bucket"/assets/play-puzzle-v3.webp
mc cp /assets/illustrations/play-chess-v3.webp local/"$bucket"/assets/play-chess-v3.webp
mc cp /assets/illustrations/sofa-friends-v1.webp local/"$bucket"/assets/sofa-friends-v1.webp
mc cp /assets/illustrations/empty-media-nikita-v2.webp local/"$bucket"/assets/empty-media-nikita-v2.webp
mc cp /assets/illustrations/empty-achievements-evgeny-v2.webp local/"$bucket"/assets/empty-achievements-evgeny-v2.webp
mc cp /assets/illustrations/empty-notifications-stepa-v2.webp local/"$bucket"/assets/empty-notifications-stepa-v2.webp
mc cp /assets/illustrations/empty-wall-krel-v2.webp local/"$bucket"/assets/empty-wall-krel-v2.webp
mc cp /assets/illustrations/empty-loans-vadim-v2.webp local/"$bucket"/assets/empty-loans-vadim-v2.webp
mc cp /assets/illustrations/empty-my-page-slava-v2.webp local/"$bucket"/assets/empty-my-page-slava-v2.webp

mc cp /assets/illustrations/empty-photos-tyamik-v1.webp local/"$bucket"/assets/empty-photos-tyamik-v1.webp
mc cp /assets/illustrations/cookies-vadim-v1.webp local/"$bucket"/assets/cookies-vadim-v1.webp
mc cp /assets/illustrations/empty-dota-lifestealer-vadim-v1.webp local/"$bucket"/assets/empty-dota-lifestealer-vadim-v1.webp
mc cp /assets/illustrations/empty-dota-lifestealer-vadim-v2.webp local/"$bucket"/assets/empty-dota-lifestealer-vadim-v2.webp
mc cp /assets/illustrations/empty-cs-sas-vadim-v1.webp local/"$bucket"/assets/empty-cs-sas-vadim-v1.webp
mc cp /assets/illustrations/empty-loans-vadim-v3.webp local/"$bucket"/assets/empty-loans-vadim-v3.webp
mc cp /assets/illustrations/restricted-vadim-v1.webp local/"$bucket"/assets/restricted-vadim-v1.webp

# Remove the retired, explicitly replaced slideshow artwork.
retired_artwork=$(mc find local/"$bucket"/assets/ --maxdepth 1 --name play-football-v3.webp)
if [ -n "$retired_artwork" ]; then
    mc rm "$retired_artwork"
fi

mc cp /assets/illustrations/upload-evgeny-v1.webp local/"$bucket"/assets/upload-evgeny-v1.webp
mc cp /assets/illustrations/search-pages-stepa-v1.webp local/"$bucket"/assets/search-pages-stepa-v1.webp

mc cp /assets/illustrations/empty-dota-lifestealer-vadim-v3.webp local/"$bucket"/assets/empty-dota-lifestealer-vadim-v3.webp
mc cp /assets/illustrations/empty-cs-sas-vadim-v2.webp local/"$bucket"/assets/empty-cs-sas-vadim-v2.webp
mc cp /assets/illustrations/empty-search-artem-v1.webp local/"$bucket"/assets/empty-search-artem-v1.webp
mc cp /assets/illustrations/empty-sessions-nikita-v1.webp local/"$bucket"/assets/empty-sessions-nikita-v1.webp
mc cp /assets/illustrations/empty-restrictions-yuri-v1.webp local/"$bucket"/assets/empty-restrictions-yuri-v1.webp
mc cp /assets/illustrations/empty-publications-krel-v1.webp local/"$bucket"/assets/empty-publications-krel-v1.webp
mc cp /assets/illustrations/empty-moderation-slava-v1.webp local/"$bucket"/assets/empty-moderation-slava-v1.webp
mc cp /assets/illustrations/empty-settings-evgeny-v1.webp local/"$bucket"/assets/empty-settings-evgeny-v1.webp
