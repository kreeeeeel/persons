pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
rootProject.name = "gateway"
include(":app:api")
includeBuild("../libs/request-observability")
includeBuild("../id")
includeBuild("../person")
includeBuild("../restrictions")
