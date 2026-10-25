plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    id("org.springframework.boot")
}

dependencies {
    implementation("com.persons.id.app.contract:client:0.1.0")
    implementation("com.persons.person.app.contract:api:0.1.0")
    implementation("com.persons.restrictions.app.contract:client:0.1.0")
    implementation("com.persons.requestobservability:request-observability:0.1.0")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    testImplementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml")
}

tasks.test { workingDir(rootProject.projectDir) }
