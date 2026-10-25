plugins {
    kotlin("jvm")
    `java-library`
    `maven-publish`
    id("org.openapi.generator")
}

openApiGenerate {
    globalProperties.set(
        mapOf(
            "apiTests" to "false",
            "modelTests" to "false",
            "apiDocs" to "false",
            "modelDocs" to "false",
        ),
    )
    generatorName.set("kotlin")
    library.set("jvm-spring-webclient")
    inputSpec.set(project(":app:contract:api").file("schema/api.yaml").absolutePath)
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.persons.i18n.client.generated.api")
    modelPackage.set("com.persons.i18n.client.generated.model")
    configOptions.set(
        mapOf(
            "useSpringBoot3" to "true",
            "serializationLibrary" to "jackson",
            "packageName" to "com.persons.i18n.client.generated",
        ),
    )
}

kotlin.sourceSets.main {
    kotlin.srcDir(layout.buildDirectory.dir("generated/openapi/src/main/kotlin"))
}

tasks.compileKotlin { dependsOn("openApiGenerate") }

dependencies {
    api("org.springframework.boot:spring-boot-starter-webflux")
    api("com.fasterxml.jackson.module:jackson-module-kotlin")
}

tasks.named("openApiGenerate") {
    inputs.dir(project(":app:contract:api").file("schema"))
    dependsOn(":app:contract:api:openApiValidate")
    doFirst { delete(layout.buildDirectory.dir("generated/openapi")) }
}

// Generated sources are validated by OpenAPI and compilation; lint applies to maintained source only.
tasks.matching { it.name.startsWith("runKtlint") && it.name.contains("MainSourceSet") }.configureEach {
    dependsOn("openApiGenerate")
}

base { archivesName.set("persons-i18n-client-openapi") }

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
