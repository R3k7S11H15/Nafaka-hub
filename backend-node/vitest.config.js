export default {
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    testTimeout: 10000,
  },
}
