# Gateway

Из корня infrastructure: `docker compose build gateway`, затем `docker compose up -d gateway`. Порт 8087, `/actuator/health`. Нужны ID, Person и Restrictions. Настройки — в [документации](../../../docs/gateway/ru.md). Общий Compose передаёт внутренние адреса и секреты, запускает шлюз после зависимостей и направляет BFF через него.

Образ запускается от UID 10001. Предварительно собранный JAR поддерживается общим `docker/compose.prebuilt.yaml`. Шлюз не хранит файлы и не требует томов, БД или публичного порта на production.
