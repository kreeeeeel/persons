FROM node:24.11.1-bookworm-slim AS node
FROM gradle:8.14.3-jdk21 AS contracts
USER root
ENV GRADLE_USER_HOME=/root/.gradle
COPY --from=node /usr/local/ /usr/local/
WORKDIR /source
COPY backend /source/backend
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/person && sh gradlew --no-daemon --max-workers=2 :app:contract:api:compileKotlin :app:contract:client:typescript:build :app:contract:client:build

FROM contracts AS build
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/person && sh gradlew --no-daemon --max-workers=2 ktlintCheck :app:api:test :app:api:bootJar

FROM eclipse-temurin:21-jre AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
USER 10001:10001
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

FROM runtime-base AS runtime
COPY --from=build /source/backend/person/app/api/.build/libs/api-0.1.0.jar /app/app.jar
