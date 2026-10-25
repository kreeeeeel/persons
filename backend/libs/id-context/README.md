# id-context

Базовый Kotlin-пакет: `com.persons.idcontext` (дефис имени проекта исключён из имени пакета).

`@RequireUser` на класс/метод, `@CurrentUser` на параметр, `UserContext.current()` внутри метода. Context request-scoped, проверка сессии мемоизируется на запрос. Подключите IdContextConfiguration и SessionVerifier; id проверяет локально, другие сервисы подключают RemoteIdContextConfiguration из com.persons.id.client.context; adapter использует generated id-client и внутренний JWT. SessionRequiredException преобразуйте в 401 на HTTP-границе. Context нельзя сохранять в singleton или background job.

Самостоятельный Gradle, JDK 21. Запуск: ./gradlew build (Windows gradlew.bat). Group com.persons.idcontext, локальная версия 0.1.0; результаты в игнорируемой .build. Composite builds не требуют публикации. GitLab CI проверяет MR и публикует Maven на default branch, версия 0.1.0-<pipeline iid>. Registry: CI_API_V4_URL, CI_PROJECT_ID, CI_JOB_TOKEN.

English: standalone JDK 21 Gradle library. Run ./gradlew build for compilation, tests and ktlint. Local composite builds need no registry. GitLab CI publishes versioned Maven artifacts on the default branch using CI credentials.
