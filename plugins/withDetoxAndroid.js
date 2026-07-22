const {
  withAppBuildGradle,
  withSettingsGradle,
  withDangerousMod,
  withGradleProperties,
} = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

// Detox's Android instrumentation needs native scaffolding that `expo prebuild`
// has no built-in support for: a test runner + Detox's own Gradle module
// wired into app/build.gradle, and a DetoxTest class under androidTest. None
// of that lives in `android/` normally survives prebuild regeneration
// (android/ is gitignored), so this plugin re-applies it every time.
function withDetoxAndroidBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withDetoxAndroidBuildGradle only supports Groovy build.gradle files')
    }

    let contents = config.modResults.contents

    if (!contents.includes('testInstrumentationRunner')) {
      contents = contents.replace(
        /versionName\s+"[^"]*"\n/,
        (match) =>
          `${match}\n` +
          '        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"\n' +
          "        // Detox's -DtestBuildType flag reads this property to decide which\n" +
          "        // build type's androidTest APK to produce.\n" +
          "        testBuildType System.getProperty('testBuildType', 'debug')\n" +
          "        missingDimensionStrategy 'detox', 'full'\n"
      )
    }

    if (!contents.includes("project(':detox')")) {
      contents = contents.replace(
        /\n}\s*\n\napply plugin: 'com\.google\.gms\.google-services'/,
        '\n\n' +
          "    androidTestImplementation(project(':detox'))\n" +
          "    androidTestImplementation 'androidx.test:runner:1.5.2'\n" +
          "    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'\n" +
          "}\n\napply plugin: 'com.google.gms.google-services'"
      )
    }

    config.modResults.contents = contents
    return config
  })
}

function withDetoxAndroidSettingsGradle(config) {
  return withSettingsGradle(config, (config) => {
    if (!config.modResults.contents.includes("include(':detox')")) {
      config.modResults.contents +=
        '\n' +
        'def detoxPackageJson = providers.exec {\n' +
        '  workingDir(rootDir)\n' +
        '  commandLine("node", "--print", "require.resolve(\'detox/package.json\')")\n' +
        '}.standardOutput.asText.get().trim()\n' +
        "include(':detox')\n" +
        "project(':detox').projectDir = new File(new File(detoxPackageJson).getParentFile(), 'android/detox')\n"
    }
    return config
  })
}

// The default 512m Metaspace ceiling isn't enough for lintVitalAnalyzeRelease
// across this many native modules — it OOMs on CI runners (and can on lower-
// memory dev machines) during `assembleRelease`, which the Detox build always
// triggers alongside assembleAndroidTest.
function withDetoxAndroidGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const jvmargsItem = config.modResults.find(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs'
    )
    if (jvmargsItem && !jvmargsItem.value.includes('MaxMetaspaceSize=1')) {
      jvmargsItem.value = '-Xmx4096m -XX:MaxMetaspaceSize=1024m'
    }
    return config
  })
}

function withDetoxTestClass(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android.package
      const packagePath = packageName.split('.').join(path.sep)
      const dir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/androidTest/java',
        packagePath
      )
      fs.mkdirSync(dir, {recursive: true})
      fs.writeFileSync(
        path.join(dir, 'DetoxTest.kt'),
        `package ${packageName}

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.rule.ActivityTestRule
import com.wix.detox.Detox
import com.wix.detox.config.DetoxConfig
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
class DetoxTest {
    @get:Rule
    var activityRule = ActivityTestRule(MainActivity::class.java, false, false)

    @Test
    fun runDetoxTests() {
        val detoxConfig = DetoxConfig()
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 90
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60
        detoxConfig.rnContextLoadTimeoutSec = if (BuildConfig.DEBUG) 180 else 60

        Detox.runTests(activityRule, detoxConfig)
    }
}
`
      )
      return config
    },
  ])
}

module.exports = function withDetoxAndroid(config) {
  config = withDetoxAndroidBuildGradle(config)
  config = withDetoxAndroidSettingsGradle(config)
  config = withDetoxAndroidGradleProperties(config)
  config = withDetoxTestClass(config)
  return config
}
