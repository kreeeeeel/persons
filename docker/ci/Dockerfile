FROM node:24.11.1-bookworm-slim AS node
FROM gradle:8.14.3-jdk21
USER root
COPY --from=node /usr/local/ /usr/local/
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/*
ENV GRADLE_USER_HOME=/cache/gradle
