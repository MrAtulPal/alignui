/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "core",
      testMatch: ["<rootDir>/packages/core/src/**/*.test.ts"],
      testEnvironment: "node",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: "<rootDir>/packages/core/tsconfig.json"
          }
        ]
      },
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
      }
    },
    {
      displayName: "cli",
      testMatch: ["<rootDir>/packages/cli/src/**/*.test.ts"],
      testEnvironment: "node",
      preset: "ts-jest/presets/default-esm",
      extensionsToTreatAsEsm: [".ts"],
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: "<rootDir>/packages/cli/tsconfig.json"
          }
        ]
      },
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
      }
    }
  ]
};
