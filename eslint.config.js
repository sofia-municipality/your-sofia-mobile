// https://docs.expo.dev/guides/using-eslint/
const {defineConfig} = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', '/.expo', 'node_modules'],
  },
  {
    // These run under plain Node.js (the mock server and the script that
    // overlays these files onto it), not the RN app bundle — give them Node
    // globals instead of the RN/browser-ish set the rest of the project uses.
    files: ['e2e/apply-mock-overrides.js', 'e2e/mock-server-overrides/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
])
