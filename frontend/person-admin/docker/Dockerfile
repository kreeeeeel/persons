FROM node:24.11.1-bookworm-slim AS node
FROM gradle:8.14.3-jdk21 AS build
USER root
ENV GRADLE_USER_HOME=/root/.gradle
COPY --from=node /usr/local/ /usr/local/
WORKDIR /source
COPY backend /source/backend
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/id && sh gradlew --no-daemon --max-workers=2 :app:contract:client:typescript:build
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/i18n && sh gradlew --no-daemon --max-workers=2 :app:contract:client:typescript:build
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/person && sh gradlew --no-daemon --max-workers=2 :app:contract:client:typescript:build
RUN --mount=type=cache,id=persons-gradle,target=/root/.gradle,sharing=locked cd backend/libs/dynamic-properties && sh gradlew --no-daemon --max-workers=2 generateClients
COPY frontend /source/frontend
RUN cd frontend/person-admin && npm ci --ignore-scripts --no-audit && APP_ENV=prod npm run build

FROM node:24.11.1-bookworm-slim AS runtime-base
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
CMD ["node", "frontend/person-admin/server.js"]

FROM runtime-base AS runtime
COPY --from=build --chown=node:node /source/frontend/person-admin/.next/standalone/ /app/
COPY --from=build --chown=node:node /source/frontend/person-admin/.next/static /app/frontend/person-admin/.next/static
COPY --from=build --chown=node:node /source/frontend/person-admin/public /app/frontend/person-admin/public
