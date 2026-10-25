plugins {
    kotlin("jvm")
    `java-library`
    `maven-publish`
}

dependencies {
    implementation("com.persons.requestobservability:request-observability:0.1.0")
    api(project(":app:contract:client:openapi"))
    implementation("org.springframework.boot:spring-boot-starter-validation")
}

base { archivesName.set("persons-restrictions-client") }

version = System.getenv("CI_PIPELINE_IID")?.let { "0.1.0-$it" } ?: "0.1.0"

publishing {
    publications {
        create<MavenPublication>("library") {
            from(components["java"])
            versionMapping {
                usage("java-api") { fromResolutionResult() }
                usage("java-runtime") { fromResolutionResult() }
            }
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
