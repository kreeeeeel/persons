pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
rootProject.name = "restrictions"
include(":app:api", ":app:contract:api", ":app:contract:client", ":app:contract:client:openapi", ":app:contract:client:typescript")
includeBuild("../libs/request-observability")
includeBuild("../id")
