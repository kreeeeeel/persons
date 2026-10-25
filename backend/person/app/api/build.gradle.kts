plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
    id("org.springframework.boot")
}

dependencies {
    implementation("com.persons.dynamicproperties:dynamic-properties:0.1.0")
    implementation(project(":app:contract:api"))
    implementation(project(":app:maintenance"))
    implementation("com.persons.id.app.contract:client:0.1.0")
    implementation("com.persons.requestobservability:request-observability:0.1.0")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    testRuntimeOnly("com.h2database:h2")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.14")
}

tasks.processResources {
    dependsOn(":app:contract:api:bundleOpenApi")
    from(project(":app:contract:api").layout.buildDirectory.dir("generated/schema")) {
        include("api.yaml")
        into("static/openapi")
    }
}
