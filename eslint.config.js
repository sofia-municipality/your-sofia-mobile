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
    files: ['e2e/**/*.js', 'detox.config.js'],
    languageOptions: {
      globals: {
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
        waitFor: 'readonly',
        expect: 'readonly',
        detox: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
])
