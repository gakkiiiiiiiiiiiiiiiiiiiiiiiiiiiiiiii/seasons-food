module.exports = {
  testMatch: ['<rootDir>/tests/mp-weixin/**/*.test.js'],
  testEnvironment: '@dcloudio/uni-automator/dist/environment.js',
  globalTeardown: '@dcloudio/uni-automator/dist/teardown.js',
  testTimeout: 120000,
  testEnvironmentOptions: {
    platform: 'mp-weixin',
    compile: true,
    host: '127.0.0.1',
    timeout: 120000,
    silent: false,
    'mp-weixin': {
      launch: false,
      port: 19420,
      args: ['--trust-project']
    }
  }
}
