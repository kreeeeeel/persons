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
RUN cd frontend/person && npm ci --ignore-scripts --no-audit && APP_ENV=prod npm run build

FROM gradle:8.14.3-jdk21 AS dev
USER root
COPY --from=node /usr/local/ /usr/local/
COPY --from=build --chown=gradle:gradle /source/ /source/
ENV APP_ENV=dev NODE_ENV=development HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /source/frontend/person
USER gradle
EXPOSE 3000
CMD ["node", "tools/next.ts", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM node:24.11.1-bookworm-slim AS runtime-base
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
CMD ["node", "frontend/person/server.js"]

FROM runtime-base AS runtime
COPY --from=build --chown=node:node /source/frontend/person/.next/standalone/ /app/
COPY --from=build --chown=node:node /source/frontend/person/.next/static /app/frontend/person/.next/static
COPY --from=build --chown=node:node /source/frontend/person/public /app/frontend/person/public
