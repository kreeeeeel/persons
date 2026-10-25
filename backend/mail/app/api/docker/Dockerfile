FROM gradle:8.14.3-jdk21 AS build
USER root
ENV GRADLE_USER_HOME=/root/.gradle
WORKDIR /source
COPY backend /source/backend
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/mail && sh gradlew --no-daemon --max-workers=2 :app:api:bootJar

FROM eclipse-temurin:21-jre AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
USER 10001:10001
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

FROM runtime-base AS runtime
COPY --from=build /source/backend/mail/app/api/.build/libs/api-0.1.0.jar /app/app.jar
