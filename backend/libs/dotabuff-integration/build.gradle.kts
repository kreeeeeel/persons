plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    `java-library`
    id("org.jlleitschuh.gradle.ktlint") version "13.1.0"
}
group = "com.persons.dotabuff"
version = "0.1.0"
layout.buildDirectory.set(file(".build"))
repositories { mavenCentral() }
kotlin { jvmToolchain(21) }
dependencies {
    api("com.persons.dynamicproperties:dynamic-properties:0.1.0")
    api(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
    api("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jsoup:jsoup:1.23.2")
    implementation("org.apache.httpcomponents.client5:httpclient5")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test { useJUnitPlatform() }
ktlint { filter { exclude("**/.build/**") } }
