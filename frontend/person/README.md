# Публичный сайт «Те ещё люди»

Next.js-приложение находится в общем workspace infrastructure вместе с API-клиентами и библиотеками. Локальный запуск и команды проверок описаны в [README infrastructure](https://gitlab.com/te-eshche-lyudi/infrastructure/-/blob/main/README.md).

## CI/CD

После push общий pipeline фиксирует точный SHA компонента. Изменение только этого приложения запускает проверку и production-сборку `person-web`; backend и MinIO используют уже проверенные образы. TypeScript-клиенты генерируются отдельно из контрактов и кэшируются по их версии.

При изменении общей темы, UI или API-контрактов CI также собирает затронутые приложения. После успешных проверок ручная выкладка обновляет только изменившиеся сервисы, сохраняя остальные работающие контейнеры.

Сначала отправляйте commit в этот репозиторий, затем обновляйте gitlink `frontend/person` в infrastructure. Подробности графа зависимостей и деплоя: [документация CI/CD](https://gitlab.com/te-eshche-lyudi/infrastructure/-/blob/main/docs/deployment/ru.md).
