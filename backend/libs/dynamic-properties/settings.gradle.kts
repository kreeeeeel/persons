pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}
rootProject.name = "dynamic-properties"
include(":contract:api", ":contract:client:typescript")
includeBuild("../../id")
includeBuild("../request-observability")
