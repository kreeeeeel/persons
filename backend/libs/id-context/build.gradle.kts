plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"
    `java-library`
    id("org.jlleitschuh.gradle.ktlint") version "13.1.0"
    `maven-publish`
}

dependencies {
    api("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
}

group = "com.persons.idcontext"
version = System.getenv("CI_PIPELINE_IID")?.let { "0.1.0-$it" } ?: "0.1.0"
layout.buildDirectory.set(file(".build"))
repositories { mavenCentral() }
kotlin { jvmToolchain(21) }
dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test { useJUnitPlatform() }
ktlint { filter { exclude("**/.build/**") } }

publishing {
    publications {
        create<MavenPublication>("library") {
            from(components["java"])
            version = System.getenv("CI_PIPELINE_IID")?.let { "0.1.0-$it" } ?: project.version.toString()
        }
    }
    repositories {
        maven {
            name = "GitLab"
            url =
                uri(
                    "${System.getenv(
                        "CI_API_V4_URL",
                    ) ?: "https://gitlab.com/api/v4"}/projects/${System.getenv("CI_PROJECT_ID") ?: "0"}/packages/maven",
                )
            credentials(HttpHeaderCredentials::class) {
                name = "Job-Token"
                value = System.getenv("CI_JOB_TOKEN").orEmpty()
            }
            authentication { create<HttpHeaderAuthentication>("header") }
        }
    }
}
