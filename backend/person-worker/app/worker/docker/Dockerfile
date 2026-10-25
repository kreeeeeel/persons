FROM gradle:8.14.3-jdk21 AS build
USER root
ENV GRADLE_USER_HOME=/root/.gradle
COPY backend /source/backend
WORKDIR /source/backend/person-worker
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked sh gradlew --no-daemon --max-workers=2 ktlintCheck :app:worker:test :app:worker:bootJar

FROM eclipse-temurin:21-jre AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends curl ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
USER 10001:10001
EXPOSE 8086
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
FROM runtime-base AS runtime
COPY --from=build /source/backend/person-worker/app/worker/.build/libs/worker-0.1.0.jar /app/app.jar
