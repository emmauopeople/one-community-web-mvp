export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ["src/**/*.js", "db.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: { lines: 40, statements: 40, functions: 50, branches: 35 },
  },
};
