module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["jest-date-mock"],
  rootDir: ".",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"]
};
