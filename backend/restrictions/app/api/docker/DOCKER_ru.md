# Restrictions API

Из корня infrastructure: `docker compose build restrictions`, затем `docker compose up -d restrictions`. Порт 8088, `/actuator/health`. Нужны PostgreSQL с отдельной базой `restrictions`, Redis и ID. Настройки и правила описаны в [документации](../../../docs/restrictions/ru.md).

На новом томе БД создаётся автоматически. Для существующего окружения используйте общий сценарий обновления infrastructure с переносом прежних блокировок; удалять PostgreSQL-том не нужно. Образы запускаются от UID 10001; секреты передаются окружением. Уже собранный JAR поддерживается общим `docker/compose.prebuilt.yaml`.
