plugins {
    kotlin("jvm")
    id("org.openapi.generator")
}

val schema = file("schema/api.yaml")

openApiValidate {
    inputSpec.set(schema.absolutePath)
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
    generatorName.set("kotlin-spring")
    templateDir.set(project(":app:contract:api").file("templates").absolutePath)
    inputSpec.set(schema.absolutePath)
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.persons.restrictions.contract.api")
    modelPackage.set("com.persons.restrictions.contract.dto")
    configOptions.set(
        mapOf(
            "interfaceOnly" to "true",
            "useTags" to "true",
            "skipDefaultInterface" to "true",
            "useSpringBoot3" to "true",
            "useBeanValidation" to "true",
            "documentationProvider" to "none",
            "annotationLibrary" to "none",
            "exceptionHandler" to "false",
        ),
    )
}

kotlin.sourceSets.main {
    kotlin.srcDir(layout.buildDirectory.dir("generated/openapi/src/main/kotlin"))
}

tasks.compileKotlin { dependsOn("openApiGenerate") }
tasks.check { dependsOn("openApiValidate") }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
}

tasks.named("openApiGenerate") {
    inputs.dir("schema")
    dependsOn("openApiValidate")
    doFirst { delete(layout.buildDirectory.dir("generated/openapi")) }
}

// Generated sources are validated by OpenAPI and compilation; lint applies to maintained source only.
tasks.matching { it.name.startsWith("runKtlint") && it.name.contains("MainSourceSet") }.configureEach {
    dependsOn("openApiGenerate")
}
