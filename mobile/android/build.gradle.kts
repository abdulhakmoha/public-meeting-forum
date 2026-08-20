allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    afterEvaluate {
        val androidExt = extensions.findByName("android") ?: return@afterEvaluate
        try {
            val getNs = androidExt.javaClass.methods.firstOrNull { it.name == "getNamespace" && it.parameterCount == 0 }
            val current = getNs?.invoke(androidExt) as? String
            if (current.isNullOrBlank()) {
                val manifest = file("src/main/AndroidManifest.xml")
                val fromManifest = if (manifest.exists()) {
                    Regex("""package="([^"]+)"""").find(manifest.readText())?.groupValues?.get(1)
                } else {
                    null
                }
                val ns = fromManifest ?: group.toString().ifBlank { "com.flutter.plugin.${name}" }
                androidExt.javaClass.methods
                    .firstOrNull { it.name == "setNamespace" && it.parameterCount == 1 }
                    ?.invoke(androidExt, ns)
            }
        } catch (_: Exception) {
            // Older Android Gradle Plugin versions do not expose namespace.
        }
    }
}

subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
