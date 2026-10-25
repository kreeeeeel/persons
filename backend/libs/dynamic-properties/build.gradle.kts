plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    `java-library`
    id("org.jlleitschuh.gradle.ktlint") version "13.1.0"
    id("org.openapi.generator") version "7.16.0" apply false
}
group = "com.persons.dynamicproperties"
version = "0.1.0"
allprojects {
    layout.buildDirectory.set(file(".build"))
    repositories { mavenCentral() }
}
kotlin { jvmToolchain(21) }
dependencies {
    api(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
    api(project(":contract:api"))
    api("org.springframework.boot:spring-boot-starter-web")
    api("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("com.persons.id.app.contract:client:0.1.0")
    implementation("com.persons.requestobservability:request-observability:0.1.0")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test { useJUnitPlatform() }
tasks.processResources {
    from(project(":contract:api").file("schema")) { into("static/openapi/dynamic-properties") }
}
tasks.register("generateClients") { dependsOn(":contract:client:typescript:build") }
ktlint { filter { exclude("**/.build/**") } }
