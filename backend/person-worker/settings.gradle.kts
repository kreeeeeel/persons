pluginManagement { repositories { mavenCentral(); gradlePluginPortal() } }
rootProject.name = "person-worker"
include(":app:worker")
includeBuild("../person")
includeBuild("../restrictions")
