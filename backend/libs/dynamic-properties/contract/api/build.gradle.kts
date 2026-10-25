plugins {
    kotlin("jvm")
    `java-library`
    id("org.openapi.generator")
}
group = "com.persons.dynamicproperties.contract"
version = "0.1.0"
kotlin { jvmToolchain(21) }
tasks.jar { archiveBaseName.set("dynamic-properties-contract-api") }
dependencies {
    api(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
}
openApiValidate { inputSpec.set(file("schema/api.yaml").absolutePath) }
openApiGenerate {
    generatorName.set("kotlin-spring")
    inputSpec.set(file("schema/api.yaml").absolutePath)
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.persons.dynamicproperties.contract.api")
    modelPackage.set("com.persons.dynamicproperties.contract.dto")
    globalProperties.set(mapOf("apiTests" to "false", "modelTests" to "false", "apiDocs" to "false", "modelDocs" to "false"))
    configOptions.set(mapOf("interfaceOnly" to "true", "useTags" to "true", "skipDefaultInterface" to "true",
        "useSpringBoot3" to "true", "useBeanValidation" to "true", "documentationProvider" to "none",
        "annotationLibrary" to "none", "exceptionHandler" to "false"))
}
kotlin.sourceSets.main { kotlin.srcDir(layout.buildDirectory.dir("generated/openapi/src/main/kotlin")) }
tasks.compileKotlin { dependsOn("openApiGenerate") }
tasks.check { dependsOn("openApiValidate") }
tasks.named("openApiGenerate") { inputs.dir("schema"); dependsOn("openApiValidate") }
