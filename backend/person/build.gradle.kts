import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    base
    kotlin("jvm") version "2.2.21" apply false
    kotlin("plugin.spring") version "2.2.21" apply false
    kotlin("plugin.jpa") version "2.2.21" apply false
    id("org.springframework.boot") version "3.5.16" apply false
    id("org.openapi.generator") version "7.16.0" apply false
    id("org.jlleitschuh.gradle.ktlint") version "13.1.0" apply false
}

allprojects {
    group = "com.persons.person" + path.substringBeforeLast(':').replace(':', '.')
    version = "0.1.0"
    layout.buildDirectory.set(file(".build"))
    repositories { mavenCentral() }
    tasks.withType<org.openapitools.generator.gradle.plugin.tasks.GenerateTask>().configureEach {
        inputs.dir(rootProject.file("../libs/dynamic-properties/contract/api/schema"))
    }
}
subprojects {
    if (path in listOf(":app:maintenance", ":app:api", ":app:contract:api", ":app:contract:client", ":app:contract:client:openapi")) {
        apply(plugin = "org.jetbrains.kotlin.jvm")
        apply(plugin = "org.jlleitschuh.gradle.ktlint")

        extensions.configure<org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension> {
            jvmToolchain(21)
        }
        extensions.configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
            filter {
                exclude { it.file.invariantSeparatorsPath.contains("/.build/") }
            }
        }
        dependencies {
            "implementation"(platform("org.springframework.boot:spring-boot-dependencies:3.5.16"))
            "implementation"("org.jetbrains.kotlin:kotlin-reflect")
            "testImplementation"("org.springframework.boot:spring-boot-starter-test")
            "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
        }
        tasks.withType<Test>().configureEach {
            useJUnitPlatform()
        }
        tasks.withType<KotlinCompile>().configureEach {
            compilerOptions.freeCompilerArgs.add("-Xjsr305=strict")
        }
    }
}

tasks.register("generateClients") { dependsOn(":app:contract:client:typescript:build") }
tasks.named("build") {
    dependsOn(
        listOf(
            ":app:api",
            ":app:maintenance",
            ":app:contract:api",
            ":app:contract:client",
            ":app:contract:client:openapi",
            ":app:contract:client:typescript",
        ).stream().map { "$it:build" }.toList(),
    )
}
