# request-observability

Базовый Kotlin-пакет: `com.persons.requestobservability` (дефис имени проекта исключён из имени пакета).

Автоконфигурация: request id, структурированный журнал, постоянная маскировка секретов, ограниченный захват request/response body. project.internal.jwt-secret обязателен. /internal требует короткий JWT с audience persons-internal, scope service. SignedJwt используется JVM-клиентами. project.observability настраивает маски и тела; тела выключены по умолчанию, файлы не логируются. HTML писем и данные аватаров всегда маскируются, чтобы OTP и изображения не попадали в журнал.

Самостоятельный Gradle, JDK 21. Запуск: ./gradlew build (Windows gradlew.bat). Group com.persons.requestobservability, локальная версия 0.1.0; результаты в игнорируемой .build. Composite builds не требуют публикации. GitLab CI проверяет MR и публикует Maven на default branch, версия 0.1.0-<pipeline iid>. Registry: CI_API_V4_URL, CI_PROJECT_ID, CI_JOB_TOKEN.

English: standalone JDK 21 Gradle library. Run ./gradlew build for compilation, tests and ktlint. Local composite builds need no registry. GitLab CI publishes versioned Maven artifacts on the default branch using CI credentials.
