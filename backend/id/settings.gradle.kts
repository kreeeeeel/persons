pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
rootProject.name = "id"
include(":app:api")
include(":app:contract:api")
include(":app:contract:client")
include(":app:contract:client:openapi")
include(":app:contract:client:typescript")
includeBuild("../libs/request-observability")
includeBuild("../libs/id-context")
includeBuild("../i18n")
includeBuild("../mail")
