plugins {
    base
    id("org.openapi.generator")
}

openApiGenerate {
    generatorName.set("typescript-fetch")
    inputSpec.set(project(":app:contract:api").file("schema/api.yaml").absolutePath)
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    configOptions.set(
        mapOf(
            "supportsES6" to "true",
            "typescriptThreePlus" to "true",
            "importFileExtension" to ".js",
        ),
    )
}

val npm = if (System.getProperty("os.name").startsWith("Windows")) "npm.cmd" else "npm"

val installCompiler by tasks.registering(Exec::class) {
    workingDir(projectDir)
    commandLine(npm, "ci", "--ignore-scripts", "--no-audit", "--prefer-offline")
    inputs.files("package.json", "package-lock.json")
    outputs.dir("node_modules")
}

val compileClient by tasks.registering(Exec::class) {
    dependsOn("openApiGenerate", installCompiler)
    workingDir(projectDir)
    doFirst { delete(layout.buildDirectory.dir("dist")) }
    commandLine(npm, "run", "build")
}

tasks.check { dependsOn(compileClient) }
tasks.build { dependsOn(compileClient) }

tasks.named("openApiGenerate") {
    inputs.dir(project(":app:contract:api").file("schema"))
    dependsOn(":app:contract:api:openApiValidate")
    doFirst { delete(layout.buildDirectory.dir("generated/openapi")) }
}
