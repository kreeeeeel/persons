pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
rootProject.name = "person"
include(":app:api", ":app:contract:api", ":app:contract:client", ":app:contract:client:openapi", ":app:contract:client:typescript")
includeBuild("../libs/request-observability")
includeBuild("../id")
includeBuild("../libs/dotabuff-integration")
includeBuild("../libs/lettify-integration")
includeBuild("../libs/dynamic-properties")

include(":app:maintenance")
