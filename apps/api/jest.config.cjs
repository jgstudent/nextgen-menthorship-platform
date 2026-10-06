module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  maxWorkers: 2,
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"]
};
