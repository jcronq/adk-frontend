module.exports = {
  // Transform ES modules in node_modules
  transformIgnorePatterns: [
    "/node_modules/(?!axios|axios-mock-adapter).+\\.js$"
  ],
  // The test environment that will be used for testing
  testEnvironment: "jsdom",
  // Setup files to run before each test
  setupFilesAfterEnv: [
    "<rootDir>/src/setupTests.ts"
  ]
};
