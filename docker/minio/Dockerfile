FROM golang:1.27.2-bookworm AS build
ENV CGO_ENABLED=0 GOBIN=/out GOMAXPROCS=2
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    go install -trimpath -ldflags='-s -w -X github.com/minio/mc/cmd.Version=2025-04-16T18:13:26Z -X github.com/minio/mc/cmd.ReleaseTag=RELEASE.2025-04-16T18-13-26Z -X github.com/minio/mc/cmd.CommitID=b00526b153a31b36767991a4f5ce2cced435ee8e' \
    github.com/minio/mc@b00526b153a31b36767991a4f5ce2cced435ee8e
ADD https://raw.githubusercontent.com/minio/mc/b00526b153a31b36767991a4f5ce2cced435ee8e/LICENSE /licenses/LICENSE

FROM debian:bookworm-slim AS client
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/mc /usr/bin/mc
COPY --from=build /licenses /licenses
ENTRYPOINT ["mc"]

FROM client AS assets
COPY docker/minio/initialize.sh /initialize.sh
COPY docker/minio/public-assets.json /policy.json
COPY frontend/assets /assets
COPY frontend/libs/i18n/assets/flags /flags
ENTRYPOINT ["/bin/sh", "/initialize.sh"]
