plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    id("org.springframework.boot")
}
dependencies {
    implementation("com.persons.dynamicproperties:dynamic-properties:0.1.0")
    implementation("com.persons.person.app:maintenance:0.1.0")
    implementation("com.persons.restrictions.app.contract:client:0.1.0")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    testRuntimeOnly("com.h2database:h2")
}
